import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/auth.service'
import api from '../lib/axios'
import { queryClient } from '../main'

const AuthContext = createContext(null)

// Simple JWT decode (no verification — just reading payload)
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { localStorage.clear() }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login(email, password)
    const tokens = data.data
    const accessToken  = tokens.accessToken
    const refreshToken = tokens.refreshToken

    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)

    // Read from backend response, fallback to JWT decode if backend isn't restarted yet
    const decoded = decodeJwt(accessToken) || {}
    const role = tokens.role || decoded.role
    const userId = tokens.userId || decoded.sub
    const employeeIdFromToken = tokens.employeeId || decoded.employee_id

    // Fetch user details
    let userInfo = { userId, role, name: email, email, employeeId: employeeIdFromToken || null }
    try {
      if (role === 'admin' || role === 'super_admin') {
        // Admin/Super Admin can fetch from /users/{id}
        const res = await api.get(`/users/${userId}`)
        const u = res.data?.data
        // Fix: retain employeeId from token if available, so admin can own data
        if (u) userInfo = { ...u, userId: u.id, role: u.role || role, employeeId: employeeIdFromToken || null }
      } else {
        // Employee: fetch from /employees/me which returns employee record
        const res = await api.get('/employees/me')
        const emp = res.data?.data
        if (emp) {
          userInfo = {
            userId,
            role,
            name: emp.name || email,
            email: emp.email || email,
            branch: emp.branch,
            department: emp.department,
            employeeId: emp.id || employeeIdFromToken,
          }
        }
      }
    } catch {
      // Use basic decoded info as fallback
    }

    localStorage.setItem('user', JSON.stringify(userInfo))
    setUser(userInfo)
    return userInfo
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    try { if (refreshToken) await authService.logout(refreshToken) } catch {}
    // Clear localStorage tokens + user
    localStorage.clear()
    // CRITICAL: wipe React Query in-memory cache so the next login
    // never sees stale data (e.g. previous user's role in the banner)
    queryClient.clear()
    setUser(null)
  }, [])
  
  const isAdmin = (u) => ['admin', 'super_admin'].includes(u?.role)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

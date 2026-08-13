import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>
  if (!user) return <Navigate to="/login" replace />
  
  // Support both single role string and array of roles
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role]
    // super_admin has all admin privileges
    const userRole = user.role === 'super_admin' ? 'admin' : user.role
    if (!allowedRoles.includes(userRole) && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />
    }
  }
  
  return children
}

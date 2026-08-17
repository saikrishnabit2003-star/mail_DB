import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'

import Login            from './pages/Login'
import AdminDashboard   from './pages/admin/AdminDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import Users            from './pages/admin/Users'
import EmailMaster      from './pages/EmailMaster'
import Profiles         from './pages/Profiles'
import EmailAccounts    from './pages/EmailAccounts'
import Campaigns        from './pages/Campaigns'
import ProfileEmails    from './pages/ProfileEmails'
import Notifications    from './pages/Notifications'
import Settings         from './pages/admin/Settings'
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={['admin', 'super_admin'].includes(user.role) ? '/admin/dashboard' : '/dashboard'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute role={['admin', 'super_admin']}>
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute role="admin">
          <Layout><Users /></Layout>
        </ProtectedRoute>
      } />

      {/* Shared routes (admin + employee) */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><EmployeeDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/email-master" element={
        <ProtectedRoute>
          <Layout><EmailMaster /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/profiles" element={
        <ProtectedRoute>
          <Layout><Profiles /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/email-accounts" element={
        <ProtectedRoute role="admin">
          <Layout><EmailAccounts /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/campaigns" element={
        <ProtectedRoute>
          <Layout><Campaigns /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/profile-emails" element={
        <ProtectedRoute>
          <Layout><ProfileEmails /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          <Layout><Notifications /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute role="super_admin">
          <Layout><Settings /></Layout>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

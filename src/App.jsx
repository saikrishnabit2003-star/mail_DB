import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'

const Login            = React.lazy(() => import('./pages/Login'))
const AdminDashboard   = React.lazy(() => import('./pages/admin/AdminDashboard'))
const EmployeeDashboard = React.lazy(() => import('./pages/EmployeeDashboard'))
const Users            = React.lazy(() => import('./pages/admin/Users'))
const EmailMaster      = React.lazy(() => import('./pages/EmailMaster'))
const Profiles         = React.lazy(() => import('./pages/Profiles'))
const EmailAccounts    = React.lazy(() => import('./pages/EmailAccounts'))
const Campaigns        = React.lazy(() => import('./pages/Campaigns'))
const ProfileEmails    = React.lazy(() => import('./pages/ProfileEmails'))
const Notifications    = React.lazy(() => import('./pages/Notifications'))
const Settings         = React.lazy(() => import('./pages/admin/Settings'))
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={['admin', 'super_admin'].includes(user.role) ? '/admin/dashboard' : '/dashboard'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
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
          <ProtectedRoute role="admin" requireFullAccess>
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
    </Suspense>
  )
}

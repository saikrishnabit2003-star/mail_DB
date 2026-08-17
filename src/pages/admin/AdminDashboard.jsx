import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard.service'
import { useAuth } from '../../context/AuthContext'
import {
  Users, Database, Send, Activity, TrendingUp,
  UserCheck, Mail, Play, ArrowUpRight, ArrowDownRight,
  Clock, AlertCircle, Zap, Copy, MailCheck, Cpu, Users2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { motion } from 'framer-motion' 
import { useNavigate } from 'react-router-dom'
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

// Enhanced Stat Card
const EnhancedStatCard = ({ label, value, icon: Icon, color, subtitle, onDoubleClick }) => {
  const colorMap = {
    blue:   'bg-blue-500/10 border-blue-500/20',
    green:  'bg-emerald-500/10 border-emerald-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
    yellow: 'bg-amber-500/10 border-amber-500/20',
    cyan:   'bg-cyan-500/10 border-cyan-500/20',
    red:    'bg-rose-500/10 border-rose-500/20',
  }
  const iconColorMap = {
    blue:   'text-blue-500 bg-blue-500/15',
    green:  'text-emerald-500 bg-emerald-500/15',
    purple: 'text-purple-500 bg-purple-500/15',
    yellow: 'text-amber-500 bg-amber-500/15',
    cyan:   'text-cyan-500 bg-cyan-500/15',
    red:    'text-rose-500 bg-rose-500/15',
  }
  const textColorMap = {
    blue:   'text-blue-500',
    green:  'text-emerald-500',
    purple: 'text-purple-500',
    yellow: 'text-amber-500',
    cyan:   'text-cyan-500',
    red:    'text-rose-500',
  }

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.03 }}
      className={`rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg bg-card ${colorMap[color]} ${onDoubleClick ? 'cursor-pointer' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconColorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-muted-foreground text-sm font-medium mb-1">{label}</p>
      <p className={`text-4xl font-bold ${textColorMap[color]}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>}
    </motion.div>
  )
}

// Charts removed from original table definition to be inline


export default function AdminDashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isSuperAdmin = user?.role === 'super_admin'
  const nav = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => dashboardService.admin({ preset: 'last_7_days' }),
    refetchInterval: 60000,
  })

  const d = data?.data?.data
  console.log('Admin Dashboard Data:', d)

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-border border-t-primary" />
      <p className="text-muted-foreground font-medium">Loading dashboard...</p>
    </div>
  )

  const rankingData = d?.employeeRanking?.slice(0, 12).map(e => ({
    name: e.employeeName?.split(' ')[0] || 'Unknown',
    uploads: e.uploadedCount,
    sent: e.sentCount,
  })) || []

  const sentComparisonData = d?.employeePerformance?.slice(0, 10).map(e => ({
    name: e.employeeName?.split(' ')[0] || 'Unknown',
    toProfiles: e.totalSentToProfiles,
    sent: e.totalSent,
  })) || []

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Welcome Banner */}
      {(d?.currentUser.role==='admin' || d?.currentUser.role==='super_admin') && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-800 text-white shadow-2xl p-8"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider mb-1">Welcome Back</p>
              <h1 className="text-2xl lg:text-1xl font-bold mb-1 tracking-tight">{d.currentUser.name}</h1>
              {isAdmin && (
                <p className="text-blue-200/80">{d.currentUser.email} · Admin</p>
              )}
              {isSuperAdmin && (
                <p className="text-blue-200/80">{d.currentUser.email} · Super Admin</p>
              )}
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-lg" />
                <div className="relative bg-white/10 border border-white/20 rounded-2xl p-4 backdrop-blur-sm">
                  <Zap className="w-8 h-8 text-white/90" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Admin-specific upload cards */}
      {(isAdmin || isSuperAdmin) && (
        <motion.div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2' : ''} gap-5`} variants={itemVariants}>
          {isAdmin && (
            <div>
              <h2 className="text-lg font-bold mb-2 text-muted-foreground uppercase tracking-wider text-xs">Your Activity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <EnhancedStatCard label="Your Uploads" value={d?.adminOwnUploads} icon={Database} color="purple" subtitle="Files you uploaded" />
                <EnhancedStatCard label="Your Team's Uploads" value={d?.assignedEmployeeUploads} icon={Users2} color="cyan" subtitle="Assigned employees" />
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold mb-2 text-muted-foreground uppercase tracking-wider text-xs">Campaign Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EnhancedStatCard label="Total Campaigns" value={d?.totalCampaigns} icon={Activity} color="green" subtitle="All time" onDoubleClick={() => { nav("/campaigns")  }} />
              <EnhancedStatCard label="Running Campaigns" value={d?.runningCampaigns} icon={Play} color="cyan" subtitle="Active now" />
            </div>
          </div>
          
        </motion.div>
      )}

      {/* Core Metrics */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-bold mb-2 text-muted-foreground uppercase tracking-wider text-xs">Core Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          <EnhancedStatCard label="Total Uploads" value={d?.totalUploads} icon={Database} color="cyan" subtitle="CSV/Excel files" />
          <EnhancedStatCard label="Total Profiles" value={d?.totalProfiles} icon={Mail} color="green" subtitle="All profiles" />
          <EnhancedStatCard label="Active Profiles" value={d?.activeProfiles} icon={UserCheck} color="purple" subtitle="Currently active" />
          <EnhancedStatCard label="Overall Sent" value={d?.overallSent} icon={Send} color="green" subtitle="All time sent" />
          <EnhancedStatCard label="Current Week Sent" value={d?.currentWeekSent} icon={Send} color="cyan" subtitle="Mon - Sat" />
        </div>
      </motion.div>

    </motion.div>
  )
}

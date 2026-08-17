import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard.service'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import { Database, Send, Activity, Play, CheckCircle, XCircle, Clock, Percent, Users, TrendingUp, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

export default function EmployeeDashboard() {
  const { user, loading: authLoading } = useAuth()
  const nav = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['employee-dashboard', user?.role],
    queryFn: () => {
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        return dashboardService.admin({ preset: 'last_7_days' })
      }
      return dashboardService.employee({ preset: 'last_7_days' })
    },
    // don't run until we have the user object AND the role is known
    enabled: !!user && typeof user.role !== 'undefined',
    refetchInterval: 60000,
  })

  const d = data?.data?.data
  console.log("EMPLOYEE DASHBOARD RESPONSE:", d)

  if (authLoading || !user || isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  )

  const profileData = d?.profileStatistics?.map(p => ({
    name: p.profileName?.slice(0, 12),
    pending: p.pendingCount,
    sent: p.sentCount,
    failed: p.failedCount,
  })) || []

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto pb-10"
    >
      {/* Welcome banner */}
      {d?.currentUser.role === 'employee' && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-800 text-white shadow-2xl p-5"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider mb-2">Welcome Back</p>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2 tracking-tight">{d.currentUser.name}</h1>
              <p className="text-blue-200/80">{d.currentUser.email} · Employee Workspace</p>
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

      {/* Global Overview Stats */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h3 className="font-bold text-xs flex items-center gap-2 text-gray-400 tracking-wider uppercase">
          <Activity className="w-3.5 h-3.5" /> Global Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCard label="Uploads" value={d?.totalUploadCount || 0} sub="All files" icon={Database} color="purple" variant="solid" />
          <StatCard label="Profiles" value={d?.activeProfiles || 0} sub="Total profiles" icon={Users} color="blue" variant="outline" />
          
          <StatCard label="Overall Sent" value={d?.overallSent || 0} sub="All time sent" icon={Send} color="green" variant="solid" />
          <StatCard label="Current Week Sent" value={d?.currentWeekSent || 0} sub="Mon - Sat" icon={Send} color="cyan" variant="solid" />
          <StatCard label="Campaigns" value={d?.totalCampaigns || 0} sub="Total created" icon={TrendingUp} color="indigo" variant="solid" onDoubleClick={() => nav("/campaigns")} />
          <StatCard label="Running" value={d?.runningCampaigns || 0} sub="Active campaigns" icon={Play} color="pink" variant="solid" />
        </div>
      </motion.div>

       
      {/* Recent campaigns */}
      <AnimatePresence>
        {d?.recentCampaigns?.length > 0 && (
          <motion.div variants={itemVariants} className="bg-card text-card-foreground rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Recent Campaigns</h3>
            <div className="space-y-2">
              {d.recentCampaigns.slice(0, 5).map(c => (
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  key={c.id} 
                  className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-sm">{c.campaignName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground font-medium">{c.sent}/{c.totalEmails} sent</span>
                    <Badge label={c.status} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

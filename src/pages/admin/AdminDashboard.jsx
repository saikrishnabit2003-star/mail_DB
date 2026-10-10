import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard.service'
import { useAuth } from '../../context/AuthContext'
import {
  Users, Database, Send, Activity, TrendingUp,
  UserCheck, Mail, Play, ArrowUpRight, ArrowDownRight,
  Clock, AlertCircle, Zap, Copy, MailCheck, Cpu, Users2, Cog, CheckCircle2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { motion, animate, useReducedMotion } from 'framer-motion' 
import { useNavigate } from 'react-router-dom'
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 24, rotateX: -15, transformPerspective: 1000 },
  show: {
    opacity: 1, y: 0, rotateX: 0, transformPerspective: 1000,
    transition: { type: 'spring', stiffness: 260, damping: 24, staggerChildren: 0.07, delayChildren: 0.1 }
  }
}

// Number counts up from 0 when the card appears (display only)
const CountUp = ({ value }) => {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (reduce) return
    const controls = animate(0, value, { duration: 1.2, ease: 'easeOut', onUpdate: v => setN(Math.round(v)) })
    return () => controls.stop()
  }, [value, reduce])
  return <>{(reduce ? value : n).toLocaleString()}</>
}

/* ---------- 3D automation pipeline for the banner: Contact -> Automation -> Delivered ---------- */
const CYCLE = 6
const POS = ['13%', '50%', '87%'] // node centres, shared by nodes, track and envelopes

const BannerPipeline = () => {
  const reduce = useReducedMotion()
  const nodes = [
    { key: 'contact', label: 'Contact', sub: 'Lead added', Icon: Users, color: 'from-sky-400 to-blue-500', delay: 0 },
    { key: 'automation', label: 'Automation', sub: 'Sequence runs', Icon: Cog, color: 'from-violet-400 to-indigo-500', delay: 1.5 },
    { key: 'delivered', label: 'Delivered', sub: 'Inbox reached', Icon: CheckCircle2, color: 'from-emerald-400 to-teal-500', delay: 3 },
  ]

  return (
    <div className="w-full max-w-[420px]" style={{ perspective: '1200px' }}>
      <motion.div
        className="relative h-[120px] w-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateX: 14, rotateY: -10 }}
        animate={reduce ? { rotateX: 14, rotateY: -10 } : { rotateX: [14, 10, 14], rotateY: [-10, -3, -10] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* floor plane */}
        <div
          className="absolute inset-x-0 bottom-0 h-12 rounded-2xl border border-white/30 bg-white/10"
          style={{
            transform: 'translateZ(-30px) rotateX(72deg)',
            transformOrigin: 'center bottom',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* track */}
        <div
          className="absolute h-1.5 rounded-full bg-white/30"
          style={{ left: POS[0], right: `calc(100% - ${POS[2]})`, top: '48%', transform: 'translateZ(20px)' }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-200 via-violet-200 to-emerald-200"
            initial={{ width: '0%' }}
            animate={reduce ? { width: '100%' } : { width: ['0%', '100%', '100%', '0%'] }}
            transition={{ duration: CYCLE, repeat: Infinity, ease: 'easeInOut', times: [0, 0.6, 0.9, 1] }}
          />
        </div>

        {/* envelopes */}
        {!reduce &&
          [0, 2, 4].map(d => (
            <motion.div
              key={d}
              className="absolute z-20"
              style={{ top: '48%', transform: 'translateZ(50px)' }}
              initial={{ left: POS[0], opacity: 0 }}
              animate={{ left: POS, opacity: [0, 1, 1], scale: [0.7, 1, 0.8] }}
              transition={{ duration: CYCLE, delay: d, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="-translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-1.5 shadow-lg shadow-blue-900/30">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
            </motion.div>
          ))}

        {/* stage nodes */}
        {nodes.map(({ key, label, sub, Icon, color, delay }, i) => (
          <div
            key={key}
            className="absolute w-20"
            style={{ left: POS[i], top: '48%', transform: 'translate(-50%, -50%) translateZ(40px)', transformStyle: 'preserve-3d' }}
          >
            <motion.div
              animate={reduce ? {} : { y: [0, -6, 0] }}
              transition={{ duration: 3.2, delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative rounded-2xl border border-white/60 bg-white/90 p-2 text-center shadow-xl shadow-blue-900/25"
            >
              {!reduce && (
                <motion.span
                  className="absolute inset-0 rounded-2xl border-2 border-white"
                  animate={{ opacity: [0, 0.9, 0], scale: [1, 1.12, 1.22] }}
                  transition={{ duration: 2, delay, repeat: Infinity, repeatDelay: 4 }}
                />
              )}
              <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${color} shadow-md`}>
                <motion.div
                  animate={reduce || key !== 'automation' ? {} : { rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  <Icon className="h-4 w-4 text-white" />
                </motion.div>
              </div>
              <p className="text-xs font-semibold text-slate-800">{label}</p>
                          </motion.div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// Enhanced Stat Card (light card, gradient icon tile, soft 3D lift on hover)
const EnhancedStatCard = ({ label, value, icon: Icon, color, subtitle, onDoubleClick }) => {
  const reduce = useReducedMotion()

  const iconGradientMap = {
    blue:   'from-blue-400 to-indigo-500 shadow-blue-500/30',
    green:  'from-emerald-400 to-teal-500 shadow-emerald-500/30',
    purple: 'from-violet-400 to-purple-500 shadow-purple-500/30',
    yellow: 'from-amber-400 to-orange-500 shadow-amber-500/30',
    cyan:   'from-sky-400 to-cyan-500 shadow-cyan-500/30',
    red:    'from-rose-400 to-pink-500 shadow-rose-500/30',
  }
  const textColorMap = {
    blue:   'text-blue-600',
    green:  'text-emerald-600',
    purple: 'text-purple-600',
    yellow: 'text-amber-600',
    cyan:   'text-cyan-600',
    red:    'text-rose-600',
  }

  return (
    <motion.div variants={itemVariants}>
      <motion.div
        whileHover={reduce ? undefined : { y: -6, rotateX: 5, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ transformPerspective: 800 }}
        className={`rounded-2xl p-5 bg-white border border-slate-200/80 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-900/15 transition-shadow ${onDoubleClick ? 'cursor-pointer' : ''}`}
        onDoubleClick={onDoubleClick}
      >
        <motion.div
          animate={reduce ? {} : { y: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className={`mb-4 inline-flex rounded-xl bg-gradient-to-br p-3 text-white shadow-lg ${iconGradientMap[color]}`}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
        <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
        <p className={`text-4xl font-bold ${textColorMap[color]}`}>{typeof value === 'number' ? <CountUp value={value} /> : value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
      </motion.div>
    </motion.div>
  )
}

// Charts removed from original table definition to be inline


export default function AdminDashboard() {
  const { user } = useAuth()
  const reduce = useReducedMotion()
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
      className="space-y-3 max-w-7.5xl mx-auto"
    >
      {/* Welcome Banner: bright gradient + 3D automation animation */}
      {(d?.currentUser.role==='admin' || d?.currentUser.role==='super_admin') && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 text-white shadow-2xl shadow-blue-500/30 px-8 py-3"
        >
          {/* soft light orbs */}
          <motion.div
            animate={reduce ? {} : { x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-24 -left-24 w-96 h-96 bg-white/25 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div
            animate={reduce ? {} : { x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-300/30 rounded-full blur-3xl pointer-events-none"
          />
          {/* light grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

          <div className="relative grid items-center gap-6 lg:grid-cols-2">
            <div className="flex items-center gap-4">
              <div className="shrink-0 rounded-2xl bg-white p-3 shadow-xl">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
              <p className="text-white/90 text-sm font-semibold uppercase tracking-wider mb-1">Welcome Back</p>
              <h1 className="text-2xl lg:text-1xl font-bold mb-1 tracking-tight">{d.currentUser.name}</h1>
              {isAdmin && (
                <p className="text-white/80">{d.currentUser.email} · Admin</p>
              )}
              {isSuperAdmin && (
                <p className="text-white/80">{d.currentUser.email} · Super Admin</p>
              )}
              </div>
            </div>
            <div className="hidden lg:flex justify-end">
              <BannerPipeline />
            </div>
          </div>
        </motion.div>
      )}

      {/* Light panel behind the metric cards */}
      <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-sky-50 via-indigo-50/70 to-cyan-50 p-5 space-y-8 shadow-inner">
        {/* Admin-specific upload cards */}
        {(isAdmin || isSuperAdmin) && (
          <motion.div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2' : ''} gap-5`} variants={itemVariants}>
            {isAdmin && (
              <div>
                <h2 className="text-lg font-bold mb-2 text-slate-500 uppercase tracking-wider text-xs">Your Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <EnhancedStatCard label="Your Uploads" value={d?.adminOwnUploads} icon={Database} color="purple" subtitle="Files you uploaded" />
                  <EnhancedStatCard label="Your Team's Uploads" value={d?.assignedEmployeeUploads} icon={Users2} color="cyan" subtitle="Assigned employees" />
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold mb-2 text-slate-500 uppercase tracking-wider text-xs">Campaign Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <EnhancedStatCard label="Total Campaigns" value={d?.totalCampaigns} icon={Activity} color="green" subtitle="All time" onDoubleClick={() => { nav("/campaigns")  }} />
                <EnhancedStatCard label="Running Campaigns" value={d?.runningCampaigns} icon={Play} color="cyan" subtitle="Active now" onDoubleClick={() => { nav("/campaigns") }}/>
              </div>
            </div>
            
          </motion.div>
        )}

        {/* Core Metrics */}
        <motion.div variants={itemVariants}>
          <h2 className="text-lg font-bold mb-2 text-slate-500 uppercase tracking-wider text-xs">Core Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            <EnhancedStatCard label="Total Uploads" value={d?.totalUploads} icon={Database} color="cyan" subtitle="CSV/Excel files" onDoubleClick={() => { nav("/email-master") }} />
            <EnhancedStatCard label="Total Profiles" value={d?.totalProfiles} icon={Mail} color="green" subtitle="Overall Profile Counts" onDoubleClick={() => { nav("/profiles") }}/>
            <EnhancedStatCard label="Active Profiles" value={d?.activeProfiles} icon={UserCheck} color="purple" subtitle="Currently Active Profiles" onDoubleClick={() => { nav("/profiles") }}/>
            <EnhancedStatCard label="Overall Sent" value={d?.overallSent} icon={Send} color="green" subtitle="Total Sended Counts" />
            <EnhancedStatCard label="Current Week Sent" value={d?.currentWeekSent} icon={Send} color="cyan" subtitle="Mon - Sun" />
          </div>
        </motion.div>
      </div>

    </motion.div>
  )
}
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboard.service'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import { Database, Send, Activity, Play, CheckCircle, XCircle, Clock, Percent, Users, TrendingUp, Zap, Mail, Cog, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { motion, AnimatePresence, animate, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
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
    { key: 'contact', label: 'Contact', Icon: Users, color: 'from-sky-400 to-blue-500', delay: 0 },
    { key: 'automation', label: 'Automation', Icon: Cog, color: 'from-violet-400 to-indigo-500', delay: 1.5 },
    { key: 'delivered', label: 'Delivered', Icon: CheckCircle2, color: 'from-emerald-400 to-teal-500', delay: 3 },
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
        {nodes.map(({ key, label, Icon, color, delay }, i) => (
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

// Light stat card with gradient icon tile and soft 3D lift on hover
const LightStatCard = ({ label, value, sub, icon: Icon, color, onDoubleClick }) => {
  const reduce = useReducedMotion()
  const iconGradientMap = {
    blue:   'from-blue-400 to-indigo-500 shadow-blue-500/30',
    green:  'from-emerald-400 to-teal-500 shadow-emerald-500/30',
    purple: 'from-violet-400 to-purple-500 shadow-purple-500/30',
    cyan:   'from-sky-400 to-cyan-500 shadow-cyan-500/30',
    indigo: 'from-indigo-400 to-blue-600 shadow-indigo-500/30',
    pink:   'from-pink-400 to-rose-500 shadow-pink-500/30',
  }
  const textColorMap = {
    blue: 'text-blue-600', green: 'text-emerald-600', purple: 'text-purple-600',
    cyan: 'text-cyan-600', indigo: 'text-indigo-600', pink: 'text-pink-600',
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
        {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
      </motion.div>
    </motion.div>
  )
}

export default function EmployeeDashboard() {
  const { user, loading: authLoading } = useAuth()
  const nav = useNavigate()
  const reduce = useReducedMotion()

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
      className="space-y-8 max-w-7.5xl mx-auto pb-10"
    >
      {/* Welcome banner: bright gradient + 3D automation animation */}
      {d?.currentUser.role === 'employee' && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 text-white shadow-2xl shadow-blue-500/30 px-8 py-4"
        >
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
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

          <div className="relative grid items-center gap-6 lg:grid-cols-2">
            <div className="flex items-center gap-4">
              <div className="shrink-0 rounded-2xl bg-white p-3 shadow-xl">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-white/90 text-sm font-semibold uppercase tracking-wider mb-1">Welcome Back</p>
                <h1 className="text-2xl lg:text-3xl font-bold mb-1 tracking-tight">{d.currentUser.name}</h1>
                <p className="text-white/80">{d.currentUser.email} · Employee Workspace</p>
              </div>
            </div>
            <div className="hidden lg:flex justify-end">
              <BannerPipeline />
            </div>
          </div>
        </motion.div>
      )}

      {/* Light panel behind the cards */}
      <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-sky-50 via-indigo-50/70 to-cyan-50 p-6 space-y-8 shadow-inner">
        {/* Global Overview Stats */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="font-bold text-xs flex items-center gap-2 text-slate-500 tracking-wider uppercase">
            <Activity className="w-3.5 h-3.5" /> Global Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <LightStatCard label="Uploads" value={d?.totalUploadCount || 0} sub="All files" icon={Database} color="purple" />
            <LightStatCard label="Profiles" value={d?.activeProfiles || 0} sub="Total profiles" icon={Users} color="blue" />
            
            <LightStatCard label="Overall Sent" value={d?.overallSent || 0} sub="All time sent" icon={Send} color="green" />
            <LightStatCard label="Current Week Sent" value={d?.currentWeekSent || 0} sub="Mon - Sun" icon={Send} color="cyan" />
            <LightStatCard label="Campaigns" value={d?.totalCampaigns || 0} sub="Total created" icon={TrendingUp} color="indigo" onDoubleClick={() => nav("/campaigns")} />
            <LightStatCard label="Running" value={d?.runningCampaigns || 0} sub="Active campaigns" icon={Play} color="pink" />
          </div>
        </motion.div>

        {/* Recent campaigns */}
        <AnimatePresence>
          {d?.recentCampaigns?.length > 0 && (
            <motion.div variants={itemVariants} className="bg-white text-slate-800 rounded-2xl border border-slate-200/80 p-5 shadow-lg shadow-blue-900/5">
              <h3 className="font-semibold mb-4">Recent Campaigns</h3>
              <div className="space-y-2">
                {d.recentCampaigns.slice(0, 5).map((c, i) => (
                  <motion.div 
                    initial={reduce ? false : { opacity: 0, rotateX: -35, y: -6 }}
                    animate={{ opacity: 1, rotateX: 0, y: 0 }}
                    whileHover={reduce ? undefined : { scale: 1.01, rotateX: 2, z: 10 }}
                    transition={{ duration: 0.35, delay: 0.3 + i * 0.07 }}
                    style={{ transformPerspective: 800, transformOrigin: 'top center' }}
                    key={c.id} 
                    className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-100 cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-sm">{c.campaignName}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500 font-medium">{c.sent}/{c.totalEmails} sent</span>
                      <Badge label={c.status} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
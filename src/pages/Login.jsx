import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Mail, Lock, Zap, Eye, EyeOff, ArrowRight, Users, Cog, CheckCircle2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

const CYCLE = 6 // seconds for one envelope to travel Contact -> Automation -> Delivered

/* ---------- 3D automation pipeline: Contact -> Automation -> Delivered ---------- */
const POS = ['12%', '50%', '88%'] // node centres, shared by nodes, track and envelopes

function Pipeline() {
  const reduce = useReducedMotion()

  const nodes = [
    { key: 'contact', label: 'Contact', sub: 'Lead added', Icon: Users, color: 'from-sky-400 to-blue-500', delay: 0 },
    { key: 'automation', label: 'Automation', sub: 'Sequence runs', Icon: Cog, color: 'from-violet-400 to-indigo-500', delay: 1.5 },
    { key: 'delivered', label: 'Delivered', sub: 'Inbox reached', Icon: CheckCircle2, color: 'from-emerald-400 to-teal-500', delay: 3 },
  ]

  return (
    <div className="w-full max-w-[480px]" style={{ perspective: '1200px' }}>
      <motion.div
        className="relative h-[240px] w-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateX: 14, rotateY: -10 }}
        animate={reduce ? { rotateX: 14, rotateY: -10 } : { rotateX: [14, 10, 14], rotateY: [-10, -3, -10] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* floor: one flat plane under the whole row */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 rounded-2xl border border-white/30 bg-white/10"
          style={{
            transform: 'translateZ(-30px) rotateX(72deg)',
            transformOrigin: 'center bottom',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* track runs exactly from first node centre to last node centre */}
        <div
          className="absolute h-1.5 rounded-full bg-white/30"
          style={{ left: POS[0], right: `calc(100% - ${POS[2]})`, top: '42%', transform: 'translateZ(20px)' }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-300 via-violet-300 to-emerald-300"
            initial={{ width: '0%' }}
            animate={reduce ? { width: '100%' } : { width: ['0%', '100%', '100%', '0%'] }}
            transition={{ duration: CYCLE, repeat: Infinity, ease: 'easeInOut', times: [0, 0.6, 0.9, 1] }}
          />
        </div>

        {/* envelopes travel along the track */}
        {!reduce &&
          [0, 2, 4].map(d => (
            <motion.div
              key={d}
              className="absolute z-20"
              style={{ top: '42%', transform: 'translateZ(50px)' }}
              initial={{ left: POS[0], opacity: 0 }}
              animate={{ left: POS, opacity: [0, 1, 1], scale: [0.7, 1, 0.8] }}
              transition={{ duration: CYCLE, delay: d, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="-translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-1.5 shadow-lg shadow-blue-900/30">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
            </motion.div>
          ))}

        {/* stage nodes (same top as the track so they line up on one row) */}
        {nodes.map(({ key, label, sub, Icon, color, delay }, i) => (
          <div
            key={key}
            className="absolute w-28"
            style={{ left: POS[i], top: '42%', transform: 'translate(-50%, -50%) translateZ(40px)', transformStyle: 'preserve-3d' }}
          >
            <motion.div
              animate={reduce ? {} : { y: [0, -10, 0] }}
              transition={{ duration: 3.2, delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative rounded-2xl border border-white/60 bg-white/90 p-3.5 text-center shadow-xl shadow-blue-900/25"
            >
              {!reduce && (
                <motion.span
                  className="absolute inset-0 rounded-2xl border-2 border-white"
                  animate={{ opacity: [0, 0.9, 0], scale: [1, 1.12, 1.22] }}
                  transition={{ duration: 2, delay, repeat: Infinity, repeatDelay: 4 }}
                />
              )}
              <div className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-md`}>
                <motion.div
                  animate={reduce || key !== 'automation' ? {} : { rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </motion.div>
              </div>
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="text-[11px] text-slate-500">{sub}</p>
            </motion.div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

/* ---------- Login page (logic unchanged) ---------- */
export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.name}!`)
      navigate(['admin', 'super_admin'].includes(user.role) ? '/admin/dashboard' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all'

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 flex items-center justify-center p-4 lg:p-10">
      {/* soft light orbs */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/25 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* light grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_28rem]">
        {/* Left: brand + 3D automation animation (desktop) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="hidden lg:flex flex-col items-start justify-center gap-6 pr-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-xl">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">MailEngine</h1>
          </div>
          <p className="mb-6 max-w-[480px] text-lg leading-relaxed text-white/90">
            Add contacts, let automation run your sequences, and watch every email land in the inbox.
          </p>
          <Pipeline />
        </motion.div>

        {/* Right: login card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md justify-self-center lg:justify-self-end"
        >
          {/* brand for mobile */}
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <div className="rounded-2xl bg-white p-2.5 shadow-xl">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">MailEngine</h1>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/95 p-8 shadow-2xl shadow-blue-900/25 backdrop-blur-xl">
            <h2 className="mb-1 text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="mb-8 text-sm text-slate-500">Sign in to your account to continue</p>

            <form onSubmit={handle} className="space-y-5">
              {/* Email field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Email address</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={`${inputCls} pl-10 pr-4`}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={`${inputCls} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
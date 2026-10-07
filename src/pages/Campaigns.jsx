import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsService } from '../services/campaigns.service'
import { profilesService } from '../services/profiles.service'
import { optionsService } from '../services/options.service'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import SearchableSelect from '../components/ui/SearchableSelect'
import { Play, Pause, Plus, RefreshCw, Trash2, Edit2, Calendar, Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, addMinutes } from 'date-fns'
import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion, animate } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

// Blur-to-sharp slide-in from the left for each campaign card
const itemVariants = {
  hidden: { opacity: 0, x: -48, filter: 'blur(8px)' },
  show: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: 48, filter: 'blur(6px)', transition: { duration: 0.25 } },
}

/* ================= Design helpers (presentation only) ================= */

// Numbers count up from 0 when they appear or change
function CountUp({ value = 0, className = '' }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? Number(value) || 0 : 0)
  useEffect(() => {
    const target = Number(value) || 0
    if (reduce) { setN(target); return }
    const controls = animate(n, target, { duration: 0.9, ease: 'easeOut', onUpdate: v => setN(Math.round(v)) })
    return () => controls.stop()
  }, [value])
  return <span className={className}>{n}</span>
}

const glass = 'rounded-3xl border border-white/60 bg-white/95 shadow-xl shadow-blue-900/10 backdrop-blur-xl'
const pageBtn = 'p-1.5 rounded-lg text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-transparent'

// Accent per campaign status (visual only)
const statusAccent = (status) => {
  switch (status) {
    case 'running': return 'from-emerald-400 to-teal-500'
    case 'paused': return 'from-amber-400 to-orange-500'
    case 'completed': return 'from-sky-400 to-blue-500'
    case 'failed': return 'from-rose-400 to-red-500'
    default: return 'from-violet-400 to-indigo-500'
  }
}

export default function Campaigns() {
  const qc = useQueryClient()
  const { user, isAdmin } = useAuth()
  const isPartialAdmin = user?.role === 'admin' && user?.accessLevel === 'partial'
  const reduce = useReducedMotion()
  const [modal, setModal] = useState(false)
  const [scheduleModal, setScheduleModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingCampaignId, setEditingCampaignId] = useState(null)
  const [editDailyLimit, setEditDailyLimit] = useState()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [form, setForm] = useState({ 
    campaignName: '', 
    profileId: '', 
    dailyLimit: '',
    employeeId: ''
  })
  const [scheduleForm, setScheduleForm] = useState({
    campaignName: '',
    profileId: '',
    scheduledFor: '',
    scheduledTime: '',
    dailyLimit: '',
    employeeId: '',
    maxRetries: 3,
    recurrenceType: 'daily',  // 'once', 'daily', 'weekly'
    recurrenceDays: [],  // [0-6] for Mon-Sun
    recurrenceEndDate: '',  // YYYY-MM-DD
  })
  const [scheduleErrors, setScheduleErrors] = useState({})

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['campaigns', selectedEmployeeId, page, pageSize],
    queryFn: () => campaignsService.list(selectedEmployeeId, page, pageSize),
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
  })
  const { data: profilesData } = useQuery({
    queryKey: ['profiles', selectedEmployeeId],
    queryFn: () => profilesService.list(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
  })
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => optionsService.getEmployees(),
    enabled: isAdmin(user),  // Only admins can see employee list
  })

  const rawData = data?.data?.data
  const campaigns = Array.isArray(rawData) ? rawData : (rawData?.data || [])
  const total = rawData?.total || campaigns.length
  const totalPages = rawData?.totalPages || Math.ceil(total / pageSize) || 1
  const profiles  = profilesData?.data?.data || []
  const employees = (employeesData?.data?.data || []).slice().sort((a, b) => a.name.localeCompare(b.name))
  // Own data = no employee selected (partial admin viewing their own campaigns)
  const isOwnData = !selectedEmployeeId

  const startMut = useMutation({
    mutationFn: (d) => campaignsService.start(d, selectedEmployeeId),
    onSuccess: (res) => {
      if (res?.data?.success === false) {
        return toast.error(res.data.message || 'Failed to start')
      }
      qc.invalidateQueries(['campaigns']); 
      setModal(false); 
      toast.success(res?.data?.message || 'Campaign started!') 
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to start'),
  })
  const pauseMut = useMutation({
    mutationFn: (id) => campaignsService.pause(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); toast.success('Paused') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to pause'),
  })
  const resumeMut = useMutation({
    mutationFn: (id) => campaignsService.resume(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); toast.success('Resumed') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to resume'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => campaignsService.delete(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); toast.success('Campaign deleted') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete'),
  })
  const updateLimitMut = useMutation({
    mutationFn: (data) => campaignsService.updateDailyLimit(data.id, data.limit, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); setEditModal(false); toast.success('Daily limit updated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update'),
  })
  const scheduleMut = useMutation({
    mutationFn: (data) => campaignsService.schedule(data, selectedEmployeeId),
    onSuccess: (res) => { 
      if (res?.data?.success === false) {
        return toast.error(res.data.message || 'Failed to schedule')
      }
      qc.invalidateQueries(['campaigns']); 
      setScheduleModal(false); 
      toast.success(res?.data?.message || 'Campaign scheduled!'); 
      setScheduleForm({ 
        campaignName: '', 
        profileId: '', 
        scheduledFor: '', 
        scheduledTime: '', 
        dailyLimit: '', 
        employeeId: '',
        maxRetries: 3,
        recurrenceType: 'daily',
        recurrenceDays: [],
        recurrenceEndDate: ''
      }) 
      setScheduleErrors({})
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to schedule'),
  })

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const sf = (k) => (e) => setScheduleForm(p => ({ ...p, [k]: e.target.value }))

  const handleStart = () => {
    if (!form.campaignName || !form.profileId) return toast.error('Campaign name and profile required')
    
    startMut.mutate({ 
      campaignName: form.campaignName,
      profileId: form.profileId, 
      dailyLimit: form.dailyLimit ? Number(form.dailyLimit) : undefined 
    })
  }

  const handleSchedule = () => {
    const errs = {}
    if (!scheduleForm.campaignName) errs.campaignName = "Campaign name is required"
    if (!scheduleForm.profileId) errs.profileId = "Profile is required"
    if (!scheduleForm.scheduledTime) errs.scheduledTime = "Time is required"

    if (Object.keys(errs).length > 0) {
      setScheduleErrors(errs)
      return toast.error('Please fill out all required fields')
    }
    setScheduleErrors({})
    
    // Date required only for 'once' recurrence type
    if (scheduleForm.recurrenceType === 'once' && !scheduleForm.scheduledFor) {
      return toast.error('Date is required for one-time campaigns')
    }
    
    // Validate recurrence
    if (scheduleForm.recurrenceType === 'weekly' && scheduleForm.recurrenceDays.length === 0) {
      return toast.error('Select at least one day for weekly recurrence')
    }
    
    // Get browser timezone offset for backend
    const now = new Date()
    const timezoneOffsetMinutes = now.getTimezoneOffset()
    
    console.log(`[DEBUG] Sending to backend - Time: ${scheduleForm.scheduledTime}, Date: ${scheduleForm.scheduledFor || 'none'}, TZ offset: ${timezoneOffsetMinutes} minutes, Recurrence: ${scheduleForm.recurrenceType}`)
    
    scheduleMut.mutate({
      campaignName: scheduleForm.campaignName,
      profileId: scheduleForm.profileId,
      scheduledDateLocal: scheduleForm.recurrenceType === 'once' ? scheduleForm.scheduledFor : null,
      scheduledTimeLocal: scheduleForm.scheduledTime,
      timezoneOffsetMinutes: timezoneOffsetMinutes,
      recurrenceType: scheduleForm.recurrenceType,
      recurrenceDays: scheduleForm.recurrenceDays,
      recurrenceEndDate: scheduleForm.recurrenceEndDate || null,
      dailyLimit: scheduleForm.dailyLimit ? Number(scheduleForm.dailyLimit) : undefined,
      maxRetries: Number(scheduleForm.maxRetries),
    })
  }

  const progress = (c) => c.totalEmails > 0 ? Math.round((c.sent / c.totalEmails) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className="flex items-center justify-between gap-4 flex-wrap sticky top-0 z-30 bg-white/80 backdrop-blur-xl py-4 -mx-6 px-6 border-b border-white/60 shadow-lg shadow-blue-900/5"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-3.5 py-1.5 text-sm font-medium text-blue-700">
            <Send className="h-3.5 w-3.5" /> {total} campaigns
          </span>
          {isAdmin(user) && (
            <div className="min-w-72">
              <SearchableSelect 
                value={selectedEmployeeId || ''} 
                onChange={(val) => setSelectedEmployeeId(val || null)} 
                placeholder="Select Employee..."
                options={[
                  { label: 'ALL', value: '' },
                  ...employees.map(emp => ({ label: `${emp.name} — ${emp.email}`, value: emp.id }))
                ]}
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
            <Button size="sm" onClick={() => { setForm({ campaignName: '', profileId: '', dailyLimit: '', employeeId: '' }); setModal(true) }}>
              <Plus className="w-4 h-4" /> Start Campaign
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
            <Button variant="secondary" size="sm" onClick={() => { 
              setScheduleForm({ 
                campaignName: '', profileId: '', scheduledFor: '', scheduledTime: '', dailyLimit: '', employeeId: '', maxRetries: 3, 
                recurrenceType: 'daily', recurrenceDays: [], recurrenceEndDate: '' 
              }); 
              setScheduleErrors({});
              setScheduleModal(true) 
            }}>
              <Calendar className="w-4 h-4" /> Schedule Campaign
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600" /></div>
      ) : !campaigns.length ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${glass} p-12 text-center text-slate-500`}
        >
          <div className="relative mx-auto mb-4 h-14 w-14">
            {!reduce && <span className="absolute inset-0 animate-ping rounded-2xl bg-blue-400/40" />}
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-xl shadow-blue-500/30">
              <Send className="h-6 w-6 text-white" />
            </div>
          </div>
          No campaigns yet
        </motion.div>
      ) : (
        <div className="overflow-y-auto pr-2 custom-scrollbar pb-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
          {campaigns.map(c => {
            const pct = progress(c)
            return (
              <motion.div variants={itemVariants} key={c.id} whileHover={reduce ? {} : { y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
                <div className={`${glass} p-5 hover:shadow-2xl hover:shadow-blue-900/15 transition-shadow relative overflow-hidden group`}>
                  {/* light sweep on hover */}
                  <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-all duration-1000 group-hover:translate-x-[520%] group-hover:opacity-100" />
                  {/* status accent strip */}
                  <div className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${statusAccent(c.status)}`} />
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-indigo-400/20 transition-colors" />
                  <div className="relative z-10 flex items-start justify-between mb-4 pl-2">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-lg text-slate-900">
                        {c.status === 'running' && (
                          <span className="relative flex h-2.5 w-2.5">
                            {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          </span>
                        )}
                        {c.campaignName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Profile: {c.profileSnapshot?.profileName || '—'}
                        {c.dailyLimit && <> · {c.dailyLimit}/day</>}
                      </p>
                      {c.scheduledFor && (
                        <p className="text-xs text-blue-600 mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Scheduled for {c.scheduledForDisplay || c.scheduledFor.substring(0, 16).replace('T', ' ')}
                        </p>
                      )}
                      {c.errorMessage && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {c.errorMessage.substring(0, 80)}...
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge label={c.status} />
                      {c.retryCount > 0 && (
                        <Badge label={`Retry ${c.retryCount}/${c.maxRetries}`} variant="warning" />
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4 relative z-10 pl-2">
                    <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium">
                      <span>{c.sent} sent</span>
                      <span className="text-blue-600 font-semibold"><CountUp value={pct} />%</span>
                      <span>{c.totalEmails} total</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="relative h-2.5 rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-emerald-400 shadow-md shadow-blue-500/30 overflow-hidden"
                      >
                        {c.status === 'running' && !reduce && (
                          <motion.span
                            className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.9)]"
                            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.2, 0.9] }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                      </motion.div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3 mb-5 relative z-10 pl-2">
                    {[
                      { label: 'Pending',  value: c.pending,  color: 'text-amber-600', bg: 'from-amber-50 to-yellow-50 border-amber-100' },
                      { label: 'Sent',     value: c.sent,     color: 'text-emerald-600', bg: 'from-emerald-50 to-green-50 border-emerald-100' },
                      { label: 'Failed',   value: c.failed,   color: 'text-rose-600', bg: 'from-rose-50 to-red-50 border-rose-100' },
                      { label: 'Skipped',  value: c.skipped,  color: 'text-slate-500', bg: 'from-slate-50 to-gray-50 border-slate-200' },
                    ].map(s => (
                      <motion.div
                        key={s.label}
                        whileHover={reduce ? {} : { scale: 1.08 }}
                        whileTap={reduce ? {} : { scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                        className={`bg-gradient-to-br ${s.bg} rounded-2xl p-3 text-center border shadow-sm hover:shadow-lg hover:shadow-blue-900/10`}
                      >
                        <p className={`text-lg font-bold ${s.color}`}><CountUp value={s.value ?? 0} /></p>
                        <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100 flex-wrap relative z-10 pl-2">
                    {c.status === 'running' && (
                      <Button variant="secondary" size="sm" onClick={() => pauseMut.mutate(c.id)} loading={pauseMut.isPending}>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </Button>
                    )}
                    {c.status === 'paused' && (
                      <Button size="sm" onClick={() => resumeMut.mutate(c.id)} loading={resumeMut.isPending}>
                        <Play className="w-3.5 h-3.5" /> Resume
                      </Button>
                    )}
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => { setEditingCampaignId(c.id); setEditDailyLimit(c.dailyLimit); setEditModal(true) }}
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Limit
                    </Button>
                    {c.status !== 'running' && (
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => setDeleteTarget(c)} 
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    )}
                    <span className="text-xs text-slate-500 ml-auto font-medium">
                      Started: {c.startedAt ? format(new Date(c.startedAt), 'MMM d, HH:mm') : '—'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
          </motion.div>
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && total > 0 && (
        <div className={`${glass} p-4 flex items-center justify-between text-sm text-slate-500`}>
          <div>
            Showing <span className="font-medium text-slate-900">{total > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-slate-900">{total}</span> campaigns
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="border border-slate-200 rounded-lg py-1 px-2 bg-slate-50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={pageBtn}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={pageBtn}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Campaign Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Start New Campaign">
        <div className="space-y-4">
          <Input label="Campaign Name" value={form.campaignName} onChange={f('campaignName')} placeholder="e.g. July USA Tech CEOs" />
          {isAdmin(user) && (
            <SearchableSelect label="Employee" value={form.employeeId || ''} onChange={(val) => setForm(p => ({ ...p, employeeId: val }))} placeholder="Select an employee..." options={employees.map(emp => ({ label: `${emp.name} — ${emp.email}`, value: emp.id }))} />
          )}
          <SearchableSelect label="Profile" value={form.profileId} onChange={(val) => setForm(p => ({ ...p, profileId: val }))} disabled={isAdmin(user) && !form.employeeId} placeholder={isAdmin(user) && !form.employeeId ? 'Select an employee first...' : 'Select a profile...'} options={profiles.filter(p => !isAdmin(user) || p.employeeId === form.employeeId).map(p => ({ label: `${p.profileName} — ${p.gmailAccount}`, value: p.id }))} />
          <Input label="Daily Limit (optional)" type="number" value={form.dailyLimit} onChange={f('dailyLimit')} placeholder="Leave empty to use profile default" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleStart} loading={startMut.isPending}>
              <Play className="w-4 h-4" /> Start Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Daily Limit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Daily Limit">
        <div className="space-y-4">
          <Input 
            label="Daily Limit" 
            type="number" 
            value={editDailyLimit ?? ''} 
            onChange={e => setEditDailyLimit(e.target.value === '' ? '' : Number(e.target.value))}
            min="1"
            max="10000"
          />
          <p className="text-xs text-slate-400">Change the number of emails to send per day. Campaign will pause automatically when limit is reached.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={() => updateLimitMut.mutate({ id: editingCampaignId, limit: editDailyLimit })} loading={updateLimitMut.isPending}>
              <Edit2 className="w-4 h-4" /> Update Limit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Campaign Modal */}
      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title="Schedule Campaign for Later">
        <div className="space-y-4">
          <Input 
            label="Campaign Name" 
            value={scheduleForm.campaignName} 
            onChange={sf('campaignName')} 
            placeholder="e.g. Future Campaign"
            error={scheduleErrors.campaignName}
            required
          />
          {isAdmin(user) && (
            <SearchableSelect label="Employee" value={scheduleForm.employeeId || ''} onChange={(val) => setScheduleForm(p => ({ ...p, employeeId: val }))} placeholder="Select an employee..." options={employees.map(emp => ({ label: `${emp.name} — ${emp.email}`, value: emp.id }))} />
          )}
          <SearchableSelect 
            label="Profile" 
            value={scheduleForm.profileId} 
            onChange={(val) => setScheduleForm(p => ({ ...p, profileId: val }))} 
            disabled={isAdmin(user) && !scheduleForm.employeeId} 
            error={scheduleErrors.profileId}
            required
            placeholder={isAdmin(user) && !scheduleForm.employeeId ? 'Select an employee first...' : 'Select a profile...'}
            options={profiles.filter(p => !isAdmin(user) || p.employeeId === scheduleForm.employeeId).map(p => ({ label: `${p.profileName} — ${p.gmailAccount}`, value: p.id }))}
          />
          
          <div className="grid grid-cols-2 gap-3">
            {scheduleForm.recurrenceType === 'once' && (
              <Input 
                label="Date" 
                type="date" 
                value={scheduleForm.scheduledFor} 
                onChange={sf('scheduledFor')}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            )}
            <Input 
              label="Time (Your Local Time)" 
              placeholder="09:00 AM"
              type="time" 
              value={scheduleForm.scheduledTime} 
              onChange={sf('scheduledTime')}
              className={scheduleForm.recurrenceType === 'once' ? '' : 'col-span-2'}
              error={scheduleErrors.scheduledTime}
              required
            />
          </div>

          <Input 
            label="Daily Limit (optional)" 
            type="number" 
            value={scheduleForm.dailyLimit} 
            onChange={sf('dailyLimit')} 
            placeholder="Leave empty to use profile default"
            min="1"
            max="10000"
          />

          <SearchableSelect label="Max Retries on Failure" value={scheduleForm.maxRetries} onChange={(val) => setScheduleForm(p => ({ ...p, maxRetries: val }))} options={[{label: 'No retries', value: '0'}, {label: '1 retry', value: '1'}, {label: '3 retries', value: '3'}, {label: '5 retries', value: '5'}, {label: '10 retries', value: '10'}]} />

          {/* Recurrence Options */}
          <SearchableSelect label="Repeat" value={scheduleForm.recurrenceType} onChange={(val) => setScheduleForm(p => ({ ...p, recurrenceType: val }))} options={[{label: 'Once', value: 'once'}, {label: 'Daily', value: 'daily'}, {label: 'Weekly', value: 'weekly'}]} />

          {scheduleForm.recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Select Days</label>
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <motion.button
                    key={idx}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      const days = scheduleForm.recurrenceDays || []
                      if (days.includes(idx)) {
                        setScheduleForm(p => ({ ...p, recurrenceDays: days.filter(d => d !== idx) }))
                      } else {
                        setScheduleForm(p => ({ ...p, recurrenceDays: [...days, idx] }))
                      }
                    }}
                    className={`w-full py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                      (scheduleForm.recurrenceDays || []).includes(idx)
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {scheduleForm.recurrenceType !== 'once' && (
            <Input 
              label="Stop Recurring (optional)" 
              type="date" 
              value={scheduleForm.recurrenceEndDate} 
              onChange={sf('recurrenceEndDate')}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          )}

          <p className="text-xs text-slate-400">
            {scheduleForm.recurrenceType === 'once' && 'Campaign will run once on the scheduled date and time.'}
            {scheduleForm.recurrenceType === 'daily' && 'Campaign will run every day at the scheduled time.'}
            {scheduleForm.recurrenceType === 'weekly' && 'Campaign will run on selected days at the scheduled time.'}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setScheduleModal(false)}>Cancel</Button>
            <Button onClick={handleSchedule} loading={scheduleMut.isPending}>
              <Clock className="w-4 h-4" /> Schedule Campaign
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete the campaign <strong>{deleteTarget?.campaignName}</strong>?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => { deleteMut.mutate(deleteTarget?.id); setDeleteTarget(null); }} loading={deleteMut.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
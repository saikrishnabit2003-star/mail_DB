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
import Select from '../components/ui/Select'
import { Play, Pause, Plus, RefreshCw, Trash2, Edit2, Calendar, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, addMinutes } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

export default function Campaigns() {
  const qc = useQueryClient()
  const { user, isAdmin } = useAuth()
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

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', selectedEmployeeId],
    queryFn: () => campaignsService.list(selectedEmployeeId),
    refetchInterval: 15000,
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

  const rawCampaigns = data?.data?.data
  const campaigns = rawCampaigns?.data ?? (Array.isArray(rawCampaigns) ? rawCampaigns : [])
  const profiles  = profilesData?.data?.data || []
  const employees = employeesData?.data?.data || []

  const startMut = useMutation({
    mutationFn: (d) => campaignsService.start(d, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); setModal(false); toast.success('Campaign started!') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to start'),
  })
  const pauseMut = useMutation({
    mutationFn: (id) => campaignsService.pause(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); toast.success('Paused') },
  })
  const resumeMut = useMutation({
    mutationFn: (id) => campaignsService.resume(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['campaigns']); toast.success('Resumed') },
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
    onSuccess: () => { 
      qc.invalidateQueries(['campaigns']); 
      setScheduleModal(false); 
      toast.success('Campaign scheduled!'); 
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
    if (!scheduleForm.campaignName || !scheduleForm.profileId) return toast.error('Campaign name and profile required')
    
    // Always require time
    if (!scheduleForm.scheduledTime) return toast.error('Time is required')
    
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
      <div className="flex items-center justify-between gap-4 flex-wrap sticky top-0 z-30 bg-white dark:bg-gray-900 py-4 -mx-6 px-6 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-sm text-gray-500">{campaigns.length} campaigns</p>
          {isAdmin(user) && (
            <Select 
              value={selectedEmployeeId || ''} 
              onChange={e => setSelectedEmployeeId(e.target.value || null)}
              className="w-48"
            >
              <option value="">All User's</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} — {emp.email}</option>
              ))}
            </Select>
          )}
        </div>
        <div className="flex gap-2">
          
          <Button size="sm" onClick={() => { setForm({ campaignName: '', profileId: '', dailyLimit: '', employeeId: '' }); setModal(true) }}>
            <Plus className="w-4 h-4" /> Start Campaign
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { 
            setScheduleForm({ 
              campaignName: '', profileId: '', scheduledFor: '', scheduledTime: '', dailyLimit: '', employeeId: '', maxRetries: 3, 
              recurrenceType: 'daily', recurrenceDays: [], recurrenceEndDate: '' 
            }); 
            setScheduleModal(true) 
          }}>
            <Calendar className="w-4 h-4" /> Schedule Campaign
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : !campaigns.length ? (
        <div className="bg-card text-muted-foreground rounded-2xl border border-border p-12 text-center">No campaigns yet</div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {campaigns.map(c => {
            const pct = progress(c)
            return (
              <motion.div variants={itemVariants} key={c.id} className="bg-card text-card-foreground rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/10 transition-colors" />
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{c.campaignName}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
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
                <div className="mb-4 relative z-10">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2 font-medium">
                    <span>{c.sent} sent</span>
                    <span className="text-primary">{pct}%</span>
                    <span>{c.totalEmails} total</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="bg-primary h-2 rounded-full"
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3 mb-5 relative z-10">
                  {[
                    { label: 'Pending',  value: c.pending,  color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Sent',     value: c.sent,     color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Failed',   value: c.failed,   color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-500/10' },
                    { label: 'Skipped',  value: c.skipped,  color: 'text-muted-foreground', bg: 'bg-muted/50' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-transparent hover:border-border transition-colors`}>
                      <p className={`text-lg font-bold ${s.color}`}>{s.value ?? 0}</p>
                      <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-border/50 flex-wrap relative z-10">
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
                  <span className="text-xs text-muted-foreground ml-auto font-medium">
                    Started: {c.startedAt ? format(new Date(c.startedAt), 'MMM d, HH:mm') : '—'}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Start Campaign Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Start New Campaign">
        <div className="space-y-4">
          <Input label="Campaign Name" value={form.campaignName} onChange={f('campaignName')} placeholder="e.g. July USA Tech CEOs" />
          {isAdmin(user) && (
            <Select label="Employee" value={form.employeeId || ''} onChange={f('employeeId')}>
              <option value="">Select an employee...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.email}</option>)}
            </Select>
          )}
          <Select label="Profile" value={form.profileId} onChange={f('profileId')} disabled={isAdmin(user) && !form.employeeId}>
            {isAdmin(user) && !form.employeeId ? (
              <option value="">Select an employee first...</option>
            ) : (
              <>
                <option value="">Select a profile...</option>
                {profiles
                  .filter(p => !isAdmin(user) || p.employeeId === form.employeeId)
                  .map(p => <option key={p.id} value={p.id}>{p.profileName} — {p.gmailAccount}</option>)}
              </>
            )}
          </Select>
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
          <p className="text-xs text-gray-400">Change the number of emails to send per day. Campaign will pause automatically when limit is reached.</p>
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
          />
          {isAdmin(user) && (
            <Select label="Employee" value={scheduleForm.employeeId || ''} onChange={sf('employeeId')}>
              <option value="">Select an employee...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.email}</option>)}
            </Select>
          )}
          <Select label="Profile" value={scheduleForm.profileId} onChange={sf('profileId')} disabled={isAdmin(user) && !scheduleForm.employeeId}>
            {isAdmin(user) && !scheduleForm.employeeId ? (
              <option value="">Select an employee first...</option>
            ) : (
              <>
                <option value="">Select a profile...</option>
                {profiles
                  .filter(p => !isAdmin(user) || p.employeeId === scheduleForm.employeeId)
                  .map(p => <option key={p.id} value={p.id}>{p.profileName} — {p.gmailAccount}</option>)}
              </>
            )}
          </Select>
          
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

          <Select label="Max Retries on Failure" value={scheduleForm.maxRetries} onChange={sf('maxRetries')}>
            <option value="0">No retries</option>
            <option value="1">1 retry</option>
            <option value="3">3 retries</option>
            <option value="5">5 retries</option>
            <option value="10">10 retries</option>
          </Select>

          {/* Recurrence Options */}
          <Select label="Repeat" value={scheduleForm.recurrenceType} onChange={sf('recurrenceType')}>
            <option value="once">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </Select>

          {scheduleForm.recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Days</label>
              <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const days = scheduleForm.recurrenceDays || []
                      if (days.includes(idx)) {
                        setScheduleForm(p => ({ ...p, recurrenceDays: days.filter(d => d !== idx) }))
                      } else {
                        setScheduleForm(p => ({ ...p, recurrenceDays: [...days, idx] }))
                      }
                    }}
                    className={`w-full py-2 px-1 rounded text-xs font-semibold transition-colors ${
                      (scheduleForm.recurrenceDays || []).includes(idx)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
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

          <p className="text-xs text-gray-400">
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

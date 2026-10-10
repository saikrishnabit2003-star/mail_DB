import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emailAccountsService } from '../services/emailAccounts.service'
import { profilesService } from '../services/profiles.service'
import { optionsService } from '../services/options.service'
import { useAuth } from '../context/AuthContext'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import SearchableSelect from '../components/ui/SearchableSelect'
import { Plus, Pencil, Trash2, Wifi, CheckCircle, AlertCircle, Mail, PowerOff, Server } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { motion, animate, useReducedMotion } from 'framer-motion'

const blank = { email: '', accountType: 'gmail_smtp', displayName: '', smtpHost: 'smtp.gmail.com', smtpPort: 587, useTls: true, appPassword: '' }

// ---- visual-only helpers ----
const gridVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 24, rotateX: -15, transformPerspective: 1000 },
  show: { opacity: 1, y: 0, rotateX: 0, transformPerspective: 1000, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

// number counts up from 0
const CountUp = ({ value }) => {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (reduce) return
    const c = animate(0, value, { duration: 1, ease: 'easeOut', onUpdate: v => setN(Math.round(v)) })
    return () => c.stop()
  }, [value, reduce])
  return <>{reduce ? value : n}</>
}

// light stat card: gradient icon tile + count-up + 3D hover
const StatCard = ({ label, value, sub, icon: Icon, gradient, text }) => {
  const reduce = useReducedMotion()
  return (
    <motion.div variants={cardVariants}>
      <motion.div
        whileHover={reduce ? undefined : { y: -6, rotateX: 5, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ transformPerspective: 800 }}
        className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-5 shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-900/15 transition-shadow"
      >
        <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${gradient} opacity-10`} />
        <motion.div
          animate={reduce ? {} : { y: [0, -3, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className={`mb-3 inline-flex rounded-xl bg-gradient-to-br p-3 text-white shadow-lg ${gradient}`}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={`text-3xl font-bold ${text}`}><CountUp value={value} /></p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </motion.div>
    </motion.div>
  )
}

export default function EmailAccounts() {
  const { user, isAdmin } = useAuth()
  const reduce = useReducedMotion()
  const isPartialAdmin = user?.role === 'admin' && user?.accessLevel === 'partial'
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(blank)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [smtpTestResult, setSmtpTestResult] = useState(null) // null, 'testing', 'success', 'error'
  const [smtpTestMessage, setSmtpTestMessage] = useState('')
  const [autoFillProfileId, setAutoFillProfileId] = useState('')

  // ---- 3D animation helpers (visual only) ----
  // table flips in when the page opens
  const flip = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : {
        initial: { opacity: 0, rotateX: -12, y: 20 },
        animate: { opacity: 1, rotateX: 0, y: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        style: { transformPerspective: 1000, transformOrigin: 'top center' },
      }
  // row action icons turn in 3D on hover
  const actionHover = reduce ? undefined : { scale: 1.2, rotateY: 25, rotateX: -10 }

  // Fetch employees list for admin dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => optionsService.getEmployees(),
    enabled: isAdmin(user),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['email-accounts', selectedEmployeeId],
    queryFn: () => emailAccountsService.list(selectedEmployeeId)
  })
  const accounts = data?.data?.data || []
  const employees = (employeesData?.data?.data || []).slice().sort((a, b) => a.name.localeCompare(b.name))
  // Own data = no employee filter selected
  const isOwnData = !selectedEmployeeId
  const activeCount = accounts.filter(a => a.isActive).length
  const gmailCount = accounts.filter(a => a.accountType === 'gmail_smtp').length
  const zohoCount = accounts.filter(a => a.accountType === 'smtp').length

  const activeEmployeeIdForAccounts = isAdmin(user)
    ? (form.employeeId || selectedEmployeeId)
    : user?.employeeId

  const { data: profilesData } = useQuery({
    queryKey: ['profiles-for-account', activeEmployeeIdForAccounts],
    queryFn: () => profilesService.list(activeEmployeeIdForAccounts || undefined),
    enabled: !!activeEmployeeIdForAccounts || !isAdmin(user),
  })
  const availableProfiles = profilesData?.data?.data || []

  const createMut = useMutation({
    mutationFn: (d) => emailAccountsService.create(d, selectedEmployeeId),
    onSuccess: () => { 
      qc.invalidateQueries(['email-accounts'])
      qc.invalidateQueries(['email-accounts-for-profile'])
      setModal(null)
      toast.success('Account added') 
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => emailAccountsService.delete(id, selectedEmployeeId),
    onSuccess: () => { 
      qc.invalidateQueries(['email-accounts'])
      qc.invalidateQueries(['email-accounts-for-profile'])
      toast.success('Deleted') 
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const testMut = useMutation({
    mutationFn: (id) => emailAccountsService.test(id, selectedEmployeeId),
    onSuccess: () => toast.success('Connection successful!'),
    onError: (e) => toast.error(e.response?.data?.message || 'Connection failed'),
  })

  const testSmtpBeforeSave = async () => {
    setSmtpTestResult('testing')
    setSmtpTestMessage('Testing SMTP connection...')
    
    try {
      // For new accounts, we need to validate without an ID
      // We'll do a simple validation that SMTP host and port are reasonable
      if (!form.smtpHost || form.smtpHost.length < 5) {
        setSmtpTestResult('error')
        setSmtpTestMessage('Invalid SMTP host')
        return false
      }
      if (!form.smtpPort || form.smtpPort < 1 || form.smtpPort > 65535) {
        setSmtpTestResult('error')
        setSmtpTestMessage('Invalid SMTP port (1-65535)')
        return false
      }
      if (!form.email) {
        setSmtpTestResult('error')
        setSmtpTestMessage('Email address is required')
        return false
      }
      
      // For new accounts, test the credentials from the form
      if (modal === 'create') {
        if (!form.appPassword) {
          setSmtpTestResult('error')
          setSmtpTestMessage('App Password is required')
          return false
        }
        const response = await emailAccountsService.testCredentials({
          email: form.email,
          accountType: form.accountType,
          displayName: form.displayName,
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort,
          useTls: form.useTls,
          appPassword: form.appPassword,
        })
        if (response.data?.success) {
          setSmtpTestResult('success')
          setSmtpTestMessage('SMTP connection successful!')
          return true
        } else {
          setSmtpTestResult('error')
          setSmtpTestMessage(response.data?.message || 'Connection failed')
          return false
        }
      } else {
        // For existing accounts in edit mode, test with updated credentials
        const response = await emailAccountsService.testCredentials({
          email: form.email,
          accountType: form.accountType,
          displayName: form.displayName,
          smtpHost: form.smtpHost,
          smtpPort: form.smtpPort,
          useTls: form.useTls,
          appPassword: form.appPassword || 'dummy-password', // Use dummy if not changed
        })
        if (response.data?.success) {
          setSmtpTestResult('success')
          setSmtpTestMessage('SMTP connection successful!')
          return true
        } else {
          setSmtpTestResult('error')
          setSmtpTestMessage(response.data?.message || 'Connection failed')
          return false
        }
      }
    } catch (error) {
      setSmtpTestResult('error')
      setSmtpTestMessage(error.response?.data?.message || error.message || 'Connection failed')
      return false
    }
  }

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => {
      const { employeeId, ...rest } = d
      return emailAccountsService.update(id, { ...rest, employeeId: employeeId || undefined })
    },
    onSuccess: () => { 
      qc.invalidateQueries(['email-accounts'])
      qc.invalidateQueries(['email-accounts-for-profile'])
      setModal(null)
      toast.success('Account updated') 
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update account'),
  })

  const handleSave = async () => {
    if (isAdmin(user) && modal === 'create' && !form.employeeId && !selectedEmployeeId) {
      return toast.error('Please select an employee for this account')
    }
    
    if (modal === 'create') {
      createMut.mutate({ ...form, employeeId: form.employeeId || selectedEmployeeId })
    } else {
      updateMut.mutate({ id: selected.id, d: form })
    }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const columns = [
    {
      key: 'actions', label: 'Action',
      render: (_, row) => (
        (!isPartialAdmin || isOwnData) ? (
          <div className="flex items-center gap-1" style={{ perspective: 300 }}>
            <motion.button whileHover={actionHover} onClick={() => { setSelected(row); setForm({ email: row.email, accountType: row.accountType, displayName: row.displayName, smtpHost: row.smtpHost, smtpPort: row.smtpPort, useTls: row.useTls, isActive: row.isActive }); setModal('edit') }} className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"><Pencil className="w-3 h-3" /></motion.button>
            <motion.button whileHover={actionHover} onClick={() => { setDeleteTarget(row); setModal('delete'); }} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></motion.button>
          </div>
        ) : null
      )
    },
    { key: 'sno', label: 'S.No', render: (_, __, i) => <span className="text-gray-400 font-medium">{(i + 1).toString().padStart(2, '0')}</span> },
    { key: 'displayName', label: 'Name', render: v => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold uppercase text-white shadow-md">
          {v?.[0] || 'A'}
        </div>
        <span className="font-medium text-gray-800">{v}</span>
      </div>
    ) },
    { key: 'email', label: 'Email', render: v => <span className="font-medium text-center text-gray-800">{v}</span> },
    { key: 'accountType', label: 'Type', render: v => <Badge label={v} /> },
    { key: 'smtpHost', label: 'SMTP Host', render: v => <span className="text-gray-500">{v}</span> },
    { key: 'smtpPort', label: 'Port', render: v => <span className="text-gray-500">{v}</span> },
    { key: 'isActive', label: 'Status', render: v => <Badge label={v ? 'active' : 'inactive'} variant={v ? 'success' : 'default'} /> },
    { key: 'lastUsedAt', label: 'Last Used', render: v => v ? <span className="text-gray-500">{format(new Date(v), 'MMM d, yyyy')}</span> : <span className="text-gray-300">—</span> },
    
  ]

  return (
    <div className="relative space-y-5 rounded-3xl border border-white/60 bg-gradient-to-br from-sky-100 via-indigo-100/70 to-cyan-100 p-5 shadow-inner">
      {/* soft light orbs */}
      <motion.div animate={reduce ? {} : { x: [0, -20, 0], y: [0, 15, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} className="pointer-events-none absolute right-10 top-4 h-64 w-64 rounded-full bg-white/50 blur-3xl" />
      <motion.div animate={reduce ? {} : { x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} className="pointer-events-none absolute bottom-6 left-10 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-sm text-gray-500">{accounts.length} accounts</p>
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
        {(!isPartialAdmin || isOwnData) && (
          <motion.div whileHover={reduce ? undefined : { y: -3, rotateX: 8, scale: 1.04 }} style={{ transformPerspective: 600 }}>
            <Button size="sm" onClick={() => { setForm(blank); setModal('create') }}>
              <Plus className="w-4 h-4" /> Add Account
            </Button>
          </motion.div>
        )}
      </div>

      {/* Summary cards */}
      <motion.div variants={gridVariants} initial="hidden" animate="show" className="relative grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Accounts" value={accounts.length} sub="Connected mailboxes" icon={Mail} gradient="from-blue-400 to-indigo-500" text="text-blue-600" />
        <StatCard label="Active" value={activeCount} sub="Ready to send" icon={CheckCircle} gradient="from-emerald-400 to-teal-500" text="text-emerald-600" />
        <StatCard label="Inactive" value={accounts.length - activeCount} sub="Turned off" icon={PowerOff} gradient="from-rose-400 to-pink-500" text="text-rose-600" />
        <StatCard label="Gmail SMTP" value={gmailCount} sub={`Zoho SMTP: ${zohoCount}`} icon={Server} gradient="from-violet-400 to-purple-500" text="text-purple-600" />
      </motion.div>

      <motion.div {...flip} className="relative">
        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Wifi className="w-3.5 h-3.5" /> Connected Accounts
        </h3>
        <Table columns={columns} data={accounts} loading={isLoading} emptyMsg="No email accounts yet" />
      </motion.div>

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => { setModal(null); setSmtpTestResult(null); setAutoFillProfileId(''); }} title={modal === 'create' ? 'Add Email Account' : 'Edit Account'} size="md">
        <div className="space-y-4">
          {isAdmin(user) && modal !== 'edit' && (
            <SearchableSelect
              label="Employee"
              value={form.employeeId || ''}
              onChange={(val) => setForm(p => ({ ...p, employeeId: val }))}
              placeholder="Select Employee..."
              options={employees.map(emp => ({ label: `${emp.name} — ${emp.email}`, value: emp.id }))}
            />
          )}
          
          {(isAdmin(user) ? !!activeEmployeeIdForAccounts : true) && modal !== 'edit' && (
            <SearchableSelect
              label="Profile (Auto-fill Email)"
              value={autoFillProfileId}
              onChange={(val) => {
                setAutoFillProfileId(val);
                const selectedProf = availableProfiles.find(p => p.id === val);
                if (selectedProf && selectedProf.gmailAccount) {
                  setForm(prev => ({ ...prev, email: selectedProf.gmailAccount }));
                }
              }}
              placeholder="Select Profile..."
              options={availableProfiles.map(p => ({ label: `${p.profileName} ${p.gmailAccount ? `— ${p.gmailAccount}` : ''}`, value: p.id }))}
            />
          )}
          <Input label="Display Name" value={form.displayName || ''} onChange={f('displayName')} placeholder="Marketing Team" />
          <Input 
            label="Email Address" 
            type="email" 
            value={form.email || ''} 
            onChange={f('email')}
            placeholder="you@gmail.com" 
            autoComplete="new-password"
          />
          <div className="space-y-1">
            <Input 
              label={modal === 'create' ? 'App Password' : 'App Password (leave blank to keep current)'}
              type="password" 
              value={form.appPassword || ''} 
              onChange={f('appPassword')} 
              placeholder={modal === 'create' ? 'Gmail app password' : 'Enter new password if changing'} 
              autoComplete="new-password"
            />
            {form.accountType === 'smtp' ? (
              <p className="text-xs text-gray-500">
                Click <a href="https://mail.zoho.in/zm/#mail/folder/inbox" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">this link</a> → Open My Account → First enable 2-Step Verification (MFA) → Open Security → App Passwords → Click Generate New Password → Enter an app name → Click Generate → Copy the generated 12-character App Password and paste it here.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Click <a href="https://accounts.google.com/signin/v2/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">this link</a> → Open your Google Account settings → First enable 2-Step Verification (MFA) → Search for "App Passwords" → Enter your account password when prompted → Generate an App Password → Copy the generated password → Paste it here.
              </p>
            )}
          </div>
          <SearchableSelect label="Account Type" value={form.accountType || 'gmail_smtp'} onChange={(val) => {
            setForm(prev => {
              if (val === 'gmail_smtp') {
                return { ...prev, accountType: val, smtpHost: 'smtp.gmail.com', smtpPort: 587 };
              } else if (val === 'smtp') {
                return { ...prev, accountType: val, smtpHost: 'smtp.zoho.in', smtpPort: 465 };
              }
              return { ...prev, accountType: val };
            });
          }} options={[{ label: 'Gmail SMTP', value: 'gmail_smtp' }, { label: 'Zoho SMTP', value: 'smtp' }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="SMTP Host" value={form.smtpHost || ''} onChange={f('smtpHost')} />
            <Input label="SMTP Port" type="number" value={form.smtpPort || 587} onChange={f('smtpPort')} />
          </div>
          {modal === 'edit' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive || false}
                onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          )}
          
          {smtpTestResult && (
            // result message flips in each time the status changes
            <motion.div
              key={smtpTestResult}
              initial={reduce ? { opacity: 0 } : { opacity: 0, rotateX: -30, y: -8 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              style={{ transformPerspective: 600, transformOrigin: 'top center' }}
              className={`flex items-start gap-2 p-3 rounded-lg ${smtpTestResult === 'success' ? 'bg-green-50 text-green-700' : smtpTestResult === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
            >
              {smtpTestResult === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {smtpTestResult === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {smtpTestResult === 'testing' && <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mt-0.5" />}
              <p className="text-sm">{smtpTestMessage}</p>
            </motion.div>
          )}
          
          <div className="flex justify-between gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(null); setSmtpTestResult(null) }}>Cancel</Button>
            <div className="flex gap-2">
              {modal === 'edit' && (
                <Button 
                  variant="outline" 
                  onClick={testSmtpBeforeSave}
                  loading={smtpTestResult === 'testing'}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Test SMTP
                </Button>
              )}
              <Button
                onClick={handleSave}
                loading={createMut.isPending || updateMut.isPending}
              >
                {modal === 'create' ? 'Add Account' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete the account <strong>{deleteTarget?.email}</strong>?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => { deleteMut.mutate(deleteTarget?.id); setModal(null); }} loading={deleteMut.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
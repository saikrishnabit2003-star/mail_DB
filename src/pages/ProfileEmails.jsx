import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileEmailsService } from '../services/profileEmails.service'
import { profilesService } from '../services/profiles.service'
import { optionsService } from '../services/options.service'
import { useAuth } from '../context/AuthContext'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import SearchableSelect from '../components/ui/SearchableSelect'
import { Download, ListChecks, RefreshCw, RotateCcw, Trash2, Zap, Search, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { motion, animate, useReducedMotion } from 'framer-motion'
import { useDebounce } from '../hooks/useDebounce'

// ---- visual-only helpers (nothing starts invisible, so nothing can get stuck hidden) ----
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const cardVariants = {
  hidden: { y: 24, rotateX: -15, transformPerspective: 1000 },
  show: { y: 0, rotateX: 0, transformPerspective: 1000, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

// number counts up from 0
const CountUp = ({ value }) => {
  const reduce = useReducedMotion()
  const [n, setN] = useState(value)
  useEffect(() => {
    if (reduce) { setN(value); return }
    const c = animate(0, value, { duration: 1, ease: 'easeOut', onUpdate: v => setN(Math.round(v)) })
    return () => c.stop()
  }, [value, reduce])
  return <>{n}</>
}

// light stat card: gradient icon tile + count-up + 3D hover
const StatTile = ({ label, value, icon: Icon, gradient, text }) => {
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
        <p className={`text-3xl font-bold ${text}`}><CountUp value={value ?? 0} /></p>
      </motion.div>
    </motion.div>
  )
}

export default function ProfileEmails() {
  const { user, isAdmin } = useAuth()
  const reduce = useReducedMotion()
  const isPartialAdmin = user?.role === 'admin' && user?.accessLevel === 'partial'
  const qc = useQueryClient()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState('')
  const [genModal, setGenModal] = useState(false)
  const [genLimit, setGenLimit] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [clearModal, setClearModal] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // cards flip in on load; buttons tilt on hover
  const flip = reduce
    ? {}
    : {
        initial: { rotateX: -12, y: 16 },
        animate: { rotateX: 0, y: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        style: { transformPerspective: 1000, transformOrigin: 'top center' },
      }
  const btnHover = reduce ? {} : { whileHover: { y: -3, rotateX: 8, scale: 1.04 }, style: { transformPerspective: 600 } }

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => optionsService.getEmployees(),
    enabled: isAdmin(user),
  })
  const employees = (employeesData?.data?.data || []).slice().sort((a, b) => a.name.localeCompare(b.name))
  // Own data = no employee filter selected
  const isOwnData = !selectedEmployeeId

  const { data: profilesData } = useQuery({
    queryKey: ['profiles', selectedEmployeeId],
    queryFn: () => profilesService.list(selectedEmployeeId || undefined),
  })
  const profiles = profilesData?.data?.data || []

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['profile-email-stats', selectedProfile],
    queryFn: () => profileEmailsService.stats(selectedProfile),
    enabled: !!selectedProfile,
  })

  const { data: emailsData, isLoading } = useQuery({
    queryKey: ['profile-emails', selectedProfile, page, pageSize, debouncedSearch],
    queryFn: () => profileEmailsService.list(selectedProfile, { page, pageSize, search: debouncedSearch || undefined }),
    enabled: !!selectedProfile,
  })

  const stats  = statsData?.data?.data || {}
  const paginatedData = emailsData?.data?.data || {}
  const emails = Array.isArray(paginatedData?.data) ? paginatedData.data : []

  const genMut = useMutation({
    mutationFn: () => profileEmailsService.generate(selectedProfile, genLimit, null, false),
    onSuccess: (r) => { qc.invalidateQueries(['profile-emails', selectedProfile]); refetchStats(); setGenModal(false); toast.success(r.data?.message || 'Generated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const retryMut = useMutation({
    mutationFn: () => profileEmailsService.retryFailed(selectedProfile),
    onSuccess: () => { qc.invalidateQueries(['profile-emails', selectedProfile]); toast.success('Retrying failed emails') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to retry'),
  })
  const clearMut = useMutation({
    mutationFn: () => profileEmailsService.clear(selectedProfile),
    onSuccess: () => { qc.invalidateQueries(['profile-emails', selectedProfile]); toast.success('Cleared') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to clear'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => profileEmailsService.deleteRecord(id),
    onSuccess: () => { qc.invalidateQueries(['profile-emails', selectedProfile]); toast.success('Deleted') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete'),
  })

  const downloadFailedEmails = () => {
    const failedEmails = emails.filter(e => e.sendStatus?.toLowerCase() === 'failed')
    
    if (failedEmails.length === 0) {
      toast.error('No failed emails to download')
      return
    }

    const dataToExport = failedEmails.map((e, idx) => ({
      'S.No': idx + 1,
      'Name': e.fullName || '—',
      'Email': e.email,
      'University': e.university || '—',
      'Status': e.sendStatus,
      'Sent At': e.sentDate ? new Date(e.sentDate).toLocaleString() : '—',
      'Retries': e.retryCount ?? 0
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Failed Emails")
    XLSX.writeFile(wb, `Failed_Emails_${selectedProfile}.xlsx`)
  }

  const columns = [
    { 
      key: 'sno',  
      label: 'S.No',
      render: (_, row, idx) => (page - 1) * pageSize + idx + 1,
      width: '60px'
    },
    { key: 'fullName',    label: 'Name',    render: v => v || '—' },
    { key: 'email',       label: 'Email' },
    { key: 'university',     label: 'University', render: v => v || '—' },
    { 
      key: 'sendStatus',  
      label: 'Status',  
      render: v => {
        const statusColors = {
          'pending': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
          'sent': 'bg-green-50 text-green-700 border border-green-200',
          'failed': 'bg-red-50 text-red-700 border border-red-200',
          'sending': 'bg-blue-50 text-blue-700 border border-blue-200',
          'skipped': 'bg-gray-50 text-gray-700 border border-gray-200',
        }
        return (
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[v?.toLowerCase()] || 'bg-gray-100 text-gray-700'}`}>
            {v || '—'}
          </span>
        )
      }
    },
    { key: 'sentDate',    label: 'Sent At', render: v => v ? new Date(v).toLocaleString() : '—' },
    { key: 'retryCount',  label: 'Retries', render: v => v ?? 0 },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <motion.button
          whileHover={reduce ? undefined : { scale: 1.2, rotateY: 25, rotateX: -10 }}
          style={{ transformPerspective: 300 }}
          onClick={() => setDeleteId(row.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
        ><Trash2 className="w-4 h-4" /></motion.button>
      )
    }
  ]

  return (
    <div className="relative space-y-5 rounded-3xl border border-white/60 bg-gradient-to-br from-sky-100 via-indigo-100/70 to-cyan-100 p-5 shadow-inner">
      {/* soft light orbs */}
      <motion.div animate={reduce ? {} : { x: [0, -20, 0], y: [0, 15, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} className="pointer-events-none absolute right-10 top-4 h-64 w-64 rounded-full bg-white/50 blur-3xl" />
      <motion.div animate={reduce ? {} : { x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} className="pointer-events-none absolute bottom-6 left-10 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />

      {/* Step 1 + 2 selectors: Employee (admin only) → Profile */}
      <motion.div {...flip} className="relative z-30 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">

          {/* Step 1: Employee selector — only for admin/super_admin */}
          {isAdmin(user) && (
            <div className="min-w-72">
              <SearchableSelect
                label="Step 1 — Select Employee"
                value={selectedEmployeeId || ''}
                onChange={val => {
                  setSelectedEmployeeId(val || null)
                  setSelectedProfile('') // reset profile when employee changes
                }}
                placeholder={user?.role === 'super_admin' ? 'All Employees' : 'Select Employee...'}
                options={[
                  { label: 'ALL', value: '' },
                  ...employees.map(emp => ({ label: `${emp.name} — ${emp.email}`, value: emp.id }))
                ]}
              />
            </div>
          )}

          {/* Step 2: Profile selector — filtered by selected employee for admin */}
          <div className="min-w-72">
            <SearchableSelect
              label={isAdmin(user) ? 'Step 2 — Select Profile' : 'Select Profile'}
              value={selectedProfile}
              onChange={val => setSelectedProfile(val || '')}
              disabled={isAdmin(user) && !selectedEmployeeId && user?.role !== 'super_admin'}
              placeholder={isAdmin(user) && !selectedEmployeeId && user?.role !== 'super_admin' ? 'Select an employee first...' : 'Choose a profile...'}
              options={profiles.map(p => ({ label: p.profileName, value: p.id }))}
            />
          </div>

          {selectedProfile && (
            <>
              <motion.div {...btnHover}>
                <Button size="sm" onClick={() => setGenModal(true)}>
                  <Zap className="w-4 h-4" /> Generate List
                </Button>
              </motion.div>
              <motion.div {...btnHover}>
                <Button variant="secondary" size="sm" onClick={() => retryMut.mutate()} loading={retryMut.isPending}>
                  <RotateCcw className="w-4 h-4" /> Retry Failed
                </Button>
              </motion.div>
              <motion.div {...btnHover}>
                <Button variant="secondary" size="sm" onClick={downloadFailedEmails}>
                  <Download className="w-4 h-4" /> Download Failed
                </Button>
              </motion.div>
              <motion.div {...btnHover}>
                <Button variant="danger" size="sm" onClick={() => setClearModal(true)} loading={clearMut.isPending}>
                  <Trash2 className="w-4 h-4" /> Clear All
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      {selectedProfile && Object.keys(stats).length > 0 && (
        <div className="relative space-y-4">
          <motion.div variants={gridVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile label="Total"   value={stats.total}   icon={ListChecks} gradient="from-blue-400 to-indigo-500"  text="text-blue-600" />
            <StatTile label="Pending" value={stats.pending} icon={Clock}      gradient="from-amber-400 to-orange-500" text="text-amber-600" />
            <StatTile label="Sent"    value={stats.sent}    icon={CheckCircle} gradient="from-emerald-400 to-teal-500" text="text-emerald-600" />
            <StatTile label="Failed"  value={stats.failed}  icon={XCircle}    gradient="from-rose-400 to-pink-500"    text="text-rose-600" />
          </motion.div>
          <motion.div {...flip} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search emails..."
                    className="pl-9 pr-4 py-2 w-full sm:w-64 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                  />
                </div>
                <div className="flex items-center text-sm text-gray-500 h-[38px]">
                  Showing <span className="font-medium text-gray-900 mx-1">{paginatedData?.total > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, paginatedData?.total || 0)}</span> of <span className="font-medium text-gray-900 mx-1">{paginatedData?.total || stats.total || 0}</span> emails
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-4 flex-wrap mt-4 sm:mt-0">
                <div className="flex items-center gap-2">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="border border-gray-200 rounded-md py-1 px-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Page {page} of {paginatedData?.totalPages || 1}</span>
                  <button
                    onClick={() => setPage(Math.min(paginatedData?.totalPages || 1, page + 1))}
                    disabled={page >= (paginatedData?.totalPages || 1)}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <Table columns={columns} data={emails} loading={isLoading} emptyMsg="No emails generated yet" />
          </motion.div>
        </div>
      )}

      {!selectedProfile && (
        <motion.div {...flip} className="relative bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          {/* floating 3D icon with a pulsing ring */}
          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center" style={{ perspective: 400 }}>
            {!reduce && <span className="absolute inset-0 animate-ping rounded-2xl bg-blue-300/30" />}
            <motion.div
              animate={reduce ? {} : { rotateY: [-25, 25, -25], y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-xl shadow-blue-500/30"
            >
              <ListChecks className="w-8 h-8 text-white" />
            </motion.div>
          </div>
          <p className="text-gray-500 font-medium">Select a profile to manage its email list</p>
        </motion.div>
      )}

      <Modal open={genModal} onClose={() => setGenModal(false)} title="Confirm Generate">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to generate the email list for this profile?</p>
          <p className="text-xs text-gray-400">This pulls matching emails from Email Master based on profile filters.</p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setGenModal(false)}>Cancel</Button>
            <Button onClick={() => genMut.mutate()} loading={genMut.isPending}><Zap className="w-4 h-4" /> Generate</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete this email?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => { deleteMut.mutate(deleteId); setDeleteId(null); }} loading={deleteMut.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>

      <Modal open={clearModal} onClose={() => setClearModal(false)} title="Confirm Clear All">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to clear all emails for this profile?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setClearModal(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => { clearMut.mutate(); setClearModal(false); }} loading={clearMut.isPending}>Clear All</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
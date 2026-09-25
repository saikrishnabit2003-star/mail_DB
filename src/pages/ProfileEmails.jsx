import { useState } from 'react'
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
import { Download, ListChecks, RefreshCw, RotateCcw, Trash2, Zap, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { useDebounce } from '../hooks/useDebounce'

export default function ProfileEmails() {
  const { user, isAdmin } = useAuth()
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
        <button onClick={() => setDeleteId(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
      )
    }
  ]

  return (
    <div className="space-y-5">
      {/* Step 1 + 2 selectors: Employee (admin only) → Profile */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
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
              <Button size="sm" onClick={() => setGenModal(true)}>
                <Zap className="w-4 h-4" /> Generate List
              </Button>
              <Button variant="secondary" size="sm" onClick={() => retryMut.mutate()} loading={retryMut.isPending}>
                <RotateCcw className="w-4 h-4" /> Retry Failed
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadFailedEmails}>
                <Download className="w-4 h-4" /> Download Failed
              </Button>
              <Button variant="danger" size="sm" onClick={() => setClearModal(true)} loading={clearMut.isPending}>
                <Trash2 className="w-4 h-4" /> Clear All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {selectedProfile && Object.keys(stats).length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total',   value: stats.total,   color: 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' },
              { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 text-yellow-700 border-l-4 border-yellow-500' },
              { label: 'Sent',    value: stats.sent,    color: 'bg-green-50 text-green-700 border-l-4 border-green-500' },
              { label: 'Failed',  value: stats.failed,  color: 'bg-red-50 text-red-700 border-l-4 border-red-500' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
                <p className="text-3xl font-bold">{s.value ?? 0}</p>
                <p className="text-sm font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
          </div>
        </div>
      )}

      {!selectedProfile && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Select a profile to manage its email list</p>
        </div>
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

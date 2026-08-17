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
import Select from '../components/ui/Select'
import { ListChecks, RefreshCw, RotateCcw, Trash2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfileEmails() {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState('')
  const [genModal, setGenModal] = useState(false)
  const [genLimit, setGenLimit] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [clearModal, setClearModal] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 100 })

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => optionsService.getEmployees(),
    enabled: isAdmin(user),
  })
  const employees = employeesData?.data?.data || []

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
    queryKey: ['profile-emails', selectedProfile],
    queryFn: () => profileEmailsService.list(selectedProfile, { page: 1, pageSize: 50 }),
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
  })
  const clearMut = useMutation({
    mutationFn: () => profileEmailsService.clear(selectedProfile),
    onSuccess: () => { qc.invalidateQueries(['profile-emails', selectedProfile]); toast.success('Cleared') },
  })
  const deleteMut = useMutation({
    mutationFn: (id) => profileEmailsService.deleteRecord(id),
    onSuccess: () => { qc.invalidateQueries(['profile-emails', selectedProfile]); toast.success('Deleted') },
  })

  const columns = [
    { 
      key: 'sno',  
      label: 'S.No',
      render: (_, row, idx) => idx + 1,
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
            <div className="min-w-52">
              <Select
                label="Step 1 — Select Employee"
                value={selectedEmployeeId || ''}
                onChange={e => {
                  setSelectedEmployeeId(e.target.value || null)
                  setSelectedProfile('') // reset profile when employee changes
                }}
              >
                <option value="">
                  {user?.role === 'super_admin' ? 'All Employees' : 'Select Employee...'}
                </option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} — {emp.email}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Step 2: Profile selector — filtered by selected employee for admin */}
          <div className="min-w-52">
            <Select
              label={isAdmin(user) ? 'Step 2 — Select Profile' : 'Select Profile'}
              value={selectedProfile}
              onChange={e => setSelectedProfile(e.target.value)}
              disabled={isAdmin(user) && !selectedEmployeeId && user?.role !== 'super_admin'}
            >
              <option value="">
                {isAdmin(user) && !selectedEmployeeId && user?.role !== 'super_admin'
                  ? 'Select an employee first...'
                  : 'Choose a profile...'}
              </option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.profileName}</option>)}
            </Select>
          </div>

          {selectedProfile && (
            <>
              <Button size="sm" onClick={() => setGenModal(true)}>
                <Zap className="w-4 h-4" /> Generate List
              </Button>
              <Button variant="secondary" size="sm" onClick={() => retryMut.mutate()} loading={retryMut.isPending}>
                <RotateCcw className="w-4 h-4" /> Retry Failed
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
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            Showing {emails.length} of {paginatedData?.total || stats.total} total emails
          </div>
        </div>
      )}

      {selectedProfile && (
        <Table columns={columns} data={emails} loading={isLoading} emptyMsg="No emails generated yet" />
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

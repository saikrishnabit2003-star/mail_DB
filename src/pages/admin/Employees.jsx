import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { employeesService } from '../../services/employees.service'
import { usersService } from '../../services/users.service'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function Employees() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({ queryKey: ['employees'], queryFn: () => employeesService.list() })
  const { data: usersData } = useQuery({ queryKey: ['users'], queryFn: () => usersService.list() })

  const employees = data?.data?.data || []
  const users = usersData?.data?.data || []
  const employeeUsers = users.filter(u => u.role === 'employee')

  const createMut = useMutation({
    mutationFn: (d) => employeesService.create(d),
    onSuccess: () => { qc.invalidateQueries(['employees']); setModal(null); toast.success('Employee created') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => employeesService.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['employees']); setModal(null); toast.success('Employee updated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => employeesService.delete(id),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Employee deleted') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department', render: v => v || '—' },
    { key: 'branch', label: 'Branch', render: v => v || '—' },
    { key: 'status', label: 'Status', render: v => <Badge label={v} /> },
    { key: 'totalUploads', label: 'Total Uploads', render: (v, row) => <Badge label={row.stats?.totalUnique ?? '—'} /> },
    { key: 'totalProfiles', label: 'Total Profiles', render: (v, row) => <Badge label={row.stats?.totalProfiles ?? '—'} /> },
    { key: 'totalCampaigns', label: 'Total Campaigns', render: (v, row) => <Badge label={row.stats?.totalCampaigns ?? '—'} /> },
    { key: 'runningCampaigns', label: 'Running Campaigns', render: (v, row) => <Badge label={row.stats?.runningCampaigns ?? '—'} /> },
    { key: 'createdAt', label: 'Created', render: v => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setSelected(row); setForm({ department: row.department || '', branch: row.branch || '', status: row.status }); setModal('edit') }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => { setDeleteTarget(row); setModal('delete'); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{employees.length} employees</p>
        <Button size="sm" onClick={() => { setForm({ userId: '', department: '', branch: 'Vellore' }); setModal('create') }}>
          <Plus className="w-4 h-4" /> Add Employee
        </Button>
      </div>

      <Table columns={columns} data={employees} loading={isLoading} />

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create Employee">
        <div className="space-y-4">
          <Select label="User Account" value={form.userId || ''} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
            <option value="">Select a user...</option>
            {employeeUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </Select>
          <Input label="Department" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Sales, Marketing" />
          <Select label="Branch" value={form.branch || ''} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
            <option value="">Select a branch...</option>
            <option value="Vellore">Vellore</option>
            <option value="Chennai">Chennai</option>
            <option value="Marthandam">Marthandam</option>
            <option value="Trichy">Trichy</option>
            <option value="Nagarcoil-1">Nagarcoil-1</option>
            <option value="Nagarcoil-2">Nagarcoil-2</option>
            <option value="Villupuram">Villupuram</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} loading={createMut.isPending}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit Employee">
        <div className="space-y-4">
          <Input label="Department" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          <Select label="Branch" value={form.branch || ''} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
            <option value="">Select a branch...</option>
            <option value="Vellore">Vellore</option>
            <option value="Chennai">Chennai</option>
            <option value="Marthandam">Marthandam</option>
            <option value="Trichy">Trichy</option>
            <option value="Nagarcoil-1">Nagarcoil-1</option>
            <option value="Nagarcoil-2">Nagarcoil-2</option>
            <option value="Villupuram">Villupuram</option>
          </Select>
          <Select label="Status" value={form.status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate({ id: selected.id, d: form })} loading={updateMut.isPending}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

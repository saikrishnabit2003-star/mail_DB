import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '../../services/users.service'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { Plus, Pencil, Trash2, Key, RefreshCw, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext'

export default function Users() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({})
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '' })
  const [activeTab, setActiveTab] = useState('employee')
  const [selectedIds, setSelectedIds] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.list(),
  })

  const users = data?.data?.data || []
  const filteredUsers = users.filter(u => {
    if (activeTab === 'super_admin') return u.role?.toLowerCase() === 'super_admin'
    return u.role?.toLowerCase() === activeTab
  })

  const createMut = useMutation({
    mutationFn: (d) => usersService.create(d),
    onSuccess: () => { qc.invalidateQueries(['users']); setModal(null); toast.success('User created') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => usersService.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['users']); setModal(null); toast.success('User updated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => usersService.delete(id),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User deleted') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const deleteManyMut = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => usersService.delete(id)))
    },
    onSuccess: () => { 
      qc.invalidateQueries(['users']); 
      setSelectedIds([]);
      setModal(null);
      toast.success('Users deleted');
    },
    onError: (e) => toast.error('Failed to delete users'),
  })

  const pwMut = useMutation({
    mutationFn: ({ id, d }) => usersService.updatePassword(id, d),
    onSuccess: () => { setModal(null); toast.success('Password updated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const migrateMut = useMutation({
    mutationFn: () => usersService.migrateBranch(),
    onSuccess: (r) => { qc.invalidateQueries(['users']); toast.success(r.data?.data?.message || 'Migration done') },
  })

  const openEdit = (user) => {
    setSelected(user)
    setForm({ name: user.name, status: user.status, branch: user.branch || '', assignedToAdmin: user.assignedToAdmin || '' })
    setModal('edit')
  }

  const openPw = (user) => {
    setSelected(user)
    setPwForm({ old_password: '', new_password: '' })
    setModal('password')
  }

  const columns = [
    { key: 'sno', label: 'S.No', render: (_, __, i) => i + 1 },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (v) => <Badge label={v} /> },
    { key: 'status', label: 'Status', render: (v) => <Badge label={v} /> },
    { key: 'branch', label: 'Branch', render: (v) => v || '—' },
    { key: 'password', label: 'Password', render: (v) => v ? <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{v}</code> : '—' },
    { key: 'totalUploads', label: 'Uploads', render: (v, row) => <Badge label={row.stats?.uniqueUploads ?? '—'} /> },
    { key: 'totalProfiles', label: 'Profiles', render: (v, row) => <Badge label={row.stats?.totalProfiles ?? '—'} /> },
    { key: 'totalCampaigns', label: 'Campaigns', render: (v, row) => <Badge label={row.stats?.totalCampaigns ?? '—'} /> },
    { key: 'runningCampaigns', label: 'Running', render: (v, row) => <Badge label={row.stats?.runningCampaigns ?? '—'} /> },
     { key: 'pendingCampaigns', label: 'Pending Campaigns', render: (v, row) => <Badge label={row.stats?.pendingCampaigns ?? '—'} /> },
    { key: 'pendingEmails', label: 'Pending Mails', render: (v, row) => <Badge label={row.stats?.pendingEmails ?? '—'} /> },
    { key: 'createdAt', label: 'Created', render: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => openPw(row)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"><Key className="w-4 h-4" /></button>
          <button onClick={() => { setDeleteTarget(row); setModal('delete') }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ]

  const displayColumns = activeTab === 'employee' ? [
    {
      key: 'select',
      label: (
        <input 
          type="checkbox" 
          checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
          onChange={(e) => {
            if (e.target.checked) setSelectedIds(filteredUsers.map(u => u.id))
            else setSelectedIds([])
          }}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
        />
      ),
      render: (_, row) => (
        <input 
          type="checkbox" 
          checked={selectedIds.includes(row.id)}
          onChange={(e) => {
            if (e.target.checked) setSelectedIds(prev => [...prev, row.id])
            else setSelectedIds(prev => prev.filter(id => id !== row.id))
          }}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
        />
      )
    },
    ...columns
  ] : columns

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <div className="flex gap-6 mb-2">
            <button
              onClick={() => { setActiveTab('employee'); setSelectedIds([]); }}
              className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'employee' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              style={{ marginBottom: '-17px' }}
            >
              Employee Details
            </button>
            <button
              onClick={() => { setActiveTab('admin'); setSelectedIds([]); }}
              className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'admin' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              style={{ marginBottom: '-17px' }}
            >
              Admin Details
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => { setActiveTab('super_admin'); setSelectedIds([]); }}
                className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'super_admin' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                style={{ marginBottom: '-17px' }}
              >
                Super Admin
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-4">{filteredUsers.length} users</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'employee' && selectedIds.length > 0 && (
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
              onClick={() => setModal('deleteMany')} 
              loading={deleteManyMut.isPending}
            >
              <Trash2 className="w-4 h-4" /> Delete Selected
            </Button>
          )}
          <Button size="sm" onClick={() => { setForm({ name:'',email:'',password:'',role:'employee',branch:'Vellore', assignedToAdmin: '' }); setModal('create') }}>
            <Plus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>

      <Table columns={displayColumns} data={filteredUsers} loading={isLoading} emptyMsg="No users found" />

      {/* Create modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create User">
        <div className="space-y-4">
          <Input label="Name" value={form.name || ''} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" />
          <Input label="Email" type="email" value={form.email || ''} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="email@example.com" />
          <Input label="Password" type="password" value={form.password || ''} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="Min 8 characters" />
          <Select label="Role" value={form.role || 'employee'} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
          </Select>
          <Select label="Branch" value={form.branch || ''} onChange={e => setForm(f=>({...f,branch:e.target.value}))}>
            <option value="">Select a branch...</option>
            <option value="Vellore">Vellore</option>
            <option value="Chennai">Chennai</option>
            <option value="Marthandam">Marthandam</option>
            <option value="Trichy">Trichy</option>
            <option value="Nagarcoil-1">Nagarcoil-1</option>
            <option value="Nagarcoil-2">Nagarcoil-2</option>
            <option value="Villupuram">Villupuram</option>
          </Select>
          {/* If creating an employee, super_admin can assign them to an admin */}
          {isSuperAdmin && form.role === 'employee' && (
            <Select
              label="Assign to Admin"
              value={form.assignedToAdmin || ''}
              onChange={e => setForm(f=>({...f, assignedToAdmin:e.target.value}))}
            >
              <option value="">None (Unassigned)</option>
              {users.filter(u => u.role === 'admin').map(admin => (
                <option key={admin.id} value={admin.employeeId}>
                  {admin.name} ({admin.email})
                </option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} loading={createMut.isPending}>Create User</Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit User">
        <div className="space-y-4">
          <Input label="Name" value={form.name || ''} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
          <Select label="Status" value={form.status || 'active'} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select label="Branch" value={form.branch || ''} onChange={e => setForm(f=>({...f,branch:e.target.value}))}>
            <option value="">Select a branch...</option>
            <option value="Vellore">Vellore</option>
            <option value="Chennai">Chennai</option>
            <option value="Marthandam">Marthandam</option>
            <option value="Trichy">Trichy</option>
            <option value="Nagarcoil-1">Nagarcoil-1</option>
            <option value="Nagarcoil-2">Nagarcoil-2</option>
            <option value="Villupuram">Villupuram</option>
          </Select>
          {isSuperAdmin && selected?.role === 'employee' && (
            <Select
              label="Assign to Admin"
              value={form.assignedToAdmin || ''}
              onChange={e => setForm(f=>({...f, assignedToAdmin:e.target.value}))}
            >
              <option value="">None (Unassigned)</option>
              {users.filter(u => u.role === 'admin').map(admin => (
                <option key={admin.id} value={admin.employeeId}>
                  {admin.name} ({admin.email})
                </option>
              ))}
            </Select>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate({ id: selected.id, d: form })} loading={updateMut.isPending}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Password modal */}
      <Modal open={modal === 'password'} onClose={() => setModal(null)} title={`Update Password — ${selected?.name}`}>
        <div className="space-y-4">
          <Input label="Current Password" type="password" value={pwForm.old_password} onChange={e => setPwForm(f=>({...f,old_password:e.target.value}))} />
          <Input label="New Password" type="password" value={pwForm.new_password} onChange={e => setPwForm(f=>({...f,new_password:e.target.value}))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={() => pwMut.mutate({ id: selected.id, d: pwForm })} loading={pwMut.isPending}>Update Password</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Single Modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete the user <strong>{deleteTarget?.name}</strong>?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => { deleteMut.mutate(deleteTarget?.id); setModal(null); }} loading={deleteMut.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Many Modal */}
      <Modal open={modal === 'deleteMany'} onClose={() => setModal(null)} title="Confirm Bulk Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete {selectedIds.length} selected users?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => { deleteManyMut.mutate(selectedIds); }} loading={deleteManyMut.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

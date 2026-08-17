import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '../../services/users.service'
import { optionsService } from '../../services/options.service'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { Plus, Pencil, Trash2, Key, RefreshCw, Shield, ChevronUp, ChevronDown, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext'

const FilterDropdown = ({ title, value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative inline-flex items-center gap-1 cursor-pointer" ref={ref}>
      <span onClick={() => setOpen(!open)}>{title}</span>
      <Filter
        className={`w-3.5 h-3.5 ${value ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
      />
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 p-1 min-w-[100px]" onClick={e => e.stopPropagation()}>
          <select
            className="text-xs border border-gray-200 rounded px-1 py-1.5 w-full outline-none font-normal"
            value={value}
            onChange={(e) => { onChange(e.target.value); setOpen(false); }}
          >
            <option value="">All</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

const StatBadge = ({ value, colorClass }) => (
  <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-md text-xs font-bold transition-all duration-300 hover:scale-110 shadow-sm ${colorClass}`}>
    {value ?? '—'}
  </span>
)

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
  const [statusFilter, setStatusFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [sortField, setSortField] = useState(null)
  const [sortOrder, setSortOrder] = useState('desc')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.list(),
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => optionsService.getSettings(),
  })

  const settingsBranches = settingsData?.data?.data?.find(s => s.key === 'branch')?.values || []
  const branchOptions = settingsBranches.map(b => ({ label: b.toUpperCase(), value: b }))

  const users = data?.data?.data || []
  
  // Filter users by tab and status first to get the relevant branches
  const tabUsers = users.filter(u => {
    if (activeTab === 'super_admin') {
      if (u.role?.toLowerCase() !== 'super_admin') return false;
    } else {
      if (u.role?.toLowerCase() !== activeTab) return false;
    }
    return true;
  });

  // For the filter, only show branches that are actually present in the current tab
  const tableBranches = [...new Set(tabUsers.map(u => u.branch).filter(Boolean))]
  const tableBranchOptions = tableBranches.map(b => ({ label: b, value: b }))
  
  let filteredUsers = tabUsers.filter(u => {
    if (statusFilter && u.status !== statusFilter) return false;
    if (branchFilter && u.branch !== branchFilter) return false;
    return true;
  })

  if (sortField) {
    filteredUsers.sort((a, b) => {
      let valA = a.stats?.[sortField] || 0;
      let valB = b.stats?.[sortField] || 0;
      if (sortOrder === 'asc') return valA - valB;
      return valB - valA;
    });
  }

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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const renderSortHeader = (title, field) => (
    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort(field)}>
      <span>{title}</span>
      <div className="flex flex-col text-[8px] opacity-50">
        <ChevronUp className={`w-3 h-3 -mb-1 ${sortField === field && sortOrder === 'asc' ? 'text-primary-600 opacity-100' : ''}`} />
        <ChevronDown className={`w-3 h-3 ${sortField === field && sortOrder === 'desc' ? 'text-primary-600 opacity-100' : ''}`} />
      </div>
    </div>
  )

  const columns = [
    { key: 'sno', label: 'S.No', render: (_, __, i) => <span className="text-gray-400 font-medium">{i + 1}</span> },
    {
      key: 'user',
      label: 'User Info',
      render: (_, row) => (
        <div className="flex items-center gap-3 group">
          {/* <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:scale-105">
            {row.name?.charAt(0).toUpperCase()}
          </div> */}
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{row.name}</span>
            <span className="text-xs text-gray-500">{row.email}</span>
          </div>
        </div>
      )
    },
    { key: 'role', label: 'Role', render: (v) => <Badge label={v} /> },
    {
      key: 'status',
      label: (
        <FilterDropdown
          title="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' }
          ]}
        />
      ),
      render: (v) => <Badge label={v} />
    },
    {
      key: 'branch',
      label: (
        <FilterDropdown
          title="Branch"
          value={branchFilter}
          onChange={setBranchFilter}
          options={tableBranchOptions}
        />
      ),
      render: (v) => <span className="text-gray-600 font-medium">{v || '—'}</span>
    },
    {
      key: 'password',
      label: 'Password',
      render: (v) => v ? <span className="bg-gray-50 text-gray-600 border border-gray-200 px-2 py-1 rounded-md text-xs tracking-wider font-mono">{v}</span> : '—'
    },
    { key: 'totalUploads', label: renderSortHeader('Uploads', 'uniqueUploads'), render: (v, row) => <StatBadge value={row.stats?.uniqueUploads} colorClass="bg-blue-50 text-blue-700 border border-blue-200" /> },
    { key: 'totalProfiles', label: renderSortHeader('Profiles', 'totalProfiles'), render: (v, row) => <StatBadge value={row.stats?.totalProfiles} colorClass="bg-indigo-50 text-indigo-700 border border-indigo-200" /> },
    { key: 'totalCampaigns', label: renderSortHeader('Campaigns', 'totalCampaigns'), render: (v, row) => <StatBadge value={row.stats?.totalCampaigns} colorClass="bg-purple-50 text-purple-700 border border-purple-200" /> },
    { key: 'runningCampaigns', label: renderSortHeader('Running', 'runningCampaigns'), render: (v, row) => <StatBadge value={row.stats?.runningCampaigns} colorClass="bg-green-50 text-green-700 border border-green-200" /> },
    { key: 'pendingCampaigns', label: renderSortHeader('Pending Campaign', 'pendingCampaigns'), render: (v, row) => <StatBadge value={row.stats?.pendingCampaigns} colorClass="bg-yellow-50 text-yellow-700 border border-yellow-200" /> },
    { key: 'pendingEmails', label: renderSortHeader('Pending Mails', 'pendingEmails'), render: (v, row) => <StatBadge value={row.stats?.pendingEmails} colorClass="bg-red-50 text-red-700 border border-red-200" /> },
    { key: 'createdAt', label: 'Created', render: (v) => v ? <span className="text-gray-500 whitespace-nowrap">{format(new Date(v), 'MMM d, yyyy')}</span> : '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
          <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => openPw(row)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Change Password"><Key className="w-4 h-4" /></button>
          <button onClick={() => { setDeleteTarget(row); setModal('delete') }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
          <p className="text-sm text-gray-500 mt-10">{filteredUsers.length} users</p>
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
          <Button size="sm" onClick={() => { setForm({ name: '', email: '', password: '', role: 'employee', branch: 'Vellore', assignedToAdmin: '' }); setModal('create') }}>
            <Plus className="w-4 h-4" /> Add User
          </Button>
        </div>
      </div>

      <Table columns={displayColumns} data={filteredUsers} loading={isLoading} emptyMsg="No users found" />

      {/* Create modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create User">
        <div className="space-y-4">
          <Input label="Name" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          <Input label="Email" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
          <Input label="Password" type="password" value={form.password || ''} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
          <Select label="Role" value={form.role || 'employee'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
          </Select>
          <Select label="Branch" value={form.branch || ''} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
            <option value="">Select a branch...</option>
            {branchOptions.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </Select>
          {/* If creating an employee, super_admin can assign them to an admin */}
          {isSuperAdmin && form.role === 'employee' && (
            <Select
              label="Assign to Admin"
              value={form.assignedToAdmin || ''}
              onChange={e => setForm(f => ({ ...f, assignedToAdmin: e.target.value }))}
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
          <Input label="Name" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Status" value={form.status || 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select label="Branch" value={form.branch || ''} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
            <option value="">Select a branch...</option>
            {branchOptions.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </Select>
          {isSuperAdmin && selected?.role === 'employee' && (
            <Select
              label="Assign to Admin"
              value={form.assignedToAdmin || ''}
              onChange={e => setForm(f => ({ ...f, assignedToAdmin: e.target.value }))}
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
          <Input label="Current Password" type="password" value={pwForm.old_password} onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))} />
          <Input label="New Password" type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} />
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

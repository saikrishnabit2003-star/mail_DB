import { useState } from 'react'
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
import Select from '../components/ui/Select'
import { Plus, Pencil, Trash2, Wifi, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const blank = { email: '', accountType: 'gmail_smtp', displayName: '', smtpHost: 'smtp.gmail.com', smtpPort: 587, useTls: true, appPassword: '' }

export default function EmailAccounts() {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(blank)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [smtpTestResult, setSmtpTestResult] = useState(null) // null, 'testing', 'success', 'error'
  const [smtpTestMessage, setSmtpTestMessage] = useState('')
  const [autoFillProfileId, setAutoFillProfileId] = useState('')

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
  const employees = employeesData?.data?.data || []

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
    { key: 'sno', label: 'S.No', render: (_, __, i) => <span className="text-gray-400 font-medium">{(i + 1).toString().padStart(2, '0')}</span> },
    { key: 'displayName', label: 'Name' },
    { key: 'email', label: 'Email', render: v => <span className="font-medium text-center text-gray-800">{v}</span> },
    { key: 'accountType', label: 'Type', render: v => <Badge label={v} /> },
    { key: 'smtpHost', label: 'SMTP Host', render: v => <span className="text-gray-500">{v}</span> },
    { key: 'smtpPort', label: 'Port', render: v => <span className="text-gray-500">{v}</span> },
    { key: 'isActive', label: 'Status', render: v => <Badge label={v ? 'active' : 'inactive'} variant={v ? 'success' : 'default'} /> },
    { key: 'lastUsedAt', label: 'Last Used', render: v => v ? <span className="text-gray-500">{format(new Date(v), 'MMM d, yyyy')}</span> : <span className="text-gray-300">—</span> },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setSelected(row); setForm({ email: row.email, accountType: row.accountType, displayName: row.displayName, smtpHost: row.smtpHost, smtpPort: row.smtpPort, useTls: row.useTls, isActive: row.isActive }); setModal('edit') }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => { setDeleteTarget(row); setModal('delete'); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-sm text-gray-500">{accounts.length} accounts</p>
          {isAdmin(user) && (
            <Select 
              value={selectedEmployeeId || ''} 
              onChange={e => setSelectedEmployeeId(e.target.value || null)}
              className="w-48"
            >
              <option value="">Select Employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} — {emp.email}</option>
              ))}
            </Select>
          )}
        </div>
        <Button size="sm" onClick={() => { setForm(blank); setModal('create') }}>
          <Plus className="w-4 h-4" /> Add Account
        </Button>
      </div>

      <Table columns={columns} data={accounts} loading={isLoading} emptyMsg="No email accounts yet" />

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => { setModal(null); setSmtpTestResult(null); setAutoFillProfileId(''); }} title={modal === 'create' ? 'Add Email Account' : 'Edit Account'} size="md">
        <div className="space-y-4">
          {isAdmin(user) && (
            <Select
              label={modal === 'edit' ? 'Employee (reassign)' : 'Employee'}
              value={form.employeeId || ''}
              onChange={f('employeeId')}
              required={modal === 'create'}
            >
              <option value="">
                {modal === 'edit' ? 'Keep current employee...' : 'Select Employee...'}
              </option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} — {emp.email}</option>
              ))}
            </Select>
          )}
          
          {(isAdmin(user) ? !!activeEmployeeIdForAccounts : true) && (
            <Select
              label="Profile (Auto-fill Email)"
              value={autoFillProfileId}
              onChange={(e) => {
                const pId = e.target.value;
                setAutoFillProfileId(pId);
                const selectedProf = availableProfiles.find(p => p.id === pId);
                if (selectedProf && selectedProf.gmailAccount) {
                  setForm(prev => ({ ...prev, email: selectedProf.gmailAccount }));
                }
              }}
            >
              <option value="">Select Profile...</option>
              {availableProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.profileName} {p.gmailAccount ? `— ${p.gmailAccount}` : ''}
                </option>
              ))}
            </Select>
          )}
          <Input label="Display Name" value={form.displayName || ''} onChange={f('displayName')} placeholder="Marketing Team" />
          <Input 
            label="Email Address" 
            type="email" 
            value={form.email || ''} 
            onChange={f('email')}
            placeholder="you@gmail.com" 
          />
          <div className="space-y-1">
            <Input 
              label={modal === 'create' ? 'App Password' : 'App Password (leave blank to keep current)'}
              type="password" 
              value={form.appPassword || ''} 
              onChange={f('appPassword')} 
              placeholder={modal === 'create' ? 'Gmail app password' : 'Enter new password if changing'} 
            />
            <p className="text-xs text-gray-500">
  Click <a href="https://accounts.google.com/signin/v2/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">this link</a> to open your Google Account settings. First, enable 2-Step Verification (MFA). Then search for "App Passwords", enter your account password when prompted, and generate an app password. Use the generated password here.
</p>
          </div>
          <Select label="Account Type" value={form.accountType || 'gmail_smtp'} onChange={(e) => {
            const val = e.target.value;
            setForm(prev => {
              if (val === 'gmail_smtp') {
                return { ...prev, accountType: val, smtpHost: 'smtp.gmail.com', smtpPort: 587 };
              } else if (val === 'zoho_smtp') {
                return { ...prev, accountType: val, smtpHost: 'smtp.zoho.in', smtpPort: 465 };
              }
              return { ...prev, accountType: val };
            });
          }}>
            <option value="gmail_smtp">Gmail SMTP</option>
            <option value="zoho_smtp">Zoho SMTP</option>
          </Select>
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
            <div className={`flex items-start gap-2 p-3 rounded-lg ${smtpTestResult === 'success' ? 'bg-green-50 text-green-700' : smtpTestResult === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {smtpTestResult === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {smtpTestResult === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {smtpTestResult === 'testing' && <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mt-0.5" />}
              <p className="text-sm">{smtpTestMessage}</p>
            </div>
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

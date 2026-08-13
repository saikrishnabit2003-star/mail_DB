import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profilesService } from '../services/profiles.service'
import { optionsService } from '../services/options.service'
import { emailAccountsService } from '../services/emailAccounts.service'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import MultiSelect from '../components/ui/MultiSelect'
import { emailMasterService } from '../services/emailMaster.service'
import { Plus, Pencil, Trash2, Power, PowerOff, Upload, X, Info, LayoutTemplate, Filter, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const TABS = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'filters', label: 'Filters', icon: Filter },
  { id: 'sending', label: 'Sending Options', icon: Settings2 },
  { id: 'test', label: 'TEST', icon: Settings2 },
]

const defaultForm = {
  profileName: '', gmailAccount: '',
  employeeId: '',
  signature: '',
  templates: [
    { name: 'Default', subject: '', body: '' },
  ],
  attachments: [],
  filters: { country: [], state: [], industry: [], domain: [], company: [], type: [], mailSource: [] },
  filterLimit: 0,
  sendingOptions: { dailyLimit: 100, delayMin: 30, delayMax: 90 },
  promptSettings: { personalizeGreeting: true, improveGrammar: false, improveProfessionalism: false, aiRewrite: false, customInstruction: '' },
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'link'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['clean']
  ]
}

export default function Profiles() {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterCount, setFilterCount] = useState(null)
  const [isCountingFilters, setIsCountingFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('info') // info, templates, filters, sending
  const [selected, setSelected] = useState(null)
  const [testEmail, setTestEmail] = useState('')

  // Fetch employees list for admin dropdown
  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => optionsService.getEmployees(),
    enabled: isAdmin(user),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['profiles', selectedEmployeeId],
    queryFn: () => profilesService.list(selectedEmployeeId || undefined),
  })
  const profiles = data?.data?.data || []
  const employees = employeesData?.data?.data || []

  // Determine which employee's email accounts to show in the gmailAccount dropdown:
  // - For admin: use selectedEmployeeId (the employee selected in the filter bar)
  // - For employee role: use their own employeeId from auth
  // When creating a profile, the form's employeeId field also drives this
  const activeEmployeeIdForAccounts = isAdmin(user)
    ? (form.employeeId || selectedEmployeeId)
    : user?.employeeId

  const { data: emailAccountsData } = useQuery({
    queryKey: ['email-accounts-for-profile', activeEmployeeIdForAccounts],
    queryFn: () => emailAccountsService.list(activeEmployeeIdForAccounts || null),
    enabled: !!activeEmployeeIdForAccounts || !isAdmin(user),
  })
  const availableEmailAccounts = (emailAccountsData?.data?.data || []).filter(a => a.isActive)

  const { data: dropdownData } = useQuery({
    queryKey: ['dropdown-options'],
    queryFn: () => emailMasterService.getDropdownOptions(),
  })
  const dropdownOptions = dropdownData?.data?.data || {}

  const createMut = useMutation({
    mutationFn: (d) => {
      const { employeeId, ...rest } = d;
      return profilesService.create(rest, employeeId || selectedEmployeeId);
    },
    onSuccess: () => { qc.invalidateQueries(['profiles']); setModal(null); toast.success('Profile created') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => {
      const { employeeId, ...rest } = d
      // Pass employeeId as both form data (for reassignment) and keep selectedEmployeeId for context
      return profilesService.update(id, { ...rest, employeeId: employeeId || undefined }, selectedEmployeeId)
    },
    onSuccess: () => { qc.invalidateQueries(['profiles']); setModal(null); toast.success('Profile updated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => profilesService.delete(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['profiles']); toast.success('Deleted') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const toggleMut = useMutation({
    mutationFn: ({ id, active }) => active ? profilesService.deactivate(id, selectedEmployeeId) : profilesService.activate(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['profiles']); toast.success('Updated') },
  })

  const testEmailMut = useMutation({
    mutationFn: (data) => profilesService.testEmail(selected.id, data, selectedEmployeeId),
    onSuccess: (res) => { toast.success(res.data?.message || 'Test email sent') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to send test email'),
  })

  const f = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const fNum = (section, key) => (e) => setForm(prev => ({ ...prev, [section]: { ...prev[section], [key]: e.target.value === '' ? '' : Number(e.target.value) } }))
  const fFilter = (filterKey) => (e) => {
    const value = e.target.value
    setForm(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterKey]: value ? value.split(',').map(v => v.trim()).filter(v => v) : []
      }
    }))
    setFilterCount(null) // Reset count when filters change
  }

  const fFilterMulti = (filterKey) => (valueArray) => {
    setForm(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterKey]: valueArray || []
      }
    }))
    setFilterCount(null) // Reset count when filters change
  }

  const fFilterLimit = (e) => setForm(prev => ({ ...prev, filterLimit: e.target.value === '' ? '' : Number(e.target.value) }))

  const addTemplate = () => {
    if (form.templates.length < 3) {
      setForm(prev => ({
        ...prev,
        templates: [...prev.templates, { name: '', subject: '', body: '' }]
      }))
    }
  }

  const removeTemplate = (idx) => {
    if (form.templates.length > 1) {
      setForm(prev => ({
        ...prev,
        templates: prev.templates.filter((_, i) => i !== idx)
      }))
    }
  }

  const updateTemplate = (idx, field, value) => {
    setForm(prev => ({
      ...prev,
      templates: prev.templates.map((t, i) => i === idx ? { ...t, [field]: value } : t)
    }))
  }

  const handleProfileAttachmentUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!selected?.id) {
      toast.error('Save the profile first, then add attachments')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await profilesService.uploadProfileAttachment(selected.id, file, selectedEmployeeId)
      const updatedProfile = res.data?.data

      setForm(prev => ({
        ...prev,
        attachments: updatedProfile.attachments || []
      }))

      toast.success('File attached')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload file')
    }
  }

  const handleProfileAttachmentDelete = async (attIdx) => {
    const attachment = form.attachments?.[attIdx]
    if (!attachment?.id) return

    try {
      const res = await profilesService.deleteProfileAttachment(selected.id, attachment.id, selectedEmployeeId)
      const updatedProfile = res.data?.data

      setForm(prev => ({
        ...prev,
        attachments: updatedProfile.attachments || []
      }))

      toast.success('Attachment removed')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete attachment')
    }
  }

  const handleAttachmentUpload = async (e, templateIdx) => {
    // This is no longer used - attachments are profile-level now
    toast.error('Attachments are now managed at the profile level')
  }

  const handleAttachmentDelete = async (templateIdx, attachmentIdx) => {
    // This is no longer used - attachments are profile-level now
  }

  const checkFilterCount = async () => {
    if (!form.filters || Object.values(form.filters).every(arr => !Array.isArray(arr) || arr.length === 0)) {
      setFilterCount(null)
      return
    }
    setIsCountingFilters(true)
    try {
      const res = await profilesService.countFiltered(form.filters, selectedEmployeeId)
      setFilterCount(res.data?.data?.totalMatching)
    } catch (e) {
      console.error('Failed to count filters:', e)
    } finally {
      setIsCountingFilters(false)
    }
  }
  const formatProfileForEdit = (profile) => {
    if (profile.templates && Array.isArray(profile.templates)) {
      return { ...profile, attachments: profile.attachments || [] }
    }
    return {
      ...profile,
      templates: [{ id: 'default', name: 'Default Template', subject: profile.subject || '', body: profile.body || '', weight: 1 }],
      attachments: profile.attachments || []
    }
  }

  const openModal = (type, profile = null) => {
    setActiveTab('info')
    setFilterCount(null)
    setTestEmail('')
    if (profile) {
      setSelected(profile)
      setForm(formatProfileForEdit(profile))
    } else {
      setSelected(null)
      setForm(defaultForm)
    }
    setModal(type)
  }

  const handleSave = () => {
    if (isAdmin(user) && modal === 'create' && !form.employeeId && !selectedEmployeeId) {
      setActiveTab('info')
      return toast.error('Please select an employee for this profile')
    }
    modal === 'create' ? createMut.mutate(form) : updateMut.mutate({ id: selected.id, d: form })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-sm text-gray-500">{profiles.length} profiles</p>
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
          {isAdmin(user) && !employees.length && selectedEmployeeId && (
            <p className="text-xs text-gray-500">Loading employees...</p>
          )}
        </div>
        <Button size="sm" onClick={() => openModal('create')}>
          <Plus className="w-4 h-4" /> New Profile
        </Button>
      </div>

      {/* Profile cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : !profiles.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">No profiles yet. Create one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {profiles.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.profileName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{p.gmailAccount}</p>
                </div>
                <Badge label={p.isActive ? 'active' : 'inactive'} />
              </div>

              <div className="space-y-1.5 mb-4">
                <p className="text-xs text-gray-500"><span className="font-medium">Templates:</span> {(p.templates?.length || 1)}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">Daily Limit:</span> {p.sendingOptions?.dailyLimit}/day</p>
                <p className="text-xs text-gray-500"><span className="font-medium">Filter Limit:</span> {p.filterLimit > 0 ? p.filterLimit : 'Unlimited'}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">Delay:</span> {p.sendingOptions?.delayMin}–{p.sendingOptions?.delayMax}s</p>
              </div>

              <div className="flex items-center gap-1 pt-3 border-t border-gray-50">
                <button onClick={() => openModal('edit', p)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => toggleMut.mutate({ id: p.id, active: p.isActive })} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                  {p.isActive ? <><PowerOff className="w-3.5 h-3.5" /> Deactivate</> : <><Power className="w-3.5 h-3.5" /> Activate</>}
                </button>
                <button onClick={() => { setDeleteTarget(p); setModal('delete') }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Create Profile' : 'Edit Profile'}
        size="lg"
      >
        <div className="flex flex-col" style={{ minHeight: '460px' }}>

          {/* ── Tab Bar ── */}
          <div className="flex border-b border-gray-200 mb-5">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                    ${isActive
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* ── Tab Content ── */}
          <div className="flex-1 overflow-y-auto space-y-4">

            {/* INFO TAB */}
            {activeTab === 'info' && (
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
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Profile Name" value={form.profileName || ''} onChange={f('profileName')} placeholder="e.g. USA Tech CEOs" />
                  {availableEmailAccounts.length > 0 ? (
                    <Select
                      label="Gmail / SMTP Account"
                      value={form.gmailAccount || ''}
                      onChange={f('gmailAccount')}
                    >
                      <option value="">Select email account...</option>
                      {availableEmailAccounts.map(a => (
                        <option key={a.id} value={a.email}>
                          {a.displayName ? `${a.displayName} (${a.email})` : a.email}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <div>
                      <Input
                        label="Gmail / SMTP Account"
                        value={form.gmailAccount || ''}
                        onChange={f('gmailAccount')}
                        placeholder="you@gmail.com"
                      />
                      <p className="text-xs text-amber-600 mt-1">
                        {isAdmin(user) && !activeEmployeeIdForAccounts
                          ? '⚠ Select an employee above to see their email accounts'
                          : '⚠ No active email accounts found — add one in Email Accounts first'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-gray-700 text-sm">
                    Attachments <span className="font-normal text-gray-400 text-xs">(shared across all templates)</span>
                  </h4>
                  <div className="flex items-center gap-3">
                    <label className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border ${selected?.id
                      ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer border-blue-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50 border-gray-200'
                      }`}
                      title={!selected?.id ? 'Save profile first, then add attachments' : ''}>
                      <Upload className="w-4 h-4" /> Add File
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleProfileAttachmentUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                        disabled={!selected?.id}
                      />
                    </label>
                    {!selected?.id && <p className="text-xs text-gray-400">Save the profile first to attach files.</p>}
                  </div>
                  {form.attachments && form.attachments.length > 0 && (
                    <div className="space-y-1">
                      {form.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm">
                          <span className="truncate text-gray-700">{att.filename} <span className="text-gray-400">({(att.size / 1024).toFixed(1)}KB)</span></span>
                          <button onClick={() => handleProfileAttachmentDelete(idx)} className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TEMPLATES TAB */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">up to 3 templates</p>
                  {form.templates.length < 3 && (
                    <Button size="sm" variant="secondary" onClick={addTemplate}>
                      <Plus className="w-3 h-3" /> Add Template
                    </Button>
                  )}
                </div>
                {form.templates.map((t, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">Template {idx + 1}</span>
                      {form.templates.length > 1 && (
                        <button
                          onClick={() => removeTemplate(idx)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Template name (e.g., Aggressive, Friendly)"
                      value={t.name}
                      onChange={(e) => updateTemplate(idx, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Subject line"
                      value={t.subject}
                      onChange={(e) => updateTemplate(idx, 'subject', e.target.value)}
                    />
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <ReactQuill
                        theme="snow"
                        modules={quillModules}
                        value={t.body}
                        onChange={(value) => updateTemplate(idx, 'body', value)}
                        placeholder="Email body content"
                        className="text-sm [&_.ql-container]:min-h-[140px] [&_.ql-editor]:min-h-[140px] [&_.ql-editor]:text-sm [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-container]:border-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FILTERS TAB */}
            {activeTab === 'filters' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Narrow which contacts receive this profile.</p>
                  <button
                    onClick={checkFilterCount}
                    disabled={isCountingFilters}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100 disabled:opacity-50 font-medium transition-colors"
                  >
                    {isCountingFilters ? 'Counting…' : 'Check Count'}
                  </button>
                </div>

                {filterCount !== null && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                    Found <strong>{filterCount}</strong> matching emails
                    {form.filterLimit > 0 && filterCount > form.filterLimit && (
                      <span className="text-blue-500"> (will limit to {form.filterLimit})</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <MultiSelect
                    label="Countries"
                    value={form.filters?.country || []}
                    onChange={val => fFilterMulti('country')(val)}
                    options={(dropdownOptions.countries || []).map(c => ({ label: c, value: c }))}
                    placeholder="Select countries..."
                  />
                  <MultiSelect
                    label="States"
                    value={form.filters?.state || []}
                    onChange={val => fFilterMulti('state')(val)}
                    options={(dropdownOptions.states || []).map(s => ({ label: s, value: s }))}
                    placeholder="Select states..."
                  />
                  <MultiSelect
                    label="Domains"
                    value={form.filters?.domain || []}
                    onChange={val => fFilterMulti('domain')(val)}
                    options={(dropdownOptions.domains || []).map(d => ({ label: d, value: d }))}
                    placeholder="Select domains..."
                  />
                  <MultiSelect
                    label="Industries"
                    value={form.filters?.industry || []}
                    onChange={val => fFilterMulti('industry')(val)}
                    options={(dropdownOptions.industries || []).map(i => ({ label: i, value: i }))}
                    placeholder="Select industries..."
                  />
                  <MultiSelect
                    label="Companies"
                    value={form.filters?.company || []}
                    onChange={val => fFilterMulti('company')(val)}
                    options={(dropdownOptions.companies || []).map(c => ({ label: c, value: c }))}
                    placeholder="Select companies..."
                  />
                </div>

                <MultiSelect
                  label="Types (Designation / Role)"
                  value={form.filters?.type || []}
                  onChange={val => fFilterMulti('type')(val)}
                  options={(dropdownOptions.designations || []).map(d => ({ label: d, value: d }))}
                  placeholder="Select types..."
                />

                <Input
                  label="Filter Limit (0 = no limit)"
                  type="number"
                  value={form.filterLimit}
                  onChange={fFilterLimit}
                  placeholder="Max emails to fetch from filtered results"

                  max="600"
                />

                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    checked={!!form.filters?.allowUsed}
                    onChange={e => setForm(f => ({ ...f, filters: { ...f.filters, allowUsed: e.target.checked } }))}
                    className="rounded border-gray-300 text-primary-600 mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-gray-900 block">Allow Used Emails</span>
                    <span className="text-xs text-gray-500 block">If checked, emails that have been used previously (but are not currently active in another profile) can be generated.</span>
                  </div>
                </label>

                <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                  <label className="block text-xs font-semibold text-gray-600">Mail Source</label>
                  <div className="flex gap-4 flex-wrap">
                    {['Google Scholar', 'University', 'Other'].map(src => (
                      <label key={src} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form.filters?.mailSource || []).includes(src)}
                          onChange={e => {
                            const current = form.filters?.mailSource || []
                            const updated = e.target.checked
                              ? [...current, src]
                              : current.filter(s => s !== src)
                            setForm(f => ({ ...f, filters: { ...f.filters, mailSource: updated } }))
                          }}
                          className="rounded border-gray-300 text-primary-600"
                        />
                        {src}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Leave unchecked to include all sources</p>
                </div>

                <p className="text-xs text-gray-400">Separate multiple values with commas.</p>
              </div>
            )}

            {/* SENDING OPTIONS TAB */}
            {activeTab === 'sending' && (
              <div className="space-y-5">
                <p className="text-sm text-gray-500">Configure rate limits and delays for this profile.</p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50 hover:bg-white transition-colors">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Daily Limit</p>
                    <Input type="number" value={form.sendingOptions?.dailyLimit} onChange={fNum('sendingOptions', 'dailyLimit')} />
                    <p className="text-xs text-gray-400 text-center">emails / day</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50 hover:bg-white transition-colors">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Min Delay</p>
                    <Input type="number" value={form.sendingOptions?.delayMin} onChange={fNum('sendingOptions', 'delayMin')} />
                    <p className="text-xs text-gray-400 text-center">seconds</p>
                  </div>
                  <div className="border border-gray-200 rounded-xl p-4 space-y-2 bg-gray-50 hover:bg-white transition-colors">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Max Delay</p>
                    <Input type="number" value={form.sendingOptions?.delayMax} onChange={fNum('sendingOptions', 'delayMax')} />
                    <p className="text-xs text-gray-400 text-center">seconds</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  <strong>Tip:</strong> A random delay between Min and Max is used between each email to avoid spam filters.
                </div>
              </div>
            )}

            {/* TEST TAB */}
            {activeTab === 'test' && (
              <div className="space-y-5">
                <p className="text-sm text-gray-500">Send a test email to verify your profile settings.</p>
                {!selected?.id ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                    <strong>Note:</strong> Please save the profile first before sending a test email.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input 
                      label="To Email" 
                      value={testEmail} 
                      onChange={(e) => setTestEmail(e.target.value)} 
                      placeholder="e.g. test@example.com"
                    />
                    <div>
                      <Button 
                        onClick={() => {
                          if (!testEmail) return toast.error('Please enter an email address')
                          testEmailMut.mutate({ toEmail: testEmail })
                        }}
                        loading={testEmailMut.isPending}
                        disabled={!testEmail}
                      >
                        Send Test Email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200">
            <div className="flex gap-1.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-2 h-2 rounded-full transition-all ${activeTab === tab.id ? 'bg-primary-600 w-4' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  title={tab.label}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              {activeTab === 'test' ? (
                <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending}>
                  {modal === 'create' ? 'Create Profile' : 'Save Changes'}
                </Button>
              ) : (
                <Button onClick={() => {
                  const currentIndex = TABS.findIndex(t => t.id === activeTab)
                  if (currentIndex < TABS.length - 1) {
                    setActiveTab(TABS[currentIndex + 1].id)
                  }
                }}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete the profile <strong>{deleteTarget?.profileName}</strong>?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => { deleteMut.mutate(deleteTarget?.id); setModal(null); }} loading={deleteMut.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profilesService } from '../services/profiles.service'
import { optionsService } from '../services/options.service'
import { emailAccountsService } from '../services/emailAccounts.service'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import SearchableSelect from '../components/ui/SearchableSelect'
import DateRangePicker from '../components/ui/DateRangePicker'
import MultiSelect from '../components/ui/MultiSelect'
import { emailMasterService } from '../services/emailMaster.service'
import { Plus, Pencil, Trash2, Power, PowerOff, Upload, X, Info, LayoutTemplate, Filter, Settings2, Calendar, University, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { motion, useReducedMotion } from 'framer-motion'
import ReactQuill, { Quill } from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const Block = Quill.import('blots/block')
Block.tagName = 'DIV'
Quill.register(Block, true)

// Use inline styles instead of classes for size (crucial for email rendering)
const SizeStyle = Quill.import('attributors/style/size')
SizeStyle.whitelist = ['10px', '18px', '32px']
Quill.register(SizeStyle, true)

const TABS = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'templates', label: 'D-Templates', icon: LayoutTemplate },
  { id: 'reminder-templates', label: 'R-Templates', icon: LayoutTemplate },
  // { id: 'r1-template', label: 'R1-Templates', icon: LayoutTemplate },
  // { id: 'r2-template', label: 'R2-Templates', icon: LayoutTemplate },
  { id: 'filters', label: 'Filters', icon: Filter },
  { id: 'sending', label: 'Sending Options', icon: Settings2 },
  { id: 'test', label: 'TEST', icon: Settings2 },
]
const TEMPLATE_SECTIONS = [
  { field: 'templates', tab: 'templates', label: 'Templates' },
  // { field: 'r1Templates', tab: 'r1-template', label: 'R1-template' },
  // { field: 'r2Templates', tab: 'r2-template', label: 'R2-template' },
]
const dateRange = [
  { label: "Last 30 days", value: "last_30_days" },
  { label: "Last 3 months", value: "last_3_months" },
  { label: "Custom", value: "custom",icon:Calendar }
]
const defaultForm = {
  profileName: '', gmailAccount: '',
  employeeId: '',
  signature: '',
  templates: [
    { name: 'Default', subject: '', body: '' },
  ],
  r1Templates: [
    { name: 'Default', subject: '', body: '' },
  ],
  r2Templates: [
    { name: 'Default', subject: '', body: '' },
  ],
  reminderTemplates: [],
  attachments: [],
  filters: {
    country: [], state: [], industry: [], domain: [], University: [], type: [], mailSource: [],
    date_filter: false
  },
  filterLimit: 0,
  sendingOptions: { dailyLimit: 100, delayMin: Number(30), delayMax: Number(90) },
  promptSettings: { personalizeGreeting: true, improveGrammar: false, improveProfessionalism: false, aiRewrite: false, customInstruction: '' },
}

const formatReminderTemplates = (templates = []) => templates.map(({ name, body, weight }) => ({
  ...(name?.trim() ? { name: name.trim() } : {}),
  body,
  ...(weight === '' || weight === null || weight === undefined ? {} : { weight: Number(weight) }),
}))

const quillModules = {
  toolbar: [
    [{ 'size': ['10px', false, '18px', '32px'] }],
    ['bold', 'italic', 'underline', 'link'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['clean']
  ]
}

// ---- 3D animation variants (visual only) ----
// profile cards flip up one after another
const gridVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 24, rotateX: -15, transformPerspective: 1000 },
  show: {
    opacity: 1, y: 0, rotateX: 0, transformPerspective: 1000,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
}

export default function Profiles() {
  const { user, isAdmin } = useAuth()
  const reduce = useReducedMotion()
  const isPartialAdmin = user?.role === 'admin' && user?.accessLevel === 'partial'
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)
  // Own data = no employee filter selected (admin viewing their own profiles)
  const isOwnData = !selectedEmployeeId
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterCount, setFilterCount] = useState(null)
  const [isCountingFilters, setIsCountingFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('info') // info, templates, filters, sending
  const [selected, setSelected] = useState(null)
  const [testEmail, setTestEmail] = useState('')
  const [testMailType, setTestMailType] = useState('')
  const [testTemplateName, setTestTemplateName] = useState('')
  const [filterLimitError, setFilterLimitError] = useState(null)
  const [templateErrors, setTemplateErrors] = useState({})
  const [reminderTemplateErrors, setReminderTemplateErrors] = useState([])
  const [sendingErrors, setSendingErrors] = useState({})
  const [showDatePicker, setShowDatePicker] = useState(false)
  const tabBarRef = useRef(null)
  // 3D helpers: modal tab content flips in each time its tab becomes active
  const paneVariants = {
    hide: reduce ? { opacity: 0 } : { opacity: 0, rotateX: -14, y: 18 },
    show: reduce ? { opacity: 1 } : { opacity: 1, rotateX: 0, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  }
  const pane = (id, cls) => ({
    className: activeTab === id ? cls : 'hidden',
    variants: paneVariants,
    initial: false,
    animate: activeTab === id ? 'show' : 'hide',
    style: { transformPerspective: 1000, transformOrigin: 'top center' },
  })
  const btnHover = reduce ? undefined : { y: -2, rotateX: 10 }
  const tabHover = reduce ? undefined : { y: -2, rotateX: 8 }

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
  const employees = (employeesData?.data?.data || []).slice().sort((a, b) => a.name.localeCompare(b.name))

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
  const dateRangeValue = form.filters?.date_range || ''
  const customStartDate = form.filters?.start_date || ''
  const customEndDate = form.filters?.end_date || ''

  const getErrorMessage = (e, fallback = 'Failed') => {
    const data = e.response?.data;
    if (data?.message === 'Validation error' && Array.isArray(data?.data) && data.data.length > 0) {
      return data.data[0].msg || data.message;
    }
    return data?.message || fallback;
  }

  const createMut = useMutation({
    mutationFn: (d) => {
      const { employeeId, ...rest } = d;
      rest.reminderTemplates = formatReminderTemplates(rest.reminderTemplates)
      return profilesService.create(rest, employeeId || selectedEmployeeId);
    },
    onSuccess: () => { qc.invalidateQueries(['profiles']); setModal(null); toast.success('Profile created') },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to create profile')),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => {
      const { employeeId, ...rest } = d
      rest.reminderTemplates = formatReminderTemplates(rest.reminderTemplates)
      // Pass employeeId as both form data (for reassignment) and keep selectedEmployeeId for context
      return profilesService.update(id, { ...rest, employeeId: employeeId || undefined }, selectedEmployeeId)
    },
    onSuccess: () => { qc.invalidateQueries(['profiles']); setModal(null); toast.success('Profile updated') },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to update profile')),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => profilesService.delete(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['profiles']); toast.success('Deleted') },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to delete profile')),
  })
  const toggleMut = useMutation({
    mutationFn: ({ id, active }) => active ? profilesService.deactivate(id, selectedEmployeeId) : profilesService.activate(id, selectedEmployeeId),
    onSuccess: () => { qc.invalidateQueries(['profiles']); toast.success('Updated') },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to update profile status')),
  })

  const testEmailMut = useMutation({
    mutationFn: (data) => profilesService.testEmail(selected.id, data, selectedEmployeeId),
    onSuccess: (res) => { 
      const msg = [res.data?.message, res.data?.data?.message]
        .find(message => typeof message === 'string' && message.trim())
      toast.success(msg || 'Test email sent successfully')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Failed to send test email')),
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

  const fFilterLimit = (e) => {
    setForm(prev => ({ ...prev, filterLimit: e.target.value === '' ? null : Number(e.target.value) }))
    setFilterLimitError('')
  }

  const addTemplate = (field) => {
    if ((form[field] || []).length < 5) {
      setForm(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), { name: '', subject: '', body: '' }]
      }))
    }
  }

  const removeTemplate = (field, idx) => {
    if ((form[field] || []).length > 1) {
      setForm(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== idx)
      }))
      setTemplateErrors(prev => ({
        ...prev,
        [field]: (prev[field] || []).filter((_, i) => i !== idx)
      }))
    }
  }

  const updateTemplate = (templateField, idx, field, value) => {
    setForm(prev => ({
      ...prev,
      [templateField]: (prev[templateField] || []).map((t, i) => i === idx ? { ...t, [field]: value } : t)
    }))
  }

  const clearTemplateError = (templateField, idx, field) => {
    setTemplateErrors(prev => ({
      ...prev,
      [templateField]: (prev[templateField] || []).map((errors, i) =>
        i === idx ? { ...errors, [field]: undefined } : errors
      )
    }))
  }

  const renderTemplateEditor = (templateField) => {
    const templates = form[templateField] || []
    const errors = templateErrors[templateField] || []

    return (
      <>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">up to 5 templates</p>
          {templates.length < 5 && (
            <Button size="sm" variant="secondary" onClick={() => addTemplate(templateField)}>
              <Plus className="w-3 h-3" /> Add Template
            </Button>
          )}
        </div>
        {templates.map((template, idx) => (
          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">Template {idx + 1}</span>
                <span className="text-xs font-light text-gray-500">Use [name] for the client’s name</span>
              </div>
              {templates.length > 1 && (
                <button
                  onClick={() => removeTemplate(templateField, idx)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
            <Input
              placeholder="Template name"
              value={template.name}
              onChange={e => {
                updateTemplate(templateField, idx, 'name', e.target.value)
                clearTemplateError(templateField, idx, 'name')
              }}
              error={errors[idx]?.name}
            />
            <Input
              placeholder="Subject line"
              value={template.subject}
              onChange={e => {
                updateTemplate(templateField, idx, 'subject', e.target.value)
                clearTemplateError(templateField, idx, 'subject')
              }}
              error={errors[idx]?.subject}
            />
            <div className="space-y-1.5">
              <div className={`bg-white rounded-lg border overflow-hidden ${errors[idx]?.body ? 'border-red-400 focus-within:ring-2 focus-within:ring-red-100' : 'border-gray-200'}`}>
                {!!modal && (
                  <ReactQuill
                    theme="snow"
                    modules={quillModules}
                    value={template.body}
                    onChange={value => {
                      updateTemplate(templateField, idx, 'body', value)
                      clearTemplateError(templateField, idx, 'body')
                    }}
                    placeholder={`Dear [name],\n\nMail content\n\nRegards,`}
                    className="text-sm [&_.ql-container]:min-h-[140px] [&_.ql-editor]:min-h-[140px] [&_.ql-editor]:text-sm [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-container]:border-0"
                  />
                )}
              </div>
              {errors[idx]?.body && <p className="text-xs text-red-500">{errors[idx].body}</p>}
            </div>
          </div>
        ))}
      </>
    )
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
    if (form.filters?.date_filter && (
      !form.filters.date_range
      || (form.filters.date_range === 'custom' && (!form.filters.start_date || !form.filters.end_date))
    )) {
      toast.error('Please select a complete date range')
      return
    }
    const hasFilters = Object.entries(form.filters || {}).some(([key, value]) => {
      if (key === 'date_filter') return false
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'string') return value.trim().length > 0
      return value === true
    })
    if (!hasFilters) {
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
    const {
      dateRange: legacyDateRange,
      date_filter: storedDateFilter,
      date_range: storedDateRange,
      start_date: storedStartDate,
      end_date: storedEndDate,
      ...existingFilters
    } = profile.filters || {}
    const dateFilterEnabled = storedDateFilter ?? Boolean(storedDateRange || legacyDateRange)
    const existingDateRange = storedDateRange
      || (typeof legacyDateRange === 'string' ? legacyDateRange : legacyDateRange ? 'custom' : '')
    const filters = {
      ...defaultForm.filters,
      ...existingFilters,
      date_filter: dateFilterEnabled,
      ...(dateFilterEnabled && existingDateRange ? { date_range: existingDateRange } : {}),
      ...(dateFilterEnabled && existingDateRange === 'custom' && (storedStartDate || legacyDateRange?.start || legacyDateRange?.startDate)
        ? { start_date: storedStartDate || legacyDateRange?.start || legacyDateRange?.startDate }
        : {}),
      ...(dateFilterEnabled && existingDateRange === 'custom' && (storedEndDate || legacyDateRange?.end || legacyDateRange?.endDate)
        ? { end_date: storedEndDate || legacyDateRange?.end || legacyDateRange?.endDate }
        : {}),
    }
    if (profile.templates && Array.isArray(profile.templates)) {
      return {
        ...profile,
        filters,
        r1Templates: Array.isArray(profile.r1Templates) ? profile.r1Templates : defaultForm.r1Templates,
        r2Templates: Array.isArray(profile.r2Templates) ? profile.r2Templates : defaultForm.r2Templates,
        reminderTemplates: Array.isArray(profile.reminderTemplates) ? profile.reminderTemplates : [],
        attachments: profile.attachments || []
      }
    }
    return {
      ...profile,
      filters,
      templates: [{ id: 'default', name: 'Default Template', subject: profile.subject || '', body: profile.body || '', weight: 1 }],
      r1Templates: Array.isArray(profile.r1Templates) ? profile.r1Templates : defaultForm.r1Templates,
      r2Templates: Array.isArray(profile.r2Templates) ? profile.r2Templates : defaultForm.r2Templates,
      reminderTemplates: Array.isArray(profile.reminderTemplates) ? profile.reminderTemplates : [],
      attachments: profile.attachments || []
    }
  }

  const openModal = (type, profile = null) => {
    setActiveTab('info')
    setFilterCount(null)
    setShowDatePicker(false)
    setTestEmail('')
    setTestMailType('')
    setFilterLimitError('')
    setTemplateErrors({})
    setSendingErrors({})
    setReminderTemplateErrors([])
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
    const reminderErrors = (form.reminderTemplates || []).map(template => {
      const cleanBody = template.body ? template.body.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/gi, ' ').trim() : ''
      return {
        body: cleanBody ? undefined : 'Body is required',
        weight: template.weight !== '' && template.weight !== undefined && template.weight !== null && !Number.isInteger(Number(template.weight))
          ? 'Weight must be a whole number'
          : undefined,
      }
    })
    setReminderTemplateErrors(reminderErrors)
    const invalidReminderIndex = reminderErrors.findIndex(error => error.body || error.weight)
    if (invalidReminderIndex !== -1) {
      setActiveTab('reminder-templates')
      return toast.error('Please enter a body and a whole-number weight for each reminder template')
    }

    if (form.filters?.date_filter && (
      !form.filters.date_range
      || (form.filters.date_range === 'custom' && (!form.filters.start_date || !form.filters.end_date))
    )) {
      setActiveTab('filters')
      return toast.error('Please select a complete date range')
    }

    if (isAdmin(user) && modal === 'create' && !form.employeeId && !selectedEmployeeId) {
      setActiveTab('info')
      return toast.error('Please select an employee for this profile')
    }

    let firstInvalidTemplateTab = null
    const newTemplateErrors = {}
    TEMPLATE_SECTIONS.forEach(({ field, tab }) => {
      newTemplateErrors[field] = (form[field] || []).map(template => {
        const errors = {}
        if (!template.name || !template.name.trim()) errors.name = 'Name is required'
        if (!template.subject || !template.subject.trim()) errors.subject = 'Subject is required'
        const cleanBody = template.body ? template.body.replace(/<[^>]*>?/gm, '').trim() : ''
        if (!cleanBody) errors.body = 'Body is required'
        if (!firstInvalidTemplateTab && Object.keys(errors).length) firstInvalidTemplateTab = tab
        return errors
      })
    })

    if (firstInvalidTemplateTab) {
      setTemplateErrors(newTemplateErrors);
      setActiveTab(firstInvalidTemplateTab);
      return toast.error('Please fill in all template fields');
    }

    const limit = form.filterLimit ? parseInt(form.filterLimit, 10) : null;
    // console.log(limit);
    if (limit !== null && (isNaN(limit) || limit < 1)) {
      setActiveTab('filters')
      setFilterLimitError('Filter Limit must be at least 1')
      return toast.error('Filter Limit must be at least 1')
    }

    const { dailyLimit, delayMin, delayMax } = form.sendingOptions || {};
    let sErrs = {};
    let hasSendingError = false;

    if (dailyLimit === '' || dailyLimit === null || dailyLimit === undefined || dailyLimit < 1) {
      sErrs.dailyLimit = 'Required (≥1)';
      hasSendingError = true;
    }
    if (delayMin === '' || delayMin === null || delayMin === undefined || delayMin < 1) {
      sErrs.delayMin = 'Required (≥1)';
      hasSendingError = true;
    }
    if (delayMax === '' || delayMax === null || delayMax === undefined || delayMax < 1) {
      sErrs.delayMax = 'Required (≥1)';
      hasSendingError = true;
    }
    if (!sErrs.delayMax && !sErrs.delayMin && delayMax <= delayMin) {
      sErrs.delayMax = 'Must be > Min Delay';
      hasSendingError = true;
    }

    if (hasSendingError) {
      setSendingErrors(sErrs);
      setActiveTab('sending');
      return toast.error('kindly fix sending options errors');
    }

    modal === 'create' ? createMut.mutate(form) : updateMut.mutate({ id: selected.id, d: form })
  }

  return (
    <div className="space-y-5 rounded-3xl border border-white/60 bg-gradient-to-br from-sky-50 via-indigo-50/70 to-cyan-50 p-5 shadow-inner">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-sm text-gray-500">{profiles.length} profiles</p>
          {isAdmin(user) && (
            <div className="min-w-72">
              <SearchableSelect
                value={selectedEmployeeId || ''}
                onChange={val => setSelectedEmployeeId(val || null)}
                placeholder="Select Employee..."
                options={[
                  { label: 'ALL', value: '' },
                  ...employees.map(emp => ({ label: `${emp.name} — ${emp.email}`, value: emp.id }))
                ]}
              />
            </div>
          )}
          {isAdmin(user) && !employees.length && selectedEmployeeId && (
            <p className="text-xs text-gray-500">Loading employees...</p>
          )}
        </div>
          <motion.div whileHover={reduce ? undefined : { y: -3, rotateX: 8, scale: 1.04 }} style={{ transformPerspective: 600 }}>
            <Button size="sm" onClick={() => openModal('create')}>
              <Plus className="w-4 h-4" /> New Profile
            </Button>
          </motion.div>
      </div>

      {/* Profile cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : !profiles.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">No profiles yet. Create one to get started.</div>
      ) : (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {profiles.map(p => (
            <motion.div
              key={p.id}
              variants={cardVariants}
              whileHover={reduce ? undefined : { y: -6, rotateX: 4, scale: 1.01 }}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:shadow-blue-900/10 transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.profileName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{p.gmailAccount}</p>
                </div>
                <Badge label={p.isActive ? 'active' : 'inactive'} />
              </div>

              <div className="space-y-1.5 mb-4">
                <p className="text-xs text-gray-500"><span className="font-medium">D-Templates:</span> {(p.templates?.length || 1)} , <span className="font-medium">R-Templates:</span> {(p.reminderTemplates?.length || 0)}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">Daily Limit:</span> {p.sendingOptions?.dailyLimit}/day</p>
                <p className="text-xs text-gray-500"><span className="font-medium">Filter Limit:</span> {p.filterLimit > 0 ? p.filterLimit : 'Unlimited'}</p>
                <p className="text-xs text-gray-500"><span className="font-medium">Delay:</span> {p.sendingOptions?.delayMin}–{p.sendingOptions?.delayMax}s</p>
                <p className="text-xs text-gray-500"><span className="font-medium">Profile Handler:</span> {(p.employeeName || "---")}</p>
                {p.assignedAdmin != ""? (<p className="text-xs text-gray-500"><span className="font-medium">Profile Admin:</span> {(p.assignedAdmin || "---")}</p>):(<p className="text-xs text-gray-500"><span className="font-medium">Profile Admin:</span> {"-"}</p>)}
              </div>

              <div className="flex items-center gap-1 pt-3 border-t border-gray-50">
                <motion.button whileHover={btnHover} style={{ transformPerspective: 300 }} onClick={() => openModal('edit', p)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </motion.button>
                    <motion.button whileHover={btnHover} style={{ transformPerspective: 300 }} onClick={() => toggleMut.mutate({ id: p.id, active: p.isActive })} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                      {p.isActive ? <><PowerOff className="w-3.5 h-3.5" /> Deactivate</> : <><Power className="w-3.5 h-3.5" /> Activate</>}
                    </motion.button>
                    <motion.button whileHover={btnHover} style={{ transformPerspective: 300 }} onClick={() => { setDeleteTarget(p); setModal('delete') }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => {
          setModal(null)
          setTestMailType('')
          setTestTemplateName('')
        }}
        title={modal === 'create' ? 'Create Profile' : 'Edit Profile'}
        size="lg"
        className="h-[90vh]"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col">

          {/* ── Tab Bar ── */}
          <div className="mb-5 flex min-w-0 shrink-0 items-center gap-1 border-b border-gray-200">
            <button
              type="button"
              aria-label="Scroll tabs left"
              onClick={() => tabBarRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}
              className="bg-blue-300 shrink-0 rounded-md p-2 text-black font-bold hover:bg-blue-200 hover:text-gray-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div
              ref={tabBarRef}
              className="flex min-w-0 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {TABS.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={tabHover}
                    style={{ transformPerspective: 400 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${isActive
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </motion.button>
                )
              })}
            </div>
            <button
              type="button"
              aria-label="Scroll tabs right"
              onClick={() => tabBarRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}
              className="bg-blue-300 shrink-0 rounded-md p-2 text-black font-bold hover:bg-blue-200 hover:text-gray-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* ── Tab Content ── */}
          <div className="min-h-0 flex-1 overflow-y-auto space-y-4">

            {/* INFO TAB */}
            <motion.div {...pane('info', 'space-y-4')}>
              {isAdmin(user) && (
                <SearchableSelect
                  label={modal === 'edit' ? 'Employee (reassign)' : 'Employee'}
                  value={form.employeeId || ''}
                  onChange={(val) => setForm(prev => ({ ...prev, employeeId: val }))}
                  placeholder={modal === 'edit' ? 'Keep current employee...' : 'Select Employee...'}
                  options={employees.map(emp => ({ label: `${emp.name} — ${emp.email}`, value: emp.id }))}
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Profile Name" value={form.profileName || ''} onChange={f('profileName')} placeholder="e.g. Empoyee Name - Profile Name" />
                {/* {availableEmailAccounts.length > 0 ? (
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
                ) : ( */}
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
                {/* )} */}
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
            </motion.div>

            {/* TEMPLATE TABS */}
            {TEMPLATE_SECTIONS.map(({ field, tab }) => (
              <motion.div key={tab} {...pane(tab, 'space-y-4')}>
                {renderTemplateEditor(field)}
              </motion.div>
            ))}

            <motion.div {...pane('reminder-templates', 'space-y-4')}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Reminder Templates</h3>
                  {/* <p className="text-xs text-gray-500">Reminder campaigns randomly select a weighted template body; no subject needed.</p> */}
                </div>
                {(form.reminderTemplates || []).length < 5 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      reminderTemplates: [...(prev.reminderTemplates || []), { name: '', body: '', weight: 1 }]
                    }))}
                  >
                    <Plus className="w-3 h-3" /> Add Template
                  </Button>
                )}
              </div>
              {(form.reminderTemplates || []).length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                  No reminder templates configured. Add at least one to use Reminder campaigns.
                </p>
              )}
              {(form.reminderTemplates || []).map((template, idx) => (
                <div key={idx} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Reminder Template {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          reminderTemplates: prev.reminderTemplates.filter((_, i) => i !== idx)
                        }))
                        setReminderTemplateErrors(prev => prev.filter((_, i) => i !== idx))
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" /> Remove
                    </button>
                  </div>
                  <Input
                    label="Name (optional)"
                    value={template.name || ''}
                    onChange={e => setForm(prev => ({
                      ...prev,
                      reminderTemplates: prev.reminderTemplates.map((item, i) => i === idx ? { ...item, name: e.target.value } : item)
                    }))}
                    placeholder="e.g. Friendly follow-up"
                  />
                  {/* <Input
                    label="Weight"
                    type="number"
                    step="1"
                    min="1"
                    max="3"
                    value={template.weight ?? 1}
                    onChange={e => setForm(prev => ({
                      ...prev,
                      reminderTemplates: prev.reminderTemplates.map((item, i) => i === idx
                        ? { ...item, weight: e.target.value === '' ? '' : Number(e.target.value) }
                        : item)
                    }))}
                    error={reminderTemplateErrors[idx]?.weight}
                  /> */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700">Body</label>
                    <div className={`overflow-hidden rounded-lg border bg-white ${reminderTemplateErrors[idx]?.body ? 'border-red-400' : 'border-gray-200'}`}>
                      {!!modal && (
                        <ReactQuill
                          theme="snow"
                          modules={quillModules}
                          value={template.body || ''}
                          onChange={value => {
                            setForm(prev => ({
                              ...prev,
                              reminderTemplates: prev.reminderTemplates.map((item, i) => i === idx ? { ...item, body: value } : item)
                            }))
                            setReminderTemplateErrors(prev => prev.map((error, i) => i === idx ? { ...error, body: undefined } : error))
                          }}
                          placeholder={`Dear [name],\n\nMail content\n\nRegards,`}
                          className="text-sm [&_.ql-container]:min-h-[140px] [&_.ql-editor]:min-h-[140px] [&_.ql-editor]:text-sm [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b"
                        />
                      )}
                    </div>
                    {reminderTemplateErrors[idx]?.body && <p className="text-xs text-red-500">{reminderTemplateErrors[idx].body}</p>}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* FILTERS TAB */}
            <motion.div {...pane('filters', 'space-y-4')}>
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
                {/* <MultiSelect
                  label="Domain Group"
                  value={form.filters?.domainGroup || []}
                  onChange={val => fFilterMulti('domainGroup')(val)}
                  options={(dropdownOptions.domainGroups || []).map(d => ({ label: d, value: d }))}
                  placeholder="Select domain groups..."
                /> */}
                {/* <MultiSelect
                  label="Industries"
                  value={form.filters?.industry || []}
                  onChange={val => fFilterMulti('industry')(val)}
                  options={(dropdownOptions.industries || []).map(i => ({ label: i, value: i }))}
                  placeholder="Select industries..."
                /> */}
                <MultiSelect
                  label="Universities"
                  value={form.filters?.university || []}
                  onChange={val => fFilterMulti('university')(val)}
                  options={(dropdownOptions.university || []).map(c => ({ label: c, value: c }))}
                  placeholder="Select universities..."
                />
                <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.filters?.date_filter}
                    onChange={e => {
                      const enabled = e.target.checked
                      setForm(f => {
                        const { date_range, start_date, end_date, ...filters } = f.filters
                        return { ...f, filters: { ...filters, date_filter: enabled } }
                      })
                      if (!enabled) setShowDatePicker(false)
                    }}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  <span>Filter by date range</span>
                </label>
                {form.filters?.date_filter && (
                  <>
                    <SearchableSelect
                      label="Date Range"
                      value={dateRangeValue}
                      onChange={val => setForm(f => {
                        const { start_date, end_date, ...filters } = f.filters
                        return {
                          ...f,
                          filters: {
                            ...filters,
                            date_filter: true,
                            ...(val ? { date_range: val } : {})
                          }
                        }
                      })}
                      options={dateRange.map(s => ({ label: s.label, value: s.value }))}
                      placeholder="Select dates range"
                    />
                    {dateRangeValue === 'custom' && (
                      <div className="min-w-[200px] relative mt-2">
                        <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Date Range</label>
                        <div
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer flex items-center justify-between hover:border-primary/50 transition-colors h-[38px]"
                          onClick={() => setShowDatePicker(!showDatePicker)}
                        >
                          <span>
                            {customStartDate && customEndDate
                              ? `${customStartDate} - ${customEndDate}`
                              : customStartDate
                                ? `${customStartDate} - Select end date`
                                : 'Select Date Range'}
                          </span>
                          <Calendar className="w-4 h-4 text-gray-400" />
                        </div>
                        {showDatePicker && (
                          <div className="absolute top-full right-0 mt-2 z-50">
                            <DateRangePicker
                              startDate={customStartDate}
                              endDate={customEndDate}
                              onChange={(dates) => {
                                setForm(f => {
                                  const { start_date, end_date, ...filters } = f.filters
                                  return {
                                    ...f,
                                    filters: {
                                      ...filters,
                                      date_filter: true,
                                      date_range: 'custom',
                                      ...(dates.start ? { start_date: dates.start } : {}),
                                      ...(dates.end ? { end_date: dates.end } : {})
                                    }
                                  }
                                })
                                if (dates.start && dates.end) setShowDatePicker(false)
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <Input
                label="Filter Limit"
                type="number"
                value={form.filterLimit}
                onChange={fFilterLimit}
                placeholder="Max emails to fetch from filtered results"
                
              // error={filterLimitError || ((form.filterLimit !== '' && form.filterLimit !== undefined && (parseInt(form.filterLimit, 10) < 1)) ? "Limit must be at least 1" : undefined)}
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
                <label className="block text-xs font-semibold text-gray-600">Mail Source
                  <span className="text-red-400 text-xs ml-1">{"(Leave unchecked to include all sources)"}</span>
                </label>
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
                {/* <p className="text-xs text-gray-400">Leave unchecked to include all sources</p> */}
              </div>

              <p className="text-xs text-gray-400">Separate multiple values with commas.</p>
            </motion.div>

            {/* SENDING OPTIONS TAB */}
            <motion.div {...pane('sending', 'space-y-5')}>
              <p className="text-sm text-gray-500">Configure rate limits and delays for this profile.</p>

              <div className="grid grid-cols-3 gap-4">
                <motion.div whileHover={reduce ? undefined : { y: -4 }} className={`border ${sendingErrors?.dailyLimit ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl p-4 space-y-2 hover:bg-white hover:shadow-lg transition-colors`}>
                  <p className={`text-xs font-semibold ${sendingErrors?.dailyLimit ? 'text-red-500' : 'text-gray-500'} uppercase tracking-wide text-center`}>Daily Limit</p>
                  <Input type="number" value={form.sendingOptions?.dailyLimit} onChange={(e) => { fNum('sendingOptions', 'dailyLimit')(e); setSendingErrors(p => ({...p, dailyLimit: null})) }} required error={sendingErrors?.dailyLimit} />
                  <p className="text-xs text-gray-400 text-center">emails / day</p>
                </motion.div>
                <motion.div whileHover={reduce ? undefined : { y: -4 }} className={`border ${sendingErrors?.delayMin ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl p-4 space-y-2 hover:bg-white hover:shadow-lg transition-colors`}>
                  <p className={`text-xs font-semibold ${sendingErrors?.delayMin ? 'text-red-500' : 'text-gray-500'} uppercase tracking-wide text-center`}>Min Delay</p>
                  <Input type="number" value={form.sendingOptions?.delayMin} onChange={(e) => { fNum('sendingOptions', 'delayMin')(e); setSendingErrors(p => ({...p, delayMin: null, delayMax: null})) }} min={1} required error={sendingErrors?.delayMin} />
                  <p className="text-xs text-gray-400 text-center">seconds</p>
                </motion.div>
                <motion.div whileHover={reduce ? undefined : { y: -4 }} className={`border ${sendingErrors?.delayMax ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'} rounded-xl p-4 space-y-2 hover:bg-white hover:shadow-lg transition-colors`}>
                  <p className={`text-xs font-semibold ${sendingErrors?.delayMax ? 'text-red-500' : 'text-gray-500'} uppercase tracking-wide text-center`}>Max Delay</p>
                  <Input type="number" value={form.sendingOptions?.delayMax} min={form.sendingOptions?.delayMin + 10} onChange={(e) => { fNum('sendingOptions', 'delayMax')(e); setSendingErrors(p => ({...p, delayMax: null})) }} required error={sendingErrors?.delayMax} />
                  <p className="text-xs text-gray-400 text-center">seconds</p>
                </motion.div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                <strong>Tip:</strong> A random delay between Min and Max is used between each email to avoid spam filters.
              </div>
            </motion.div>

            {/* TEST TAB */}
            <motion.div {...pane('test', 'space-y-5')}>
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
                    <label htmlFor="test-mail-type" className="block text-sm font-medium text-gray-700 mb-1">Mail Type *</label>
                    <select
                      id="test-mail-type"
                      required
                      className="w-full h-[42px] px-3 border border-gray-300 rounded-lg shadow-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                      value={testMailType}
                      onChange={(e) => {
                        setTestMailType(e.target.value)
                        setTestTemplateName('')
                      }}
                    >
                      <option value="">Select Mail Type...</option>
                      <option value="draft">Draft</option>
                      <option value="reminder">Reminder</option>
                    </select>
                  </div>
                  {testMailType && (
                    <div>
                      <label htmlFor="test-template" className="block text-sm font-medium text-gray-700 mb-1">
                        {testMailType === 'draft' ? 'D-Templates' : 'R-Templates'} (Optional)
                      </label>
                      <select
                        id="test-template"
                        className="w-full h-[42px] px-3 border border-gray-300 rounded-lg shadow-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                        value={testTemplateName}
                        onChange={(e) => setTestTemplateName(e.target.value)}
                      >
                        <option value="">Select Template...</option>
                        {(testMailType === 'draft' ? selected?.templates : selected?.reminderTemplates)?.map((_, idx) => (
                          <option key={idx} value={idx.toString()}>{idx + 1}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <Button 
                      onClick={() => {
                        if (!testEmail) return toast.error('Please enter an email address')
                        if (!testMailType) return toast.error('Please select a mail type')
                        const payload = { toEmail: testEmail, mailType: testMailType }
                        if (testTemplateName) {
                          payload.templateId = testTemplateName
                        }
                        testEmailMut.mutate(payload)
                      }}
                      loading={testEmailMut.isPending}
                      disabled={!testEmail}
                    >
                      Send Test Email
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Footer ── */}
          <div className="mt-4 flex shrink-0 items-center justify-between border-t border-gray-200 pt-4">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="md"
                className="w-10 px-0 hover:bg-blue-200"
                aria-label="Previous tab"
                title="Previous tab"
                onClick={() => {
                  const currentIndex = TABS.findIndex(tab => tab.id === activeTab)
                  if (currentIndex > 0) setActiveTab(TABS[currentIndex - 1].id)
                }}
                disabled={activeTab === TABS[0].id}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
               <Button
                variant="secondary"
                className="w-10 px-0 hover:bg-blue-200"
                aria-label="Next tab"
                title="Next tab"
                onClick={() => {
                  const currentIndex = TABS.findIndex(tab => tab.id === activeTab)
                  if (currentIndex < TABS.length - 1) setActiveTab(TABS[currentIndex + 1].id)
                }}
                disabled={activeTab === TABS[TABS.length - 1].id}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {/* <div className="flex gap-1.5">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-2 h-2 rounded-full transition-all ${activeTab === tab.id ? 'bg-primary-600 w-4' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  title={tab.label}
                />
              ))}
              </div> */}
            </div>
            <div className="flex gap-2">
             
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={handleSave} loading={createMut.isPending || updateMut.isPending} disabled={isPartialAdmin && !isOwnData}>
                Confirm
              </Button>
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
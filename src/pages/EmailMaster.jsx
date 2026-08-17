import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { emailMasterService } from '../services/emailMaster.service'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import SearchableSelect from '../components/ui/SearchableSelect'
import { Upload, RefreshCw, Trash2, Users, ChevronLeft, ChevronRight, Search, Download, ChevronUp, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { dashboardService } from '../services/dashboard.service'

export default function EmailMaster() {
  const { user, isAdmin } = useAuth()
  const qc = useQueryClient()
  const fileRef = useRef()
  const [maxLimit, setMaxLimit] = useState('')
  const [mailSourceUpload, setMailSourceUpload] = useState('')   // selected during upload
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [countryFilter, setCountryFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [universityFilter, setuniversityFilter] = useState('')
  const [uploaderFilter, setUploaderFilter] = useState('')
  const [mailSourceFilter, setMailSourceFilter] = useState('')
  const [includeDuplicates, setIncludeDuplicates] = useState(true)
  const [activeTab, setActiveTab] = useState(isAdmin(user) ? 'table' : 'upload') // default tab based on role

  // History Tab States
  const [historyPreset, setHistoryPreset] = useState('last_7_days')
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [historyEmployee, setHistoryEmployee] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(20)
  const [historySortField, setHistorySortField] = useState(null)
  const [historySortOrder, setHistorySortOrder] = useState('desc')
  // Upload Wizard States
  const [uploadStep, setUploadStep] = useState(1)
  const [workbook, setWorkbook] = useState(null)
  const [selectedSheet, setSelectedSheet] = useState('')
  const [fileHeaders, setFileHeaders] = useState([])
  const [columnMapping, setColumnMapping] = useState({})
  const [uploadSummary, setUploadSummary] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const STANDARD_FIELDS = ['Email', 'Full Name', 'University', 'Country', 'State', 'City', 'Industry', 'Designation', 'Domain', 'Phone', 'Website', 'LinkedIn', 'Citation']

  const { data, isLoading } = useQuery({
    queryKey: ['email-master', page, pageSize, search, countryFilter, stateFilter, domainFilter, industryFilter, universityFilter, uploaderFilter, mailSourceFilter, includeDuplicates],
    queryFn: () => emailMasterService.list({
      page,
      pageSize,
      search: search || undefined,
      country: countryFilter || undefined,
      state: stateFilter || undefined,
      domain: domainFilter || undefined,
      industry: industryFilter || undefined,
      university: universityFilter || undefined,
      uploadedBy: uploaderFilter || undefined,
      mailSource: mailSourceFilter || undefined,
      includeDuplicates,
    }),
  })

  const rawData = data?.data?.data
  const records = rawData?.data ?? (Array.isArray(rawData) ? rawData : [])
  const total = rawData?.total ?? 0
  const totalPages = rawData?.totalPages ?? 1
  const options = data?.data?.options || {}

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['email-master-stats'],
    queryFn: () => emailMasterService.getUploaderStats(),
    enabled: total > 0 && isAdmin(user),
    retry: 0,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['upload-history', historyPreset, historyEmployee, historyStartDate, historyEndDate, historyPage, historyPageSize],
    queryFn: () => dashboardService.uploadHistory({
      preset: historyPreset,
      employeeId: historyEmployee || undefined,
      startDate: historyPreset === 'custom' ? historyStartDate : undefined,
      endDate: historyPreset === 'custom' ? historyEndDate : undefined,
      page: historyPage,
      limit: historyPageSize
    }),
    enabled: activeTab === 'history' && isAdmin(user),
    retry: 0,
  })

  const responseData = historyData?.data || {}
  const rawLogs = responseData.records || responseData.data?.records || []
  console.log("UPLOAD HISTORY RESPONSE:", responseData)
  let historyLogs = Array.isArray(rawLogs) ? [...rawLogs] : []

  if (historySortField) {
    historyLogs.sort((a, b) => {
      let valA = a[historySortField] || 0
      let valB = b[historySortField] || 0
      if (historySortOrder === 'asc') return valA - valB
      return valB - valA
    })
  }
  const historyPagination = responseData.pagination || responseData.data?.pagination || { page: 1, total: 0, total_pages: 1 }
  const historyTotal = historyPagination.total || 0
  const historyTotalPages = historyPagination.total_pages || 1
  const historySummary = responseData.totals || responseData.data?.totals || {
    totalUploads: 0,
    totalUnique: 0,
    totalDuplicate: 0,
    totalInvalid: 0
  }

  const uploaders = options.uploaders || []
  const countries = options.countries || []
  const states = options.states || []
  const domains = options.domains || []
  const industries = options.industries || []
  const companies = options.companies || []
  const mailSources = options.mailSources || []

  const uploadMut = useMutation({
    mutationFn: ({ file, max, source }) => emailMasterService.upload(file, max || undefined, source || undefined),
    onSuccess: (r) => {
      qc.invalidateQueries(['email-master'])
      setUploadSummary(r.data)
      setUploadStep(3)
      toast.success(r.data?.message || 'Upload successful')
      if (fileRef.current) fileRef.current.value = ''
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Upload failed')
    },
    onSettled: () => {
      setIsProcessing(false)
    }
  })

  const deleteMut = useMutation({
    mutationFn: (id) => emailMasterService.deleteEmail(id),
    onSuccess: () => {
      qc.invalidateQueries(['email-master'])
      toast.success('Email deleted')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Delete failed'),
  })

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!mailSourceUpload) {
      toast.error('Please select a Mail Source before uploading')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    try {
      setIsProcessing(true)
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      setWorkbook(wb)
      setUploadedFile(file)

      const sheetName = wb.SheetNames[0]
      setSelectedSheet(sheetName)

      const ws = wb.Sheets[sheetName]
      const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || []
      setFileHeaders(headers.filter(Boolean).map(String))

      // Auto-map if possible
      const initialMap = {}
      STANDARD_FIELDS.forEach(sf => {
        const match = headers.find(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, '') === sf.toLowerCase().replace(/[^a-z0-9]/g, ''))
        if (match) initialMap[sf] = String(match)
      })
      setColumnMapping(initialMap)
      setUploadStep(2)
    } catch (err) {
      toast.error('Failed to parse file')
      console.error(err)
    } finally {
      setIsProcessing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleProcessAndUpload = () => {
    if (!columnMapping['Email']) {
      toast.error('Email field must be mapped')
      return
    }

    setIsProcessing(true)
    setTimeout(() => {
      try {
        const ws = workbook.Sheets[selectedSheet]
        const rawData = XLSX.utils.sheet_to_json(ws)

        const mappedData = rawData.map(row => {
          const newRow = {}
          STANDARD_FIELDS.forEach(sf => {
            const mappedHeader = columnMapping[sf]
            if (mappedHeader && row[mappedHeader] !== undefined && row[mappedHeader] !== null) {
              newRow[sf] = String(row[mappedHeader]).trim()
            }
          })
          return newRow
        }).filter(row => row['Email']) // Drop rows without email

        if (mappedData.length === 0) {
          toast.error('No valid rows with emails found')
          setIsProcessing(false)
          return
        }

        const newWs = XLSX.utils.json_to_sheet(mappedData, { header: STANDARD_FIELDS })
        const csvString = XLSX.utils.sheet_to_csv(newWs)
        const newFile = new File([csvString], uploadedFile.name.replace(/\.[^/.]+$/, "") + "_mapped.csv", { type: 'text/csv' })

        uploadMut.mutate({ file: newFile, max: maxLimit ? Number(maxLimit) : undefined, source: mailSourceUpload })
      } catch (err) {
        toast.error('Error processing mapped data')
        console.error(err)
        setIsProcessing(false)
      }
    }, 100)
  }

  const handleDownloadSample = () => {
    const sampleData = [{
      'Email': 'sample@example.com',
      'Full Name': 'John Doe',
      'University': 'Sample University',
      'Country': 'USA',
      'State': 'CA',
      'City': 'San Francisco',
      'Industry': 'Technology',
      'Designation': 'Engineer',
      'Domain': 'example.com',
      'Phone': '1234567890',
      'Website': 'https://example.com',
      'LinkedIn': 'https://linkedin.com/in/sample',
      'Citation': ''
    }]
    const ws = XLSX.utils.json_to_sheet(sampleData, { header: STANDARD_FIELDS })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sample')
    XLSX.writeFile(wb, 'sample_emails.xlsx')
  }

  const stats = statsData?.data?.stats || []

  const columns = [
    { key: 'sno', label: 'S.No', sortable: false, render: (_, __, i) => i + 1 + (page - 1) * pageSize },
    { key: 'fullName', label: 'Full Name', render: v => v || '—' },
    { key: 'email', label: 'Email', render: v => <span className="font-medium text-blue-600">{v}</span> },
    { key: 'university', label: 'University', render: v => v || '—' },
    {
      key: 'website', label: 'Website',
      render: v => v
        ? <a href={v.startsWith('http') ? v : `https://${v}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline truncate max-w-[120px] block">{v}</a>
        : '—'
    },
    { key: 'country', label: 'Country', render: v => v || '—' },
    { key: 'state', label: 'State', render: v => v || '—' },
    { key: 'city', label: 'City', render: v => v || '—' },
    { key: 'domain', label: 'Domain', render: v => v || '—' },
    { key: 'industry', label: 'Industry', render: v => v || '—' },
    { key: 'designation', label: 'Designation', render: v => v || '—' },
    { key: 'phone', label: 'Phone', render: v => v || '—' },
    {
      key: 'linkedin', label: 'LinkedIn',
      render: v => v
        ? <a href={v.startsWith('http') ? v : `https://${v}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline">Profile</a>
        : '—'
    },
    {
      key: 'mailSource', label: 'Mail Source', render: v => v
        ? <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{v}</span>
        : '—'
    },
    {
      key: 'inProfileEmails', label: 'In Profile',
      render: v => <Badge label={v ? 'Yes' : 'No'} />
    },
    {
      key: 'usageCount', label: 'Usage Count',
      render: v => <span className="text-xs text-gray-600 font-medium">{v || 0}</span>
    },
    {
      key: 'usedByEmployeeNames', label: 'Used By Employees',
      render: v => <span className="text-xs text-gray-600">{(v && v.length > 0) ? v.join(', ') : '—'}</span>
    },
    {
      key: 'uploadedByName', label: 'Uploaded By',
      render: v => <span className="text-xs text-gray-600">{v || '—'}</span>
    },
    {
      key: 'uploadedDate', label: 'Upload Date',
      render: v => v ? format(new Date(v), 'MMM d, yyyy') : '—'
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button
          onClick={() => setDeleteTarget(row)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ]

  const handleHistorySort = (field) => {
    if (historySortField === field) {
      setHistorySortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setHistorySortField(field)
      setHistorySortOrder('desc')
    }
  }

  const renderHistorySortHeader = (title, field) => (
    <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleHistorySort(field)}>
      <span>{title}</span>
      <div className="flex flex-col text-[8px] opacity-50">
        <ChevronUp className={`w-3 h-3 -mb-1 ${historySortField === field && historySortOrder === 'asc' ? 'text-primary-600 opacity-100' : ''}`} />
        <ChevronDown className={`w-3 h-3 ${historySortField === field && historySortOrder === 'desc' ? 'text-primary-600 opacity-100' : ''}`} />
      </div>
    </div>
  )

  const historyColumns = [
    { key: 'sno', label: 'S.No', render: (_, __, i) => <span className="text-gray-400 font-medium">{i + 1 + (historyPage - 1) * historyPageSize}</span> },
    { key: 'employeeName', label: 'Employee', render: v => <span className="font-medium text-gray-900">{v || 'Unknown'}</span> },
    { key: 'employeeEmail', label: 'Email', render: v => <span className="text-gray-500">{v || '—'}</span> },
    { key: 'date', label: 'Date', render: v => { if (!v) return '—'; const d = String(v).split('T')[0]; return <span className="text-gray-500">{format(new Date(d + 'T00:00:00'), 'MMM d, yyyy')}</span> } },
    { key: 'uploadCount', label: renderHistorySortHeader('Total Uploaded', 'uploadCount'), render: v => <span className="font-semibold text-gray-900">{(v || 0).toLocaleString()}</span> },
    { key: 'uniqueCount', label: renderHistorySortHeader('Unique', 'uniqueCount'), render: v => <span className="font-medium text-emerald-600">{(v || 0).toLocaleString()}</span> },
    { key: 'duplicateCount', label: renderHistorySortHeader('Duplicate', 'duplicateCount'), render: v => <span className="font-medium text-amber-500">{(v || 0).toLocaleString()}</span> },
    { key: 'invalidCount', label: renderHistorySortHeader('Invalid', 'invalidCount'), render: v => <span className="font-medium text-red-500">{(v || 0).toLocaleString()}</span> },
  ]

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl w-fit border border-gray-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'upload'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
        >
          Upload File
        </button>
        {isAdmin(user) && (
          <>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'table'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
            >
              Show Table
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'history'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
            >
              History
            </button>
          </>
        )}
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">

            {uploadStep === 1 && (
              <>
                <h3 className="font-semibold text-gray-800 mb-4">Step 1: Upload Emails (Global DB)</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-44">
                    <Select
                      label="Mail Source *"
                      value={mailSourceUpload}
                      onChange={e => setMailSourceUpload(e.target.value)}
                    >
                      <option value="">-- Select Source --</option>
                      <option value="Google Scholar">Google Scholar</option>
                      <option value="University">University</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>

                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
                  <div className="flex gap-3">
                    <Button onClick={() => fileRef.current.click()} loading={isProcessing} disabled={!mailSourceUpload}>
                      <Upload className="w-4 h-4" />
                      {isProcessing ? 'Processing...' : 'Select File'}
                    </Button>
                    <Button variant="secondary" onClick={handleDownloadSample}>
                      <Download className="w-4 h-4" />
                      Download Sample
                    </Button>
                  </div>
                </div>
              </>
            )}

            {uploadStep === 2 && (
              <>
                <h3 className="font-semibold text-gray-800 mb-4">Step 2: Map Columns</h3>
                {workbook && workbook.SheetNames.length > 1 && (
                  <div className="mb-4 w-64">
                    <Select label="Select Sheet" value={selectedSheet} onChange={e => {
                      const sn = e.target.value
                      setSelectedSheet(sn)
                      const ws = workbook.Sheets[sn]
                      const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || []
                      setFileHeaders(headers.filter(Boolean).map(String))
                    }}>
                      {workbook.SheetNames.map(sn => <option key={sn} value={sn}>{sn}</option>)}
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {STANDARD_FIELDS.map(sf => (
                    <div key={sf} className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg">
                      <span className="w-32 font-medium text-sm text-gray-700">{sf} {sf === 'Email' && <span className="text-red-500">*</span>}</span>
                      <Select
                        value={columnMapping[sf] || ''}
                        onChange={e => setColumnMapping(prev => ({ ...prev, [sf]: e.target.value }))}
                      >
                        <option value="">-- Ignore --</option>
                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => { setUploadStep(1); setUploadedFile(null); setWorkbook(null) }}>Cancel</Button>
                  <Button loading={isProcessing || uploadMut.isPending} onClick={handleProcessAndUpload}>Process & Upload</Button>
                </div>
              </>
            )}

            {uploadStep === 3 && uploadSummary && (
              <>
                <h3 className="font-semibold text-gray-800 mb-4">Step 3: Upload Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-blue-600 text-sm font-medium">Total Uploaded</p>
                    <p className="text-2xl font-bold text-blue-900">{uploadSummary.data?.totalUploaded || 0}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <p className="text-green-600 text-sm font-medium">Unique</p>
                    <p className="text-2xl font-bold text-green-900">{uploadSummary.data?.unique || 0}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-amber-600 text-sm font-medium">Duplicate</p>
                    <p className="text-2xl font-bold text-amber-900">{uploadSummary.data?.duplicate || 0}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-red-600 text-sm font-medium">Failed</p>
                    <p className="text-2xl font-bold text-red-900">{uploadSummary.data?.failed || 0}</p>
                  </div>
                </div>
                <Button onClick={() => { setUploadStep(1); setUploadSummary(null); setUploadedFile(null); setWorkbook(null); setMailSourceUpload(''); }}>Start New Upload</Button>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && isAdmin(user) && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-indigo-600" />
                Upload History
              </h2>
              <p className="text-gray-500 mt-1">Track email uploads from active employees.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={historyEmployee} onChange={e => setHistoryEmployee(e.target.value)} className="w-48 bg-white">
                <option value="">All Employees</option>
                {(responseData.employees || responseData.data?.employees || uploaders).map(u => <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>)}
              </Select>

              <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                {['today', 'last_7_days', 'last_month', 'custom'].map(p => (
                  <button
                    key={p}
                    onClick={() => setHistoryPreset(p)}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${historyPreset === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {p === 'today' ? 'Today' : p === 'last_7_days' ? 'Last 7 Days' : p === 'last_month' ? 'Last Month' : 'Custom'}
                  </button>
                ))}
              </div>

              {historyPreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={historyStartDate}
                    max={historyEndDate || undefined}
                    onChange={e => setHistoryStartDate(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-gray-400 text-sm">to</span>
                  <input
                    type="date"
                    value={historyEndDate}
                    min={historyStartDate || undefined}
                    onChange={e => setHistoryEndDate(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Uploaded</p>
                <p className="text-2xl font-bold text-gray-900">{historySummary.totalUploads?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Unique</p>
                <p className="text-2xl font-bold text-gray-900">{historySummary.totalUnique?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Duplicate</p>
                <p className="text-2xl font-bold text-gray-900">{historySummary.totalDuplicate?.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Invalid</p>
                <p className="text-2xl font-bold text-gray-900">{historySummary.totalInvalid?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" /> Upload Log
              </h3>
            </div>

            <Table
              columns={historyColumns}
              data={historyLogs}
              loading={historyLoading}
              emptyMsg="No upload logs found"
              wrapperClassName="overflow-auto bg-white max-h-[500px]"
            />
            {/* Pagination Footer for History */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-white">
              <div>
                Showing <span className="font-medium text-gray-900">{historyTotal > 0 ? (historyPage - 1) * historyPageSize + 1 : 0}-{Math.min(historyPage * historyPageSize, historyTotal)}</span> of <span className="font-medium text-gray-900">{historyTotal}</span> logs
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span>Show:</span>
                  <select
                    value={historyPageSize}
                    onChange={e => { setHistoryPageSize(Number(e.target.value)); setHistoryPage(1) }}
                    className="border border-gray-200 rounded-md py-1 px-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                    disabled={historyPage === 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Page {historyPage} of {historyTotalPages}</span>
                  <button
                    onClick={() => setHistoryPage(Math.min(historyTotalPages, historyPage + 1))}
                    disabled={historyPage === historyTotalPages}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'table' && isAdmin(user) && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-gray-700">Filters</p>
              {(countryFilter || stateFilter || domainFilter || industryFilter || uploaderFilter || mailSourceFilter) && (
                <button
                  onClick={() => {
                    setCountryFilter('')
                    setStateFilter('')
                    setDomainFilter('')
                    setIndustryFilter('')
                    setUploaderFilter('')
                    setMailSourceFilter('')
                    setPage(1)
                  }}
                  className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline transition-all cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* The search is now in the table header */}
              <SearchableSelect
                label="Country"
                value={countryFilter}
                onChange={val => { setCountryFilter(val); setPage(1) }}
                options={[
                  { label: 'All Countries', value: '' },
                  ...countries.map(c => ({ label: c, value: c }))
                ]}
                placeholder="All Countries"
              />
              <SearchableSelect
                label="State"
                value={stateFilter}
                onChange={val => { setStateFilter(val); setPage(1) }}
                options={[
                  { label: 'All States', value: '' },
                  ...states.map(s => ({ label: s, value: s }))
                ]}
                placeholder="All States"
              />
              <SearchableSelect
                label="Domain"
                value={domainFilter}
                onChange={val => { setDomainFilter(val); setPage(1) }}
                options={[
                  { label: 'All Domains', value: '' },
                  ...domains.map(d => ({ label: d, value: d }))
                ]}
                placeholder="All Domains"
              />
              <SearchableSelect
                label="Industry"
                value={industryFilter}
                onChange={val => { setIndustryFilter(val); setPage(1) }}
                options={[
                  { label: 'All Industries', value: '' },
                  ...industries.map(i => ({ label: i, value: i }))
                ]}
                placeholder="All Industries"
              />
              <SearchableSelect
                label="Uploader"
                value={uploaderFilter}
                onChange={val => { setUploaderFilter(val); setPage(1) }}
                options={[
                  { label: 'All Uploaders', value: '' },
                  ...uploaders.map(u => ({ label: u.name, value: u.id }))
                ]}
                placeholder="All Uploaders"
              />
              <SearchableSelect
                label="Mail Source"
                value={mailSourceFilter}
                onChange={val => { setMailSourceFilter(val); setPage(1) }}
                options={[
                  { label: 'All Sources', value: '' },
                  { label: 'Google Scholar', value: 'Google Scholar' },
                  { label: 'University', value: 'University' },
                  { label: 'Other', value: 'Other' },
                  ...mailSources
                    .filter(s => !['Google Scholar', 'University', 'Other'].includes(s))
                    .map(s => ({ label: s, value: s }))
                ]}
                placeholder="All Sources"
              />
            </div>
          </div>

          {/* Results Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Combined Header */}
            <div className="p-4 border-b border-gray-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white text-sm text-gray-500">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search records..."
                    className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                  />
                </div>
                <div>
                  Showing <span className="font-medium text-gray-900">{total > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-gray-900">{total}</span> records
                </div>
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span>Show:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                    className="border border-gray-200 rounded-md py-1 px-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <Table columns={columns} data={records} loading={isLoading} emptyMsg="No emails found" wrapperClassName="overflow-auto bg-white max-h-[calc(100vh-320px)]" />
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete the email <strong>{deleteTarget?.email}</strong>?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={() => { deleteMut.mutate(deleteTarget?.id); setDeleteTarget(null); }} loading={deleteMut.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emailMasterService } from '../services/emailMaster.service'
import Input from '../components/ui/Input'
import SearchableSelect from '../components/ui/SearchableSelect'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import DateRangePicker from '../components/ui/DateRangePicker'
import { Send, CheckCircle2, Edit, Trash2, Search, ChevronLeft, ChevronRight, X, Filter, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'

export default function ProfileReplies() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [formData, setFormData] = useState({
    email: '',
    reason: 'replied',
    customReason: ''
  })
  const [editId, setEditId] = useState(null)
  const [replyToDelete, setReplyToDelete] = useState(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')

  const [filters, setFilters] = useState({
    reason: '',
    replyMarkedByName: '',
    updatedTime: '',
    updatedStartDate: '',
    updatedEndDate: ''
  })
  
  const [appliedFilters, setAppliedFilters] = useState({ ...filters })

  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters })
    setPage(1)
  }

  const handleClearFilters = () => {
    const empty = { reason: '', replyMarkedByName: '', updatedTime: '', updatedStartDate: '', updatedEndDate: '' }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['email-master-replies', page, pageSize, search, appliedFilters],
    queryFn: () => {
      const params = { page, pageSize }
      if (search) params.search = search
      if (appliedFilters.reason) params.reason = appliedFilters.reason
      if (appliedFilters.replyMarkedByName) params.replyMarkedByName = appliedFilters.replyMarkedByName
      if (appliedFilters.updatedTime) params.updatedTime = appliedFilters.updatedTime
      if (appliedFilters.updatedTime === 'custom') {
        if (appliedFilters.updatedStartDate) params.updatedStartDate = appliedFilters.updatedStartDate
        if (appliedFilters.updatedEndDate) params.updatedEndDate = appliedFilters.updatedEndDate
      }
      return emailMasterService.listReplies(params)
    }
  })

  const replies = data?.data?.data?.data || []
  const apiOptions = data?.data?.options || data?.data?.data?.options
  const filterOptions = {
    reasons: apiOptions?.reasons || [
      { value: 'converted', label: 'Converted' },
      { value: 'other', label: 'Other' },
      { value: 'replied', label: 'Replied' }
    ],
    replyMarkedByNames: apiOptions?.replyMarkedByNames || [
      { value: 'VHK', label: 'VHK' },
      { value: 'Vinoth Admin', label: 'Vinoth Admin' }
    ],
    updatedTimePresets: apiOptions?.updatedTimePresets || [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_15_days', label: 'Last 15 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'custom', label: 'Custom date range' }
    ]
  }
  const total = data?.data?.data?.total || 0
  const totalPages = data?.data?.data?.totalPages || 1

  const markReplyMut = useMutation({
    mutationFn: (data) => emailMasterService.markReply(data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Reply marked successfully')
      setFormData({ email: '', reason: 'replied', customReason: '' })
      qc.invalidateQueries(['email-master-replies'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to mark reply')
    }
  })

  const updateReplyMut = useMutation({
    mutationFn: ({ id, data }) => emailMasterService.updateReply(id, data),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Reply updated successfully')
      setEditId(null)
      setFormData({ email: '', reason: 'replied', customReason: '' })
      qc.invalidateQueries(['email-master-replies'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update reply')
    }
  })

  const removeReplyMut = useMutation({
    mutationFn: (id) => emailMasterService.updateReply(id, { hasReply: false }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Reply removed successfully')
      setReplyToDelete(null)
      qc.invalidateQueries(['email-master-replies'])
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove reply')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.email) {
      toast.error('Email is required')
      return
    }
    if (editId) {
      updateReplyMut.mutate({
        id: editId,
        data: {
          hasReply: true,
          reason: formData.reason,
          customReason: formData.reason === 'other' ? formData.customReason : undefined
        }
      })
    } else {
      markReplyMut.mutate(formData)
    }
  }

  const handleEdit = (row) => {
    setEditId(row._id || row.id)
    setFormData({
      email: row.email,
      reason: row.replyReason || 'replied',
      customReason: row.replyCustomReason || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (row) => {
    setReplyToDelete(row)
  }

  const confirmDelete = () => {
    if (replyToDelete) {
      removeReplyMut.mutate(replyToDelete._id || replyToDelete.id)
    }
  }

  const handleCancelEdit = () => {
    setEditId(null)
    setFormData({ email: '', reason: 'replied', customReason: '' })
  }

  const columns = [
    { key: 'sno', label: 'S.No', render: (_, __, i) => i + 1 + (page - 1) * pageSize },
    { key: 'fullName', label: 'Full Name', render: v => v || '—' },
    { key: 'email', label: 'Email', render: v => <span className="font-medium text-blue-600">{v}</span> },
    { key: 'university', label: 'University', render: v => v || '—' },
    { key: 'domain', label: 'Domain', render: v => v || '—' },
    { key: 'replyReason', label: 'Reason', render: v => <span className="capitalize font-medium text-indigo-600">{v || '—'}</span> },
    { 
      key: 'replyCustomReason', 
      label: 'Custom Reason', 
      render: v => v ? (
        <div className="min-w-[250px] max-w-[300px] max-h-24 overflow-y-auto pr-2 text-sm text-gray-700 whitespace-pre-wrap">
          {v}
        </div>
      ) : '—' 
    },
   
    { key: 'uploadedByName', label: 'Uploaded By', render: v => <span className="text-sm px-3 text-gray-600 capitalize">{v || '—'}</span> },
    { key: 'uploadedDate', label: 'Upload Date', render: v => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
    { key: 'replyMarkedByName', label: 'Reply Marked By', render: v => <span className="text-sm text-gray-600 capitalize">{v || '—'}</span> },
    { key: 'replyMarkedAt', label: 'Reply Marked At', render: v => v ? format(new Date(v), 'MMM d, yyyy') : '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          {user?.role !== 'employee' && (
            <button
              onClick={() => handleDelete(row)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Remove Reply"
              disabled={removeReplyMut.isPending}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      {/* Mark / Edit Reply Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-primary/10 p-2 rounded-lg">
            {editId ? <Edit className="w-5 h-5 text-primary" /> : <CheckCircle2 className="w-5 h-5 text-primary" />}
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            {editId ? 'Edit Email Reply' : 'Mark Email Reply'}
          </h2>
        </div>
        {/* <p className="text-sm text-gray-500 mb-5">
          {editId 
            ? 'Update reply tracking for this email-master record.' 
            : 'Mark matching email-master records as having received a reply.'}
        </p> */}
        
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-[320px]">
            <Input 
              label="Email Address *" 
              type="email" 
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={!!editId}
            />
          </div>
          <div className="w-full sm:w-[200px]">
            <SearchableSelect 
              label="Reason *" 
              value={formData.reason}
              onChange={(val) => setFormData({ ...formData, reason: val })}
              required
              options={[
                { label: 'Replied', value: 'replied' },
                { label: 'Converted', value: 'converted' },
                { label: 'Others', value: 'other' }
              ]}
            />
          </div>
          {formData.reason === 'other' && (
            <div className="w-full sm:w-[320px]">
              <Input 
                label="Custom Reason (Optional)" 
                type="text" 
                placeholder="e.g. Out of office"
                value={formData.customReason}
                onChange={(e) => setFormData({ ...formData, customReason: e.target.value })}
              />
            </div>
          )}
          
          <div className="flex items-center justify-end gap-3 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
            {editId && (
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={updateReplyMut.isPending}>
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            )}
            <Button type="submit" loading={editId ? updateReplyMut.isPending : markReplyMut.isPending}>
              {editId ? (
                <><Edit className="w-4 h-4 mr-2" /> Update Reply</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Mark as Reply</>
              )}
            </Button>
          </div>
        </form>

        <hr className="my-8 border-gray-100" />
        
        <div className="">
          <div className="flex items-center gap-2 mb-2">
             <Filter className="w-4 h-4 text-gray-500" />
             <h3 className="font-semibold text-gray-700">Filter Replies</h3>
          </div>
          <div className="flex flex-wrap xl:flex-nowrap items-end gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="flex-1 min-w-[140px]">
              <SearchableSelect 
                label="Reason"
                value={filters.reason}
                onChange={val => setFilters(f => ({ ...f, reason: val || '' }))}
                placeholder="All Reasons"
                options={filterOptions.reasons.map(o => ({ label: o.label, value: o.value }))}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <SearchableSelect 
                label="Marked By"
                value={filters.replyMarkedByName}
                onChange={val => setFilters(f => ({ ...f, replyMarkedByName: val || '' }))}
                placeholder="All Users"
                options={filterOptions.replyMarkedByNames.map(o => ({ label: o.label, value: o.value }))}
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <SearchableSelect 
                label="Updated Time"
                value={filters.updatedTime}
                onChange={val => setFilters(f => ({ ...f, updatedTime: val || '', updatedStartDate: '', updatedEndDate: '' }))}
                placeholder="Any Time"
                options={filterOptions.updatedTimePresets.map(o => ({ label: o.label, value: o.value }))}
              />
            </div>

            {filters.updatedTime === 'custom' && (
              <div className="flex-[1.5] min-w-[250px] relative" ref={datePickerRef}>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Date Range</label>
                <div 
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer flex items-center justify-between hover:border-primary/50 transition-colors h-[38px]"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                >
                  <span>
                    {filters.updatedStartDate 
                      ? `${format(new Date(filters.updatedStartDate), 'MMM d, yyyy')} - ${filters.updatedEndDate ? format(new Date(filters.updatedEndDate), 'MMM d, yyyy') : '...'}` 
                      : 'Select Date Range'}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
                {showDatePicker && (
                  <div className="absolute top-full right-0 mt-2 z-50">
                    <DateRangePicker 
                      startDate={filters.updatedStartDate} 
                      endDate={filters.updatedEndDate} 
                      onChange={(dates) => {
                        setFilters(f => ({ ...f, updatedStartDate: dates.start, updatedEndDate: dates.end }));
                        if (dates.start && dates.end) {
                          setShowDatePicker(false);
                        }
                      }} 
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-end justify-end gap-3 shrink-0 ml-auto">
              <Button type="button" variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
              <Button type="button" onClick={handleApplyFilters}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Replies Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-800">List of Replies</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <Table 
          columns={columns} 
          data={replies} 
          loading={isLoading} 
          emptyMsg="No replies found" 
          wrapperClassName="overflow-auto bg-white max-h-[500px]"
        />

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-white">
          <div>
            Showing <span className="font-medium text-gray-900">{total > 0 ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-gray-900">{total}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="border border-gray-200 rounded-md py-1 px-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
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
                disabled={page === totalPages || totalPages === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        open={!!replyToDelete} 
        onClose={() => !removeReplyMut.isPending && setReplyToDelete(null)}
        title="Remove Reply"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Are you sure you want to remove this reply? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setReplyToDelete(null)} disabled={removeReplyMut.isPending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={removeReplyMut.isPending}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

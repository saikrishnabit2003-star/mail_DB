import api from '../lib/axios'

export const emailMasterService = {
  list: (params) => api.get('/email-master', { params }),
  upload: (file, maxLimit, mailSource) => {
    const form = new FormData()
    form.append('file', file)
    const params = {}
    if (maxLimit) params.maxLimit = maxLimit
    if (mailSource) params.mailSource = mailSource
    // console.log("maxLimit", maxLimit)
    // console.log("mailSource", mailSource)
    
    return api.post('/email-master/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params,
    })
  },
  countFiltered: (filters) => api.post('/email-master/count-filtered', filters),
  getUploaderStats: () => api.get('/email-master/stats/uploaders'),
  deleteEmail: (id) => api.delete(`/email-master/${id}`),
  getDropdownOptions: () => api.get('/email-master/dropdown-options'),
  markReply: (data) => api.post('/email-master/replies', data),
  updateReply: (id, data) => api.patch(`/email-master/replies/${id}`, data),
  listReplies: (params) => api.get('/email-master/replies', { params }),
  download: (params) => api.get('/email-master/download', { params, responseType: 'blob' }),
}

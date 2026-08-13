import api from '../lib/axios'

export const profilesService = {
  list: (employeeId) =>
    api.get('/profiles', { params: employeeId ? { employeeId } : {} }),

  getById: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.get(`/profiles/${id}`, { params })
  },

  create: (data, employeeId) =>
    api.post('/profiles', data, { params: employeeId ? { employeeId } : {} }),

  update: (id, data, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.patch(`/profiles/${id}`, data, { params })
  },

  activate: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post(`/profiles/${id}/activate`, {}, { params })
  },

  deactivate: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post(`/profiles/${id}/deactivate`, {}, { params })
  },

  delete: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.delete(`/profiles/${id}`, { params })
  },

  testEmail: (profileId, data, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    console.log(`/profiles/${profileId}/test-email`, data, { params })
    return api.post(`/profiles/${profileId}/test-email`, data, { params })
  },

  countFiltered: (filters, employeeId) =>
    api.post('/email-master/count-filtered', filters, { params: employeeId ? { employeeId } : {} }),

  addTemplate: (profileId, template, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post(`/profiles/${profileId}/templates`, template, { params })
  },

  updateTemplate: (profileId, templateId, template, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.patch(`/profiles/${profileId}/templates/${templateId}`, template, { params })
  },

  deleteTemplate: (profileId, templateId, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.delete(`/profiles/${profileId}/templates/${templateId}`, { params })
  },

  uploadAttachment: (profileId, templateId, file, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/profiles/${profileId}/templates/${templateId}/upload-attachment`, formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  deleteAttachment: (profileId, templateId, attachmentId, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.delete(`/profiles/${profileId}/templates/${templateId}/attachments/${attachmentId}`, { params })
  },

  uploadProfileAttachment: (profileId, file, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/profiles/${profileId}/attachments/upload`, formData, {
      params,
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  deleteProfileAttachment: (profileId, attachmentId, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.delete(`/profiles/${profileId}/attachments/${attachmentId}`, { params })
  },
}

import api from '../lib/axios'

export const profileEmailsService = {
  generate: (profileId, limit, employeeId = null, allowUsed = undefined) => {
    const params = employeeId ? { employeeId } : {}
    const payload = { limitOverride: limit }
    if (allowUsed !== undefined) {
      payload.allowUsed = allowUsed
    }
    return api.post(`/profile-emails/${profileId}/generate`, payload, { params })
  },

  stats: (profileId, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.get(`/profile-emails/${profileId}/stats`, { params })
  },

  list: (profileId, params, employeeId = null) => {
    const allParams = employeeId ? { ...params, employeeId } : params
    return api.get(`/profile-emails/${profileId}`, { params: allParams })
  },

  getRecord: (id) => api.get(`/profile-emails/record/${id}`),

  updateRecord: (id, data) => api.patch(`/profile-emails/record/${id}`, data),

  deleteRecord: (id) => api.delete(`/profile-emails/record/${id}`),

  retryFailed: (profileId, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post(`/profile-emails/${profileId}/retry-failed`, {}, { params })
  },

  clear: (profileId, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.delete(`/profile-emails/${profileId}/clear`, { params })
  },
}

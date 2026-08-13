import api from '../lib/axios'

export const campaignsService = {
  list: (employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.get('/campaigns', { params })
  },
  getById: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.get(`/campaigns/${id}`, { params })
  },
  start: (data, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post('/campaigns/start', data, { params })
  },
  pause: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post(`/campaigns/${id}/pause`, {}, { params })
  },
  resume: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post(`/campaigns/${id}/resume`, {}, { params })
  },
  updateDailyLimit: (id, dailyLimit, employeeId = null) => {
    const params = { dailyLimit }
    if (employeeId) params.employeeId = employeeId
    return api.patch(`/campaigns/${id}/daily-limit`, {}, { params })
  },
  delete: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.delete(`/campaigns/${id}`, { params })
  },
  // Scheduling endpoints
  schedule: (data, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post('/campaigns/schedule', data, { params })
  },
  schedulerStatus: () => api.get('/campaigns/scheduler/status'),
  // Admin endpoints
  detectDuplicates: (profileId) => api.get(`/campaigns/admin/duplicates/${profileId}`),
  consolidateDuplicates: (profileId, keepCampaignId) => 
    api.post('/campaigns/admin/consolidate', {}, { params: { profileId, keepCampaignId } }),
}

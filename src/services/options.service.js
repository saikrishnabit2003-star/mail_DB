import api from '../lib/axios'

export const optionsService = {
  // Get employees list (admin only)
  getEmployees: () => api.get('/options/employees'),
  
  // Get profiles list
  getProfiles: (employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.get('/options/profiles', { params })
  },
  
  // Get campaigns list
  getCampaigns: (employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.get('/options/campaigns', { params })
  },
  
  // Get settings
  getSettings: () => api.get('/settings'),
  
  // Update settings
  updateSettings: (id, data) => api.patch(`/settings/${id}`, data),
}

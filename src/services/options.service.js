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
}

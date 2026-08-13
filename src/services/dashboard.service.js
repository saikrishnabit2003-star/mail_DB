import api from '../lib/axios'

export const dashboardService = {
  employee: (params) => api.get('/dashboard/employee', { params }),
  admin: (params) => api.get('/dashboard/admin', { params }),
  uploadHistory: (params) => api.get('/dashboard/upload-history', { params }),
  dropdownOptions: () => api.get('/dashboard/dropdown-options'),
}


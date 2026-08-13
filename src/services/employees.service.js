import api from '../lib/axios'

export const employeesService = {
  list: () => api.get('/employees'),
  getMe: () => api.get('/employees/me'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.patch(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
}

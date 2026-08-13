import api from '../lib/axios'

export const templatesService = {
  list: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.patch(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
  preview: (data) => api.post('/templates/preview', data),
}

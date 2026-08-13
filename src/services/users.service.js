import api from '../lib/axios'

export const usersService = {
  list: async () => {
    const res = await api.get('/users')
    console.log('Users Response:', res.data)
    return res
  },
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  updatePassword: (id, data) => api.patch(`/users/${id}/password`, data),
  delete: (id) => api.delete(`/users/${id}`),
  migrateBranch: () => api.post('/users/migrate-branch'),
}

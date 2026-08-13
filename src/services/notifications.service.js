import api from '../lib/axios'

export const notificationsService = {
  list: () => api.get('/notifications'),
  readAll: () => api.patch('/notifications/read-all'),
  readOne: (id) => api.patch(`/notifications/${id}/read`),
}

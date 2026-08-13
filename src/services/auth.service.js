import api from '../lib/axios'

export const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (refreshToken) =>
    api.post('/auth/logout', { refreshToken }),
}

import api from '../lib/axios'

export const emailAccountsService = {
  list: (employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.get('/email-accounts', { params })
  },
  getById: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.get(`/email-accounts/${id}`, { params })
  },
  create: (data, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post('/email-accounts', data, { params })
  },
  update: (id, data, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.patch(`/email-accounts/${id}`, data, { params })
  },
  delete: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.delete(`/email-accounts/${id}`, { params })
  },
  test: (id, employeeId = null) => {
    const params = employeeId ? { employeeId } : {}
    return api.post(`/email-accounts/${id}/test`, {}, { params })
  },
  testCredentials: (formData) => {
    return api.post('/email-accounts/test-credentials/validate', formData)
  },
}

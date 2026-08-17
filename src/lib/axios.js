import axios from 'axios'

// const URL = "http://13.206.26.177:5001/";
const URL = "http://13.206.26.177:5002/";
// const URL = "http://localhost:8000/";
const api = axios.create({
  baseURL: URL,
  headers: { 'Content-Type': 'application/json' },
})
// const api = axios.create({
//   baseURL: 'http://13.206.26.177:5001/',
//   headers: { 'Content-Type': 'application/json' },
// })

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  console.log(token)
  return config
})

// On 401 try refresh, else logout
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${api.baseURL}/auth/refresh`, { refreshToken })
          const newToken = data.data.accessToken
          localStorage.setItem('access_token', newToken)
          original.headers.Authorization = `Bearer ${newToken}`
          return api(original)
        } catch {
          localStorage.clear()
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
      } else {
        localStorage.clear()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api

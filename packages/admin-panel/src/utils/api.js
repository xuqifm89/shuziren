import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  config => {
    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`)
    
    return config
  },
  error => {
    console.error('[API Request Error]:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Token过期或无效')
      
      if (window.location.pathname !== '/' && !window.location.pathname.includes('/login')) {
        sessionStorage.removeItem('adminToken')
        window.location.reload()
      }
    }
    
    console.error('[API Response Error]:', error.message)
    return Promise.reject(error)
  }
)

export default api
import axios from 'axios'

const isElectron = () => window.electron && window.electron.isElectron

export function resolveMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('local-media://') || url.startsWith('blob:')) return url
  if (url.startsWith('/')) return `/api${url}`
  return `/api/${url}`
}

const request = axios.create({
  baseURL: '/api',
  timeout: 60000
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config

    if (!error.response && isElectron()) {
      if (['post', 'put', 'patch', 'delete'].includes(originalRequest.method)) {
        try {
          await window.electron.addOfflineAction({
            url: originalRequest.url,
            method: originalRequest.method,
            body: originalRequest.data ? JSON.parse(originalRequest.data) : undefined,
            token: localStorage.getItem('token') || '',
            type: `API ${originalRequest.method.toUpperCase()} ${originalRequest.url}`
          })
        } catch (e) {}
      }

      return Promise.reject(new Error('网络不可用，操作已保存到离线队列'))
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      window.location.hash = '#/login'
    }

    return Promise.reject(error.response?.data || error)
  }
)

export default request

export const get = (url, params) => request.get(url, { params })
export const post = (url, data) => request.post(url, data)
export const put = (url, data) => request.put(url, data)
export const del = (url) => request.delete(url)

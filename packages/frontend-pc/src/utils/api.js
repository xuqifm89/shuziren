import { API_BASE } from '../config/api.js'

function getToken() {
  return localStorage.getItem('token') || ''
}

export function getAuthHeaders(extra = {}) {
  const headers = { ...extra }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else {
    console.warn('⚠️ [getAuthHeaders] localStorage中没有token，请确认已登录')
  }
  return headers
}

async function apiFetch(url, options = {}) {
  const token = getToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    })
    
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}))
      if (errorData.error === 'TOKEN_EXPIRED' || errorData.code === 40102) {
        console.warn('⚠️ Token已过期，请重新登录')
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      
      throw new Error(errorData.message || '未授权，请重新登录')
    }
    
    return response
  } catch (error) {
    console.error('[API Error]', error.message)
    throw error
  }
}

export async function get(url, params = {}) {
  const queryString = new URLSearchParams(params).toString()
  const fullUrl = `${url}${queryString ? '?' + queryString : ''}`
  
  const response = await apiFetch(fullUrl)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export async function post(url, data = {}) {
  const response = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export async function put(url, data = {}) {
  const response = await apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export async function del(url) {
  const response = await apiFetch(url, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export default { get, post, put, del, API_BASE }
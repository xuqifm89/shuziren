const BASE_URL = '/api'

function getToken() {
  return uni.getStorageSync('token') || ''
}

export async function uploadFile(url, filePath, name = 'file', formData = {}) {
  const token = getToken()
  const fullUrl = `${BASE_URL}${url}`

  // #ifdef H5
  if (filePath instanceof File || filePath instanceof Blob) {
    const fd = new FormData()
    fd.append(name, filePath, filePath.name || 'file')
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v) })
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const response = await fetch(fullUrl, { method: 'POST', headers, body: fd })
    if (!response.ok) throw new Error(`上传失败(${response.status})`)
    const text = await response.text()
    try { return JSON.parse(text) } catch (e) { return text }
  }
  // #endif

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header: token ? { 'Authorization': `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode >= 400) { reject(new Error('上传失败')); return }
        try { resolve(JSON.parse(res.data)) } catch (e) { resolve(res.data) }
      },
      fail: (err) => reject(new Error(err.errMsg || '上传失败'))
    })
  })
}

const api = {
  async request(url, options = {}) {
    const token = getToken()
    const header = { 'Content-Type': 'application/json', ...(options.header || {}) }
    if (token) header['Authorization'] = `Bearer ${token}`
    try {
      const res = await new Promise((resolve, reject) => {
        uni.request({
          url: `${BASE_URL}${url}`,
          method: options.method || 'GET',
          data: options.data,
          header,
          timeout: options.timeout || 300000,
          success: resolve,
          fail: reject
        })
      })
      if (res.statusCode === 401) {
        uni.removeStorageSync('token'); uni.removeStorageSync('userInfo')
        const errorMsg = res.data?.error || res.data?.message || '请重新登录'
        uni.showToast({ title: errorMsg, icon: 'none' })
        throw new Error(errorMsg)
      }
      if (res.statusCode >= 400) throw new Error(res.data?.error || res.data?.message || `请求失败(${res.statusCode})`)
      return res.data
    } catch (e) {
      if (e.message === '未授权' || e.message?.includes('请重新登录') || e.message?.includes('密码错误') || e.message?.includes('不存在')) throw e
      throw new Error(e.message || '网络请求失败')
    }
  },
  get(url, params = {}) {
    const query = Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    return this.request(query ? `${url}?${query}` : url)
  },
  post(url, data = {}) { return this.request(url, { method: 'POST', data }) },
  put(url, data = {}) { return this.request(url, { method: 'PUT', data }) },
  delete(url, data = {}) { return this.request(url, { method: 'DELETE', data }) },
  uploadFile,
  resolveApiUrl(url) { return url },
  auth: {
    login(data) { return api.post('/users/login', data) },
    register(data) { return api.post('/users/register', data) }
  },
  library: {
    voiceLibrary: (params) => api.get('/voice-library', params),
    portraitLibrary: (params) => api.get('/portrait-library', params),
    dubbingLibrary: (params) => api.get('/dubbing-library', params),
    musicLibrary: (params) => api.get('/music-library', params),
    copyLibrary: (params) => api.get('/copy-library', params),
    promptLibrary: (params) => api.get('/prompt-library', params),
    workLibrary: (params) => api.get('/work-library', params)
  },
  voices: {
    list: (params) => api.get('/voice-library', params),
    delete: (id) => api.delete(`/voice-library/${id}`),
    upload: (fp) => uploadFile('/voice-library/upload', fp, 'file')
  },
  avatars: {
    list: (params) => api.get('/portrait-library', params),
    delete: (id) => api.delete(`/portrait-library/${id}`),
    upload: (fp) => uploadFile('/portrait-library/upload', fp, 'file', { type: 'image' })
  },
  dubbing: {
    list: (params) => api.get('/dubbing-library', params),
    delete: (id) => api.delete(`/dubbing-library/${id}`)
  },
  video: {
    list: (params) => api.get('/work-library', params),
    delete: (id) => api.delete(`/work-library/${id}`)
  },
  getBaseUrl() { return BASE_URL }
}

export default api

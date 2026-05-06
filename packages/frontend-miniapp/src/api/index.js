const BASE_URL = '/api'

function getToken() {
  return uni.getStorageSync('token') || ''
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
      if (e.message === '未授权' || e.message.includes('请重新登录') || e.message.includes('密码错误') || e.message.includes('不存在')) throw e
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
  auth: {
    login(data) { return api.post('/users/login', data) },
    register(data) { return api.post('/users/register', data) }
  },
  getBaseUrl() { return BASE_URL }
}

export async function uploadFile(url, filePath, name = 'file', formData = {}) {
  const token = getToken()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${BASE_URL}${url}`,
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

export default api

class MiniappTaskWebSocket {
  constructor() {
    this.ws = null
    this.clientId = null
    this.userId = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 3000
    this.heartbeatInterval = null
    this.subscriptions = new Set()
    this.listeners = new Map()
    this.isConnected = false
  }

  getWsUrl() {
    let protocol = 'ws:'
    let host = 'localhost:3001'
    try {
      const appBase = uni.getStorageSync('api_base') || ''
      if (appBase) {
        const url = new URL(appBase)
        protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
        host = url.host
      } else if (typeof location !== 'undefined') {
        protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
        host = location.host
      }
    } catch (e) {}
    return `${protocol}//${host}/ws`
  }

  connect() {
    if (this.ws && this.isConnected) return
    try {
      this.ws = uni.connectSocket({ url: this.getWsUrl(), complete: () => {} })
      this.ws.onOpen(() => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.startHeartbeat()
        if (this.userId) this.authenticate(this.userId)
        this.subscriptions.forEach(topic => {
          if (topic.startsWith('task:')) {
            this._send({ type: 'subscribe', taskId: topic.replace('task:', '') })
          }
        })
        this._emit('connected', { clientId: this.clientId })
      })
      this.ws.onMessage((res) => {
        try { this._handleMessage(JSON.parse(res.data)) } catch (e) {}
      })
      this.ws.onClose(() => {
        this.isConnected = false
        this.stopHeartbeat()
        this._emit('disconnected', {})
        if (this.reconnectAttempts < this.maxReconnectAttempts) this._scheduleReconnect()
      })
      this.ws.onError(() => {
        this.isConnected = false
        this._emit('error', {})
      })
    } catch (e) {
      this._scheduleReconnect()
    }
  }

  disconnect() {
    this.stopHeartbeat()
    this.reconnectAttempts = this.maxReconnectAttempts
    if (this.ws) { try { this.ws.close({}) } catch (e) {} this.ws = null }
    this.isConnected = false
  }

  authenticate(userId) {
    this.userId = userId
    const token = uni.getStorageSync('token') || ''
    this._send({ type: 'auth', userId, token })
  }

  subscribeTask(taskId) {
    this.subscriptions.add(`task:${taskId}`)
    this._send({ type: 'subscribe', taskId })
  }

  unsubscribeTask(taskId) {
    this.subscriptions.delete(`task:${taskId}`)
    this._send({ type: 'unsubscribe', taskId })
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event).push(callback)
    return () => {
      const cbs = this.listeners.get(event)
      if (cbs) {
        const idx = cbs.indexOf(callback)
        if (idx > -1) cbs.splice(idx, 1)
      }
    }
  }

  off(event, callback) {
    const cbs = this.listeners.get(event)
    if (!cbs) return
    if (callback) {
      const idx = cbs.indexOf(callback)
      if (idx > -1) cbs.splice(idx, 1)
    } else {
      this.listeners.delete(event)
    }
  }

  _handleMessage(data) {
    switch (data.type) {
      case 'connected': this.clientId = data.clientId; break
      case 'task_update':
        this._emit('task_update', {
          taskId: data.taskId, status: data.status, progress: data.progress,
          message: data.message, outputUrl: data.outputUrl,
          errorMessage: data.errorMessage, taskType: data.taskType, timestamp: data.timestamp
        })
        break
      default: this._emit(data.type, data)
    }
  }

  _emit(event, data) {
    const cbs = this.listeners.get(event)
    if (cbs) cbs.forEach(cb => { try { cb(data) } catch (e) {} })
  }

  _send(data) {
    if (this.ws && this.isConnected) {
      try { this.ws.send({ data: JSON.stringify(data) }) } catch (e) {}
    }
  }

  _scheduleReconnect() {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5)
    setTimeout(() => this.connect(), delay)
  }

  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => this._send({ type: 'ping' }), 30000)
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null }
  }
}

let wsInstance = null

export function createMiniappAdapter(options = {}) {
  const apiBase = options.apiBase || ''

  function _getToken() {
    try { return uni.getStorageSync('token') || '' } catch (e) { return '' }
  }

  return {
    async post(url, data) {
      const token = _getToken()
      const header = { 'Content-Type': 'application/json' }
      if (token) header['Authorization'] = `Bearer ${token}`
      const res = await new Promise((resolve, reject) => {
        uni.request({
          url: apiBase + url,
          method: 'POST',
          data,
          header,
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        })
      })
      return res.data
    },

    async get(url, params = {}) {
      const token = _getToken()
      const query = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
      const fullUrl = apiBase + url + (query ? '?' + query : '')
      const header = { 'Cache-Control': 'no-cache' }
      if (token) header['Authorization'] = `Bearer ${token}`
      const res = await new Promise((resolve, reject) => {
        uni.request({
          url: fullUrl,
          method: 'GET',
          header,
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        })
      })
      return res.data
    },

    createWebSocket() {
      if (!wsInstance) wsInstance = new MiniappTaskWebSocket()
      return wsInstance
    },

    getStorage(key) {
      try { return uni.getStorageSync(key) } catch (e) { return null }
    },

    setStorage(key, value) {
      try { uni.setStorageSync(key, value) } catch (e) {}
    },

    removeStorage(key) {
      try { uni.removeStorageSync(key) } catch (e) {}
    },

    getUserInfo() {
      try {
        const info = uni.getStorageSync('userInfo')
        if (info) return typeof info === 'string' ? JSON.parse(info) : info
      } catch (e) {}
      return null
    },

    setInterval: typeof window !== 'undefined' ? window.setInterval.bind(window) : setInterval,
    clearInterval: typeof window !== 'undefined' ? window.clearInterval.bind(window) : clearInterval
  }
}

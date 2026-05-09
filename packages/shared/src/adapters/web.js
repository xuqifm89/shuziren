class WebTaskWebSocket {
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
    this.isConnecting = false
  }

  getWsUrl() {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3001'
    return `${protocol}//${host}/ws`
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return
    this.isConnecting = true
    try {
      this.ws = new WebSocket(this.getWsUrl())
      this.ws.onopen = () => {
        this.isConnected = true
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startHeartbeat()
        if (this.userId) this.authenticate(this.userId)
        this.subscriptions.forEach(topic => {
          if (topic.startsWith('task:')) {
            this._send({ type: 'subscribe', taskId: topic.replace('task:', '') })
          } else if (topic.startsWith('channel:')) {
            this._send({ type: 'subscribe', channel: topic.replace('channel:', '') })
          }
        })
        this._emit('connected', { clientId: this.clientId })
      }
      this.ws.onmessage = (event) => {
        try { this._handleMessage(JSON.parse(event.data)) } catch (e) {}
      }
      this.ws.onclose = (event) => {
        this.isConnected = false
        this.isConnecting = false
        this.stopHeartbeat()
        this._emit('disconnected', { code: event.code })
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) this._scheduleReconnect()
      }
      this.ws.onerror = () => {
        this.isConnecting = false
        this._emit('error', {})
      }
    } catch (e) {
      this.isConnecting = false
      this._scheduleReconnect()
    }
  }

  disconnect() {
    this.stopHeartbeat()
    this.reconnectAttempts = this.maxReconnectAttempts
    if (this.ws) { this.ws.close(1000, 'Client disconnect'); this.ws = null }
    this.isConnected = false
  }

  authenticate(userId) {
    this.userId = userId
    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || '') : ''
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
      case 'auth_success': break
      case 'auth_failed': break
      case 'subscribed': break
      case 'task_update':
        this._emit('task_update', {
          taskId: data.taskId, status: data.status, progress: data.progress,
          message: data.message, outputUrl: data.outputUrl,
          errorMessage: data.errorMessage, taskType: data.taskType, timestamp: data.timestamp
        })
        break
      case 'pong': break
      default: this._emit(data.type, data)
    }
  }

  _emit(event, data) {
    const cbs = this.listeners.get(event)
    if (cbs) cbs.forEach(cb => { try { cb(data) } catch (e) {} })
  }

  _send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(data))
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

export function createWebAdapter(options = {}) {
  const getAuthHeaders = options.getAuthHeaders || (() => ({}))
  const apiBase = options.apiBase || ''

  return {
    async post(url, data) {
      const response = await fetch(apiBase + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data)
      })
      return response.json()
    },

    async get(url, params = {}) {
      const query = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
      const fullUrl = apiBase + url + (query ? '?' + query : '')
      const response = await fetch(fullUrl, {
        headers: { ...getAuthHeaders(), 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
      return response.json()
    },

    createWebSocket() {
      if (!wsInstance) wsInstance = new WebTaskWebSocket()
      return wsInstance
    },

    getStorage(key) {
      try { return localStorage.getItem(key) } catch (e) { return null }
    },

    setStorage(key, value) {
      try { localStorage.setItem(key, value) } catch (e) {}
    },

    removeStorage(key) {
      try { localStorage.removeItem(key) } catch (e) {}
    },

    getUserInfo() {
      try {
        const info = localStorage.getItem('userInfo')
        if (info) return typeof info === 'string' ? JSON.parse(info) : info
      } catch (e) {}
      return null
    },

    setInterval: typeof window !== 'undefined' ? window.setInterval.bind(window) : setInterval,
    clearInterval: typeof window !== 'undefined' ? window.clearInterval.bind(window) : clearInterval
  }
}

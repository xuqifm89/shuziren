class ConfigSyncService {
  constructor() {
    this.configCache = null
    this.lastSyncTime = null
    this.syncInterval = null
    this.listeners = []
    this.API_BASE = 'http://localhost:3001'
    this.SYNC_INTERVAL_MS = 5 * 60 * 1000 // 默认5分钟同步一次
    this.CACHE_KEY = 'cloud_config_cache'
    this.SYNC_TIME_KEY = 'cloud_config_sync_time'
  }

  async init() {
    console.log('🔄 初始化配置同步服务...')

    try {
      await this.loadFromCache()
      await this.syncConfig()

      this.startAutoSync()

      window.addEventListener('online', () => {
        console.log('🌐 网络已恢复，立即同步配置')
        this.syncConfig()
      })

      console.log('✅ 配置同步服务初始化完成')
      return true
    } catch (error) {
      console.error('❌ 配置同步服务初始化失败:', error)
      
      if (this.configCache) {
        console.log('⚠️ 使用缓存的配置')
        return true
      }
      
      return false
    }
  }

  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    this.syncInterval = setInterval(() => {
      this.syncConfig()
    }, this.SYNC_INTERVAL_MS)

    console.log(`⏰ 已启动自动同步，间隔: ${this.SYNC_INTERVAL_MS / 1000} 秒`)
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('⏹️ 已停止自动同步')
    }
  }

  async syncConfig() {
    if (!navigator.onLine) {
      console.log('📴 当前离线，跳过同步')
      return this.configCache || {}
    }

    console.log('📡 开始同步云端配置...')

    try {
      const user = this.getCurrentUser()
      const params = new URLSearchParams()
      
      if (user?.id) {
        params.append('userId', user.id)
      }
      
      params.append('clientVersion', this.getClientVersion())

      const token = localStorage.getItem('token')
      const response = await fetch(`${this.API_BASE}/api/cloud-config/sync/client?${params}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await response.json()

      if (data.success) {
        const oldConfig = this.configCache ? { ...this.configCache } : null
        this.configCache = data.data
        this.lastSyncTime = new Date(data.syncTime)

        this.saveToCache()
        this.notifyListeners(oldConfig, data.data)
        
        console.log(`✅ 配置同步成功！获取到 ${Object.keys(data.data).length} 条配置`)
        console.log('   同步时间:', data.syncTime)
        
        return data.data
      } else {
        console.error('❌ 同步失败:', data.error)
        return this.configCache || {}
      }
    } catch (error) {
      console.error('❌ 同步异常:', error.message)
      return this.configCache || {}
    }
  }

  getConfig(key, defaultValue = undefined) {
    if (!this.configCache) {
      console.warn('⚠️ 配置未加载，返回默认值')
      return defaultValue
    }

    const value = this.configCache[key]
    
    if (value === undefined) {
      if (defaultValue !== undefined) {
        console.log(`ℹ️ 配置 ${key} 不存在，使用默认值:`, defaultValue)
      }
      return defaultValue
    }

    return value
  }

  getAllConfig() {
    return this.configCache ? { ...this.configCache } : {}
  }

  hasConfig(key) {
    return key in (this.configCache || {})
  }

  getApiProviderConfig(provider) {
    switch (provider?.toLowerCase()) {
      case 'runninghub':
        return {
          apiKey: this.getConfig('runninghub_api_key', ''),
          baseUrl: this.getConfig('runninghub_base_url', 'https://www.runninghub.cn'),
          apps: {
            textGeneration: this.getConfig('runninghub_app_text_generation', ''),
            audioGeneration: this.getConfig('runninghub_app_audio_generation', ''),
            videoGeneration: this.getConfig('runninghub_app_video_generation', ''),
            dubbing: this.getConfig('runninghub_app_dubbing', '2049527678209892354'),
            imageToVideo: this.getConfig('runninghub_app_image_to_video', '2050230386843762690'),
            videoToVideo: this.getConfig('runninghub_app_video_to_video', '2050226856238043137')
          },
          workflows: {
            textGeneration: this.getConfig('runninghub_workflow_text_generation', ''),
            audioGeneration: this.getConfig('runninghub_workflow_audio_generation', ''),
            videoGeneration: this.getConfig('runninghub_workflow_video_generation', '')
          }
        }

      case 'siliconflow':
        return {
          apiKey: this.getConfig('siliconflow_api_key', ''),
          baseUrl: this.getConfig('siliconflow_base_url', 'https://api.siliconflow.cn/v1'),
          defaultModel: this.getConfig('siliconflow_default_model', 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B')
        }

      default:
        throw new Error(`未知的API提供商: ${provider}`)
    }
  }

  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback)
    }
  }

  offChange(callback) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  notifyListeners(oldConfig, newConfig) {
    if (!oldConfig || !newConfig) return

    const changes = {}

    for (const key of Object.keys(newConfig)) {
      if (oldConfig[key] !== newConfig[key]) {
        changes[key] = {
          oldValue: oldConfig[key],
          newValue: newConfig[key]
        }
      }
    }

    for (const key of Object.keys(oldConfig)) {
      if (!(key in newConfig)) {
        changes[key] = {
          oldValue: oldConfig[key],
          newValue: undefined,
          removed: true
        }
      }
    }

    if (Object.keys(changes).length > 0) {
      console.log('📣 配置变更通知:', Object.keys(changes))
      
      this.listeners.forEach(listener => {
        try {
          listener(changes, newConfig)
        } catch (error) {
          console.error('❌ 监听器执行失败:', error)
        }
      })
    }
  }

  saveToCache() {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        config: this.configCache,
        syncTime: this.lastSyncTime?.toISOString()
      }))
      localStorage.setItem(this.SYNC_TIME_KEY, this.lastSyncTime?.toISOString() || '')
    } catch (error) {
      console.error('❌ 保存配置缓存失败:', error)
    }
  }

  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY)
      
      if (cached) {
        const parsed = JSON.parse(cached)
        
        if (parsed.config && Object.keys(parsed.config).length > 0) {
          this.configCache = parsed.config
          this.lastSyncTime = parsed.syncTime ? new Date(parsed.syncTime) : null
          
          console.log(`✅ 从缓存加载了 ${Object.keys(this.configCache).length} 条配置`)
          
          if (this.lastSyncTime) {
            console.log('   缓存时间:', this.lastSyncTime.toLocaleString())
          }
          
          return true
        }
      }
    } catch (error) {
      console.error('❌ 加载配置缓存失败:', error)
    }

    return false
  }

  clearCache() {
    try {
      localStorage.removeItem(this.CACHE_KEY)
      localStorage.removeItem(this.SYNC_TIME_KEY)
      this.configCache = null
      this.lastSyncTime = null
      console.log('🗑️ 已清除配置缓存')
    } catch (error) {
      console.error('❌ 清除缓存失败:', error)
    }
  }

  getLastSyncTime() {
    return this.lastSyncTime
  }

  isConfigFresh() {
    if (!this.lastSyncTime) return false
    
    const now = Date.now()
    const lastSync = this.lastSyncTime.getTime()
    const diff = now - lastSync
    
    return diff < this.SYNC_INTERVAL_MS
  }

  getCurrentUser() {
    try {
      const userInfo = localStorage.getItem('userInfo')
      return userInfo ? JSON.parse(userInfo) : null
    } catch {
      return null
    }
  }

  getClientVersion() {
    return '1.0.0'
  }

  forceSync() {
    console.log('🔄 强制同步配置...')
    return this.syncConfig()
  }

  getStatus() {
    return {
      hasConfig: !!this.configCache,
      configCount: this.configCache ? Object.keys(this.configCache).length : 0,
      lastSyncTime: this.lastSyncTime?.toISOString(),
      isOnline: navigator.onLine,
      isFresh: this.isConfigFresh(),
      autoSyncEnabled: !!this.syncInterval
    }
  }

  destroy() {
    this.stopAutoSync()
    this.listeners = []
    this.configCache = null
    this.lastSyncTime = null
    console.log('💥 配置同步服务已销毁')
  }
}

let instance = null

function getConfigSyncService() {
  if (!instance) {
    instance = new ConfigSyncService()
  }
  return instance
}

export { ConfigSyncService, getConfigSyncService }
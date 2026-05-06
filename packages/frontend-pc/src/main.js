import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { getConfigSyncService } from './services/configSync'
import { getTaskWebSocket } from './utils/websocket'

async function initConfigSync() {
  const configSync = getConfigSyncService()
  const success = await configSync.init()

  if (success) {
    console.log('✅ 云端配置同步服务已启动')
    configSync.onChange((changes, newConfig) => {
      console.log('📢 配置已更新:', Object.keys(changes))
      window.dispatchEvent(new CustomEvent('config-changed', {
        detail: { changes, config: newConfig }
      }))
    })
  } else {
    console.warn('⚠️ 云端配置同步服务启动失败，将使用默认配置')
  }

  return success
}

const app = createApp(App)
app.use(ElementPlus)
app.use(router)

initConfigSync().then(() => {
  app.mount('#app')

  const ws = getTaskWebSocket()
  ws.connect()
  console.log('🔌 WebSocket服务已启动')

  const userInfo = localStorage.getItem('userInfo')
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo)
      if (user.id) {
        ws.authenticate(user.id)
      }
    } catch (e) {}
  }

  console.log('✅ 用户前端已挂载')
}).catch((error) => {
  console.error('❌ 应用初始化失败:', error)
  app.mount('#app')
})

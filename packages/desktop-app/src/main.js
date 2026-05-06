import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { getConfigSyncService } from './services/configSync'

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

document.title = '拾光引擎AI - 超级IP智能体'

const app = createApp(App)
app.use(ElementPlus)
app.use(router)

initConfigSync().then(() => {
  app.mount('#app')
  console.log('✅ 桌面端应用已挂载')
}).catch((error) => {
  console.error('❌ 应用初始化失败:', error)
  app.mount('#app')
})

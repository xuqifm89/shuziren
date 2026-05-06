<template>
  <main class="settings-view">
    <div class="settings-container">
      <div class="settings-section" v-if="isElectron">
        <h3 class="section-title">桌面端设置</h3>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">开机自启动</span>
            <span class="setting-desc">系统启动时自动运行拾光引擎</span>
          </div>
          <el-switch v-model="autoLaunch" @change="toggleAutoLaunch" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">关闭时最小化到托盘</span>
            <span class="setting-desc">关闭窗口时保持后台运行</span>
          </div>
          <el-switch v-model="minimizeToTray" disabled />
        </div>
      </div>

      <div class="settings-section" v-if="isElectron">
        <h3 class="section-title">离线数据</h3>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">离线操作队列</span>
            <span class="setting-desc">{{ offlineQueueCount }} 条待同步操作</span>
          </div>
          <div class="setting-actions">
            <el-button size="small" @click="syncOfflineQueue" :loading="syncing">同步</el-button>
            <el-button size="small" type="danger" @click="clearOfflineQueue">清空</el-button>
          </div>
        </div>
      </div>

      <div class="settings-section" v-if="isElectron">
        <h3 class="section-title">更新</h3>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">检查更新</span>
            <span class="setting-desc">{{ updateStatusText }}</span>
          </div>
          <el-button size="small" @click="checkUpdates" :loading="checkingUpdate">检查</el-button>
        </div>
        <div v-if="updateInfo.status === 'available'" class="update-info">
          <span>发现新版本 v{{ updateInfo.version }}</span>
          <el-button size="small" type="primary" @click="downloadUpdate" :loading="updateInfo.status === 'downloading'">
            {{ updateInfo.status === 'downloading' ? `下载中 ${updateInfo.progress}%` : '下载更新' }}
          </el-button>
        </div>
      </div>

      <SystemSettings />

      <div class="settings-section" v-if="isElectron">
        <h3 class="section-title">系统信息</h3>
        <div class="system-info-grid">
          <div class="info-item" v-for="(value, key) in systemInfo" :key="key">
            <span class="info-key">{{ key }}</span>
            <span class="info-value">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { SystemSettings } from '@shuziren/shared-components'

const isElectron = () => window.electron && window.electron.isElectron

const autoLaunch = ref(false)
const minimizeToTray = ref(true)
const offlineQueueCount = ref(0)
const syncing = ref(false)
const checkingUpdate = ref(false)
const updateInfo = ref({ status: 'idle', version: '', progress: 0 })
const systemInfo = ref({})

const updateStatusText = computed(() => {
  const map = {
    idle: '未检查',
    checking: '正在检查...',
    available: `发现新版本 v${updateInfo.value.version}`,
    'up-to-date': '已是最新版本',
    downloading: `下载中 ${updateInfo.value.progress}%`,
    downloaded: '更新已就绪',
    error: '检查失败',
    'dev-mode': '开发模式',
    'web-mode': '非桌面端'
  }
  return map[updateInfo.value.status] || '未知'
})

onMounted(async () => {
  if (!isElectron()) return

  try {
    autoLaunch.value = await window.electron.getAutoLaunch()
  } catch (e) {}

  try {
    const queue = await window.electron.getOfflineQueue()
    offlineQueueCount.value = queue.length
  } catch (e) {}

  try {
    const info = await window.electron.getSystemInfo()
    systemInfo.value = {
      '应用版本': info.appVersion,
      '平台': info.platform,
      '架构': info.arch,
      'Electron': info.electronVersion,
      'Node.js': info.nodeVersion,
      'Chrome': info.chromeVersion,
      '数据目录': info.userDataDir,
      '媒体目录': info.mediaDir,
      '数据库': info.dbPath,
      '后端端口': info.backendPort
    }
  } catch (e) {}

  window.electron.onUpdateStatus?.((data) => {
    updateInfo.value = data
    checkingUpdate.value = false
  })

  window.electron.onOfflineSync?.((data) => {
    offlineQueueCount.value = 0
    ElMessage.success(`已同步 ${data.processed} 条离线操作`)
  })
})

async function toggleAutoLaunch(enable) {
  try {
    await window.electron.setAutoLaunch(enable)
    ElMessage.success(enable ? '已开启开机自启' : '已关闭开机自启')
  } catch (e) {
    autoLaunch.value = !enable
    ElMessage.error('设置失败')
  }
}

async function syncOfflineQueue() {
  syncing.value = true
  try {
    const count = await window.electron.processOfflineQueue()
    offlineQueueCount.value = 0
    ElMessage.success(`已同步 ${count} 条操作`)
  } catch (e) {
    ElMessage.error('同步失败')
  } finally {
    syncing.value = false
  }
}

async function clearOfflineQueue() {
  try {
    await window.electron.clearOfflineQueue()
    offlineQueueCount.value = 0
    ElMessage.success('已清空离线队列')
  } catch (e) {
    ElMessage.error('清空失败')
  }
}

async function checkUpdates() {
  checkingUpdate.value = true
  try {
    const result = await window.electron.checkForUpdates()
    if (result?.status === 'dev-mode') {
      ElMessage.info('开发模式不支持自动更新')
    }
  } catch (e) {
    ElMessage.error('检查更新失败')
  } finally {
    checkingUpdate.value = false
  }
}

async function downloadUpdate() {
  try {
    await window.electron.downloadUpdate()
  } catch (e) {
    ElMessage.error('下载更新失败')
  }
}
</script>

<style scoped>
.settings-view { display: flex; flex-direction: column; width: 100%; height: 100%; overflow-y: auto; padding: 20px; min-width: 0; }
.settings-container { max-width: 800px; margin: 0 auto; width: 100%; }
.settings-section { background: rgba(30,30,60,0.7); backdrop-filter: blur(15px); border-radius: 16px; border: 1px solid rgba(102,126,234,0.3); padding: 24px; margin-bottom: 20px; }
.section-title { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 18px; font-weight: 600; margin-bottom: 16px; }
.setting-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.setting-item:last-child { border-bottom: none; }
.setting-info { flex: 1; }
.setting-label { display: block; color: #fff; font-size: 14px; font-weight: 500; }
.setting-desc { display: block; color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 4px; }
.setting-actions { display: flex; gap: 8px; }
.update-info { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(102,126,234,0.1); border-radius: 8px; margin-top: 8px; color: #fff; font-size: 14px; }
.system-info-grid { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; }
.info-key { color: rgba(255,255,255,0.5); font-size: 13px; text-align: right; }
.info-value { color: rgba(255,255,255,0.9); font-size: 13px; word-break: break-all; }
</style>

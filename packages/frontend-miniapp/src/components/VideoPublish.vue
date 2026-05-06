<template>
  <view class="video-publish">
    <view v-if="videoPath" class="video-info">
      <text class="video-info-text">已选择视频</text>
    </view>
    <view v-else class="empty-hint">
      <text class="empty-text">请先选择视频（使用上方本地上传或视频库按钮）</text>
    </view>

    <view class="form-group">
      <text class="form-label">视频标题</text>
      <input v-model="title" class="form-input" placeholder="输入视频标题" />
    </view>
    <view class="form-group">
      <text class="form-label">视频描述</text>
      <textarea v-model="description" class="form-textarea" placeholder="输入视频描述" />
    </view>
    <view class="form-group">
      <text class="form-label">标签</text>
      <input v-model="tagsInput" class="form-input" placeholder="用逗号分隔，如：日常,生活" />
    </view>
    <view class="form-group">
      <text class="form-label">封面</text>
      <view class="cover-area">
        <view v-if="coverPreview" class="cover-preview-wrap">
          <image :src="coverPreview" class="cover-preview-img" mode="aspectFill" />
          <view class="cover-remove" @tap="removeCover">
            <text class="cover-remove-text">✕</text>
          </view>
        </view>
        <view v-else class="cover-placeholder" @tap="chooseCover">
          <text class="cover-placeholder-text">上传封面</text>
        </view>
        <text class="cover-tip">不传则使用视频首帧</text>
      </view>
    </view>

    <view class="section-divider"></view>
    <view class="section-header">
      <text class="section-title">选择平台</text>
      <view class="add-account-btn" @tap="showAddAccount = true">
        <text class="add-account-btn-text">添加账号</text>
      </view>
    </view>
    <view class="platform-list">
      <view
        :class="['platform-item', selectedPlatforms.includes(p.key) ? 'active' : '']"
        v-for="p in platforms"
        :key="p.key"
        @tap="togglePlatform(p.key)"
      >
        <image :src="p.icon" class="platform-icon" mode="aspectFit" />
        <text class="platform-name">{{ p.name }}</text>
        <text :class="['account-count', getAccountsByPlatform(p.key).length > 0 ? 'has' : '']">
          {{ getAccountsByPlatform(p.key).length }}个账号
        </text>
      </view>
    </view>

    <view v-if="selectedPlatforms.length > 0" class="account-section">
      <text class="section-title">选择账号</text>
      <view v-for="platform in selectedPlatforms" :key="platform" class="account-group">
        <text class="account-group-title">{{ platformNames[platform] || platform }}</text>
        <view v-for="account in getAccountsByPlatform(platform)" :key="account.id" class="account-item">
          <view :class="['account-checkbox', selectedAccountIds.includes(account.id) ? 'checked' : '']" @tap="toggleAccount(account.id)">
            <text v-if="selectedAccountIds.includes(account.id)" class="checkbox-mark">✓</text>
          </view>
          <text class="account-name">{{ account.accountName }}</text>
          <text :class="['cookie-status', account.cookieValid ? 'valid' : 'invalid']">
            {{ account.cookieValid ? '有效' : '失效' }}
          </text>
          <view class="account-actions">
            <text class="action-link" @tap="handleCheckAccount(account)">检查</text>
            <text class="action-link login-link" @tap="handleLoginAccount(account)">登录</text>
            <text class="action-link delete-link" @tap="handleDeleteAccount(account)">删除</text>
          </view>
        </view>
        <view v-if="getAccountsByPlatform(platform).length === 0" class="no-account">
          <text class="no-account-text">暂无账号，请先添加</text>
        </view>
      </view>
    </view>

    <view class="section-divider"></view>
    <view class="publish-section">
      <view class="publish-type-switch">
        <view :class="['type-option', publishType === 'immediate' ? 'active' : '']" @tap="publishType = 'immediate'">
          <text class="type-icon">⚡</text>
          <text class="type-label">立即发布</text>
        </view>
        <view :class="['type-option', publishType === 'scheduled' ? 'active' : '']" @tap="publishType = 'scheduled'">
          <text class="type-icon">🕐</text>
          <text class="type-label">定时发布</text>
        </view>
      </view>
      <view v-if="publishType === 'scheduled'" class="schedule-row">
        <input v-model="scheduleTime" class="form-input" type="datetime-local" placeholder="选择发布时间" />
      </view>
      <button
        class="publish-btn"
        @tap="handlePublish"
        :disabled="!canPublish || isPublishing"
      >
        {{ isPublishing ? '发布中...' : '一键发布' }}
      </button>
    </view>

    <view v-if="currentPublishTasks.length > 0" class="task-section">
      <view class="section-header">
        <text class="section-title">发布进度</text>
        <text class="clear-btn" @tap="currentPublishTasks = []">清除</text>
      </view>
      <view v-for="task in currentPublishTasks" :key="task.id" class="task-item">
        <text class="task-platform">{{ platformNames[task.platform] || task.platform }}</text>
        <text class="task-title">{{ task.title }}</text>
        <text :class="['task-status', task.status]">{{ statusLabels[task.status] || task.status }}</text>
      </view>
    </view>

    <view v-if="showAddAccount" class="modal-mask" @tap.self="showAddAccount = false">
      <view class="modal-content">
        <text class="modal-title">添加账号</text>
        <view class="form-group">
          <text class="form-label">平台</text>
          <view class="platform-select">
            <view
              v-for="p in platforms"
              :key="p.key"
              :class="['platform-option', newAccountPlatform === p.key ? 'active' : '']"
              @tap="newAccountPlatform = p.key"
            >
              <image :src="p.icon" class="platform-option-icon" mode="aspectFit" />
              <text>{{ p.name }}</text>
            </view>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">账号名</text>
          <input v-model="newAccountName" class="form-input" placeholder="输入账号名称" />
        </view>
        <view class="modal-actions">
          <view class="modal-btn cancel" @tap="showAddAccount = false">
            <text class="modal-btn-text">取消</text>
          </view>
          <view class="modal-btn confirm" @tap="handleAddAccount">
            <text class="modal-btn-text">确定</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showQrcodeDialog" class="modal-mask" @tap.self="closeQrcodeDialog">
      <view class="modal-content qrcode-modal">
        <text class="modal-title">扫码登录</text>
        <view class="qrcode-tip">
          <text class="qrcode-tip-text">请使用 {{ currentLoginPlatformName }} App 扫描二维码登录</text>
          <text class="qrcode-subtip">二维码将在2分钟后失效，请尽快扫码</text>
        </view>
        <view v-if="qrcodeUrl" class="qrcode-image-wrap">
          <image :src="qrcodeUrl" class="qrcode-image" mode="aspectFit" />
        </view>
        <view v-else class="qrcode-loading">
          <text class="loading-text">正在生成二维码，请稍候...</text>
        </view>
        <view class="modal-actions">
          <view class="modal-btn cancel" @tap="closeQrcodeDialog">
            <text class="modal-btn-text">取消登录</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../api/index.js'

const MEDIA_BASE = 'http://localhost:3001'

const props = defineProps({ videoPath: { type: String, default: '' } })

const title = ref('')
const description = ref('')
const tagsInput = ref('')
const publishType = ref('immediate')
const scheduleTime = ref('')
const isPublishing = ref(false)

const coverTempPath = ref('')
const coverPreview = ref('')
const coverAbsolutePath = ref('')

const platforms = ref([])
const accounts = ref([])
const selectedPlatforms = ref([])
const selectedAccountIds = ref([])
const currentPublishTasks = ref([])

const showAddAccount = ref(false)
const newAccountPlatform = ref('')
const newAccountName = ref('')
const addingAccount = ref(false)

const showQrcodeDialog = ref(false)
const qrcodeUrl = ref('')
const loginPollingTimer = ref(null)
const currentLoginPlatformName = ref('')

const platformNames = { douyin: '抖音', bilibili: 'B站', xiaohongshu: '小红书', kuaishou: '快手' }
const platformIcons = { douyin: '/static/dy.png', bilibili: '/static/bz.png', xiaohongshu: '/static/xhs.png', kuaishou: '/static/ks.png' }
const statusLabels = { pending: '等待中', running: '发布中', success: '成功', failed: '失败' }

const canPublish = computed(() => props.videoPath && title.value && selectedAccountIds.value.length > 0 && !isPublishing.value)

function getUserId() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

function getAccountsByPlatform(platform) {
  return accounts.value.filter(a => a.platform === platform && a.status === 'active')
}

function togglePlatform(key) {
  const idx = selectedPlatforms.value.indexOf(key)
  if (idx >= 0) {
    selectedPlatforms.value.splice(idx, 1)
    getAccountsByPlatform(key).forEach(a => {
      const aidx = selectedAccountIds.value.indexOf(a.id)
      if (aidx >= 0) selectedAccountIds.value.splice(aidx, 1)
    })
  } else {
    selectedPlatforms.value.push(key)
  }
}

function toggleAccount(accountId) {
  const idx = selectedAccountIds.value.indexOf(accountId)
  if (idx >= 0) selectedAccountIds.value.splice(idx, 1)
  else selectedAccountIds.value.push(accountId)
}

function chooseCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      coverTempPath.value = res.tempFilePaths[0]
      coverPreview.value = res.tempFilePaths[0]
      coverAbsolutePath.value = ''
    }
  })
}

function removeCover() {
  coverTempPath.value = ''
  coverPreview.value = ''
  coverAbsolutePath.value = ''
}

async function uploadCover() {
  if (!coverTempPath.value) return null
  try {
    const res = await new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${api.getBaseUrl()}/publish/upload-thumbnail`,
        filePath: coverTempPath.value,
        name: 'file',
        header: { 'Authorization': `Bearer ${uni.getStorageSync('token')}` },
        success: resolve,
        fail: reject
      })
    })
    const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    coverAbsolutePath.value = data.absolutePath
    return data.absolutePath
  } catch (err) {
    console.error('封面上传失败:', err)
    return null
  }
}

async function fetchPlatforms() {
  try {
    const data = await api.get('/publish/platforms')
    platforms.value = data.map(p => ({ key: p.key, name: p.name, icon: platformIcons[p.key] || '/static/logo.png' }))
  } catch (err) { console.error('获取平台列表失败:', err) }
}

async function fetchAccounts() {
  try {
    const user = getUserId()
    accounts.value = await api.get('/publish/accounts', { userId: user?.id })
  } catch (err) { console.error('获取账号列表失败:', err) }
}

async function handleAddAccount() {
  if (!newAccountPlatform.value || !newAccountName.value) {
    uni.showToast({ title: '请选择平台并输入账号名', icon: 'none' })
    return
  }
  addingAccount.value = true
  try {
    const user = getUserId()
    await api.post('/publish/accounts', {
      userId: user?.id,
      platform: newAccountPlatform.value,
      accountName: newAccountName.value
    })
    uni.showToast({ title: '账号添加成功', icon: 'success' })
    showAddAccount.value = false
    newAccountPlatform.value = ''
    newAccountName.value = ''
    await fetchAccounts()
  } catch (err) {
    uni.showToast({ title: err.message || '添加账号失败', icon: 'none' })
  } finally {
    addingAccount.value = false
  }
}

async function handleLoginAccount(account) {
  try {
    showQrcodeDialog.value = true
    qrcodeUrl.value = ''
    currentLoginPlatformName.value = platformNames[account.platform] || account.platform
    uni.showToast({ title: '正在启动登录，请稍等...', icon: 'none' })

    const loginPromise = api.post(`/publish/accounts/${account.id}/login`, {})

    let pollCount = 0
    const maxPolls = 60
    loginPollingTimer.value = setInterval(async () => {
      pollCount++
      try {
        const qrcodeData = await api.get(`/publish/accounts/${account.id}/qrcode`)
        if (qrcodeData.success && qrcodeData.qrcodeUrl) {
          qrcodeUrl.value = qrcodeData.qrcodeUrl
        }
      } catch (e) {}
      if (pollCount >= maxPolls) clearInterval(loginPollingTimer.value)
    }, 2000)

    await loginPromise

    if (loginPollingTimer.value) { clearInterval(loginPollingTimer.value); loginPollingTimer.value = null }
    showQrcodeDialog.value = false
    uni.showToast({ title: `${account.accountName} 登录成功`, icon: 'success' })
    await fetchAccounts()
  } catch (err) {
    if (loginPollingTimer.value) { clearInterval(loginPollingTimer.value); loginPollingTimer.value = null }
    showQrcodeDialog.value = false
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  }
}

function closeQrcodeDialog() {
  showQrcodeDialog.value = false
  qrcodeUrl.value = ''
  if (loginPollingTimer.value) { clearInterval(loginPollingTimer.value); loginPollingTimer.value = null }
}

async function handleCheckAccount(account) {
  try {
    uni.showToast({ title: '正在检查...', icon: 'none' })
    const data = await api.post(`/publish/accounts/${account.id}/check`)
    if (data.valid) {
      uni.showToast({ title: `${account.accountName} Cookie有效`, icon: 'success' })
    } else {
      uni.showToast({ title: `${account.accountName} Cookie已失效，请重新登录`, icon: 'none' })
    }
    await fetchAccounts()
  } catch (err) {
    uni.showToast({ title: '检查失败', icon: 'none' })
  }
}

async function handleDeleteAccount(account) {
  uni.showModal({
    title: '确认删除',
    content: `确定删除账号 "${account.accountName}" 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await api.delete(`/publish/accounts/${account.id}`)
          uni.showToast({ title: '账号已删除', icon: 'success' })
          await fetchAccounts()
          const idx = selectedAccountIds.value.indexOf(account.id)
          if (idx >= 0) selectedAccountIds.value.splice(idx, 1)
        } catch (err) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

async function handlePublish() {
  if (!canPublish.value) return
  isPublishing.value = true
  try {
    const user = getUserId()
    const tags = tagsInput.value ? tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : []

    let thumbnailPath = null
    if (coverTempPath.value) {
      thumbnailPath = await uploadCover()
    }

    const data = await api.post('/publish/upload', {
      userId: user?.id,
      accountIds: selectedAccountIds.value,
      videoPath: props.videoPath,
      thumbnailPath,
      title: title.value,
      description: description.value,
      tags,
      publishType: publishType.value,
      scheduleTime: scheduleTime.value || null,
      bilibiliTid: 95
    })

    uni.showToast({ title: '发布任务已提交', icon: 'success' })

    if (data && data.length > 0) {
      data.forEach(task => {
        currentPublishTasks.value.push({ id: task.id, platform: task.platform, title: title.value, status: 'pending' })
      })
      pollTaskStatus(data[0].id)
    }

    title.value = ''
    description.value = ''
    tagsInput.value = ''
    publishType.value = 'immediate'
    scheduleTime.value = ''
    removeCover()
  } catch (err) {
    uni.showToast({ title: err.message || '发布失败', icon: 'none' })
  } finally {
    isPublishing.value = false
  }
}

async function pollTaskStatus(taskId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    try {
      const task = await api.get(`/publish/tasks/${taskId}`)
      const localTask = currentPublishTasks.value.find(t => t.id === taskId)
      if (localTask) localTask.status = task.status
      if (task.status === 'success') {
        uni.showToast({ title: '视频发布成功！', icon: 'success' })
        return
      } else if (task.status === 'failed') {
        uni.showToast({ title: `发布失败: ${(task.result || '').substring(0, 50)}`, icon: 'none' })
        return
      }
    } catch (err) {}
  }
  uni.showToast({ title: '任务仍在处理中', icon: 'none' })
}

watch(() => props.videoPath, (newPath) => {
  if (newPath && !title.value) {
    const parts = newPath.split('/')
    const filename = parts[parts.length - 1] || '视频'
    title.value = filename.replace(/\.[^.]+$/, '')
  }
})

onMounted(() => {
  fetchPlatforms()
  fetchAccounts()
})
</script>

<style scoped>
.video-publish { width: 100%; }
.video-info { padding: 16rpx 24rpx; background: rgba(102,126,234,0.1); border-radius: 12rpx; margin-bottom: 20rpx; }
.video-info-text { font-size: 24rpx; color: #667eea; }
.empty-hint { padding: 24rpx; text-align: center; margin-bottom: 20rpx; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.form-textarea { width: 100%; height: 180rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.cover-area { display: flex; align-items: center; gap: 16rpx; }
.cover-preview-wrap { position: relative; width: 120rpx; height: 80rpx; border-radius: 8rpx; overflow: hidden; border: 1rpx solid rgba(102,126,234,0.3); }
.cover-preview-img { width: 120rpx; height: 80rpx; }
.cover-remove { position: absolute; top: 0; right: 0; width: 32rpx; height: 32rpx; background: rgba(0,0,0,0.7); border-radius: 0 0 0 8rpx; display: flex; align-items: center; justify-content: center; }
.cover-remove-text { color: #fff; font-size: 20rpx; }
.cover-placeholder { width: 120rpx; height: 80rpx; border-radius: 8rpx; border: 1rpx dashed rgba(102,126,234,0.4); background: rgba(102,126,234,0.08); display: flex; align-items: center; justify-content: center; }
.cover-placeholder-text { color: rgba(255,255,255,0.5); font-size: 22rpx; }
.cover-tip { color: rgba(255,255,255,0.35); font-size: 22rpx; }
.section-divider { height: 1rpx; background: rgba(255,255,255,0.1); margin: 20rpx 0; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 26rpx; color: rgba(255,255,255,0.8); font-weight: 500; }
.add-account-btn { padding: 8rpx 20rpx; background: rgba(102,126,234,0.2); border-radius: 8rpx; }
.add-account-btn-text { font-size: 24rpx; color: #667eea; }
.platform-list { display: flex; gap: 16rpx; flex-wrap: wrap; }
.platform-item { display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 16rpx 24rpx; background: rgba(255,255,255,0.04); border: 1rpx solid rgba(255,255,255,0.08); border-radius: 12rpx; min-width: 120rpx; }
.platform-item.active { background: rgba(102,126,234,0.15); border-color: rgba(102,126,234,0.3); }
.platform-icon { width: 56rpx; height: 56rpx; }
.platform-name { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.account-count { font-size: 20rpx; color: rgba(255,255,255,0.3); }
.account-count.has { color: rgba(102,126,234,0.8); }
.account-section { margin-top: 20rpx; }
.account-group { margin-bottom: 16rpx; }
.account-group-title { font-size: 24rpx; color: rgba(255,255,255,0.5); margin-bottom: 8rpx; }
.account-item { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 16rpx; background: rgba(255,255,255,0.03); border-radius: 8rpx; margin-bottom: 8rpx; }
.account-checkbox { width: 36rpx; height: 36rpx; border-radius: 6rpx; border: 2rpx solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.account-checkbox.checked { background: #667eea; border-color: #667eea; }
.checkbox-mark { color: #fff; font-size: 22rpx; }
.account-name { font-size: 26rpx; color: rgba(255,255,255,0.9); flex: 1; }
.cookie-status { font-size: 22rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.cookie-status.valid { color: #67c23a; background: rgba(103,194,58,0.1); }
.cookie-status.invalid { color: #f56c6c; background: rgba(245,108,108,0.1); }
.account-actions { display: flex; gap: 16rpx; }
.action-link { font-size: 24rpx; color: rgba(255,255,255,0.5); }
.login-link { color: #e6a23c; }
.delete-link { color: #f56c6c; }
.no-account { padding: 12rpx; }
.no-account-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.publish-section { margin-top: 10rpx; }
.publish-type-switch { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.type-option { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; padding: 16rpx 0; border-radius: 12rpx; background: rgba(255,255,255,0.04); border: 1rpx solid rgba(255,255,255,0.1); }
.type-option.active { background: rgba(102,126,234,0.15); border-color: rgba(102,126,234,0.4); }
.type-icon { font-size: 28rpx; }
.type-label { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.type-option.active .type-label { color: #667eea; }
.schedule-row { margin-bottom: 20rpx; }
.publish-btn { width: 100%; height: 88rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 30rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.publish-btn[disabled] { opacity: 0.5; }
.task-section { margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid rgba(255,255,255,0.1); }
.task-item { display: flex; align-items: center; gap: 12rpx; padding: 12rpx 16rpx; background: rgba(255,255,255,0.03); border-radius: 8rpx; margin-bottom: 8rpx; }
.task-platform { font-size: 24rpx; color: rgba(102,126,234,0.9); min-width: 60rpx; }
.task-title { font-size: 24rpx; color: rgba(255,255,255,0.7); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-status { font-size: 22rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.task-status.pending { color: #e6a23c; background: rgba(230,162,60,0.1); }
.task-status.running { color: #409eff; background: rgba(64,158,255,0.1); }
.task-status.success { color: #67c23a; background: rgba(103,194,58,0.1); }
.task-status.failed { color: #f56c6c; background: rgba(245,108,108,0.1); }
.clear-btn { font-size: 24rpx; color: rgba(255,255,255,0.4); }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 999; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 600rpx; background: #1a1a2e; border-radius: 20rpx; padding: 40rpx; }
.modal-title { font-size: 32rpx; color: #fff; font-weight: 600; margin-bottom: 30rpx; text-align: center; }
.platform-select { display: flex; flex-wrap: wrap; gap: 12rpx; }
.platform-option { padding: 12rpx 24rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.1); border-radius: 8rpx; font-size: 24rpx; color: rgba(255,255,255,0.7); display: flex; align-items: center; gap: 8rpx; }
.platform-option-icon { width: 32rpx; height: 32rpx; }
.platform-option.active { background: rgba(102,126,234,0.2); border-color: rgba(102,126,234,0.5); color: #667eea; }
.modal-actions { display: flex; gap: 20rpx; margin-top: 30rpx; }
.modal-btn { flex: 1; height: 72rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.modal-btn.cancel { background: rgba(255,255,255,0.08); }
.modal-btn.confirm { background: #667eea; }
.modal-btn-text { font-size: 28rpx; color: #fff; }
.qrcode-modal { text-align: center; }
.qrcode-tip { margin-bottom: 24rpx; }
.qrcode-tip-text { font-size: 26rpx; color: rgba(255,255,255,0.8); display: block; margin-bottom: 8rpx; }
.qrcode-subtip { font-size: 22rpx; color: rgba(255,255,255,0.4); }
.qrcode-image-wrap { display: flex; justify-content: center; margin: 20rpx 0; }
.qrcode-image { width: 400rpx; height: 400rpx; border-radius: 12rpx; }
.qrcode-loading { padding: 40rpx 0; }
.loading-text { font-size: 26rpx; color: rgba(255,255,255,0.5); }
</style>

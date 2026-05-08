<template>
  <view v-if="showLogin" class="mobile-app-root">
    <LoginRegister @login-success="handleLoginSuccess" />
  </view>
  <view v-else class="mobile-app-container">
    <view class="mobile-header" v-if="activePage === 'home'">
      <view class="mobile-header-left">
        <image src="/static/logo.png" class="mobile-logo" mode="aspectFit" />
        <text class="mobile-header-title">拾光引擎AI-超级IP智能体</text>
      </view>
      <view class="mobile-header-right">
        <view class="mobile-avatar-wrapper" @tap="toggleUserMenu">
          <image :src="getUserAvatar()" class="mobile-avatar-img" mode="aspectFill" @error="handleAvatarError" />
        </view>
      </view>
    </view>

    <view class="mobile-user-dropdown" v-if="showUserMenu">
      <view class="mobile-dropdown-item" @tap="goToMyPage">
        <text class="dropdown-icon">👤</text>
        <text class="dropdown-text">我的</text>
      </view>
      <view class="mobile-dropdown-divider"></view>
      <view class="mobile-dropdown-item logout-item" @tap="handleLogout">
        <text class="dropdown-icon">🚪</text>
        <text class="dropdown-text">退出登录</text>
      </view>
    </view>

    <scroll-view scroll-y class="mobile-main-content">
      <template v-if="activePage === 'home'">
        <view class="columns-wrapper">
          <view class="column">
            <view class="column-header">
              <text class="column-title">文案生成</text>
            </view>
            <view class="column-body">
              <AudioToText @text-generated="handleTextGenerated" @start-task="handleStartTask" />
            </view>
          </view>

          <view class="column">
            <view class="column-header">
              <text class="column-title">配音生成</text>
            </view>
            <view class="column-body">
              <TextToSpeech :input-text="generatedText" @audio-generated="handleAudioGenerated" @start-task="handleStartTask" />
            </view>
          </view>

          <view class="column">
            <view class="column-header">
              <text class="column-title">视频生成</text>
              <view class="driver-toggle">
                <text :class="['driver-text', !useVideoDriver ? 'active' : '']">图片</text>
                <switch :checked="useVideoDriver" @change="onDriverChange" color="#667eea" style="transform: scale(0.7);" />
                <text :class="['driver-text', useVideoDriver ? 'active' : '']">视频</text>
              </view>
            </view>
            <view class="column-body">
              <AvatarVideo :audio-path="generatedAudio" :use-video-driver="useVideoDriver" @video-generated="handleVideoGenerated" @audio-generated="handleAudioGenerated" @start-task="handleStartTask" />
            </view>
          </view>

          <view class="column">
            <view class="column-header">
              <text class="column-title">视频剪辑</text>
              <view class="video-select-row">
                <view class="video-source-btn" @tap="handleClipLocalUpload">
                  <text class="video-source-btn-text">📁 本地上传</text>
                </view>
                <view class="video-source-btn" @tap="toggleClipVideoLibrary">
                  <text class="video-source-btn-text">📚 视频库</text>
                </view>
              </view>
            </view>
            <view class="column-body">
              <view v-if="showClipVideoLibraryDropdown" class="video-library-dropdown">
                <view class="dropdown-header">
                  <text class="dropdown-header-text">选择视频</text>
                  <text class="close-dropdown-btn" @tap="showClipVideoLibraryDropdown = false">✕</text>
                </view>
                <scroll-view scroll-y class="dropdown-list">
                  <view class="dropdown-item" v-for="video in videoLibraryList" :key="video.id" @tap="selectClipVideoFromLibrary(video)">
                    <text class="dropdown-item-text">{{ video.title || '未命名' }}</text>
                  </view>
                  <view v-if="videoLibraryList.length === 0" class="empty-state">
                    <text class="empty-state-text">暂无视频</text>
                  </view>
                </scroll-view>
              </view>
              <VideoClip :video-path="clipVideo" @start-task="handleStartTask" />
            </view>
          </view>

          <view class="column">
            <view class="column-header">
              <text class="column-title">视频发布</text>
              <view class="video-select-row">
                <view class="video-source-btn" @tap="handlePublishLocalUpload">
                  <text class="video-source-btn-text">📁 本地上传</text>
                </view>
                <view class="video-source-btn" @tap="togglePublishVideoLibrary">
                  <text class="video-source-btn-text">📚 视频库</text>
                </view>
              </view>
            </view>
            <view class="column-body">
              <view v-if="showPublishVideoLibraryDropdown" class="video-library-dropdown">
                <view class="dropdown-header">
                  <text class="dropdown-header-text">选择视频</text>
                  <text class="close-dropdown-btn" @tap="showPublishVideoLibraryDropdown = false">✕</text>
                </view>
                <scroll-view scroll-y class="dropdown-list">
                  <view class="dropdown-item" v-for="video in videoLibraryList" :key="video.id" @tap="selectPublishVideoFromLibrary(video)">
                    <text class="dropdown-item-text">{{ video.title || '未命名' }}</text>
                  </view>
                  <view v-if="videoLibraryList.length === 0" class="empty-state">
                    <text class="empty-state-text">暂无视频</text>
                  </view>
                </scroll-view>
              </view>
              <VideoPublish :video-path="publishVideo" />
            </view>
          </view>

          <view style="height: 40rpx;"></view>
        </view>
      </template>

      <template v-else-if="activePage === 'materialLibrary'">
        <MaterialLibrary @back="goBack" @open-library="handleOpenLibrary" />
      </template>

      <template v-else-if="activePage === 'libraryView'">
        <LibraryView :library-key="currentLibraryKey" @back="handleLibraryViewBack" />
      </template>

      <template v-else-if="activePage === 'my'">
        <view class="mobile-settings-wrapper">
          <view class="mobile-crud-header">
            <text class="mobile-back-btn" @tap="goBack">← 返回</text>
            <text class="mobile-crud-title">我的</text>
          </view>
          <SystemSettings />
        </view>
      </template>
    </scroll-view>

    <view class="mobile-bottom-nav">
      <view
        v-for="menu in bottomMenuItems"
        :key="menu.key"
        :class="['nav-item', { active: activeMenu === menu.key }]"
        @tap="handleBottomNavClick(menu)"
      >
        <text class="nav-icon">{{ menu.icon }}</text>
        <text class="nav-label">{{ menu.label }}</text>
      </view>
    </view>

    <TaskProgressDialog
      :visible="showTaskDialog"
      :task-type="currentTaskInfo.taskType"
      :task-name="currentTaskInfo.taskName"
      :status="currentTaskInfo.status"
      :progress="currentTaskInfo.progress"
      :progress-message="currentTaskInfo.progressMessage"
      :error-message="currentTaskInfo.errorMessage"
      :success-message="currentTaskInfo.successMessage"
      :is-cancelling="currentTaskInfo.isCancelling"
      @confirm="handleTaskConfirm"
      @cancel="handleTaskCancel"
      @close="handleTaskClose"
    />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AudioToText from '../../components/AudioToText.vue'
import TextToSpeech from '../../components/TextToSpeech.vue'
import AvatarVideo from '../../components/AvatarVideo.vue'
import VideoClip from '../../components/VideoClip.vue'
import VideoPublish from '../../components/VideoPublish.vue'
import LoginRegister from '../../components/LoginRegister.vue'
import SystemSettings from '../../components/SystemSettings.vue'
import MaterialLibrary from '../../components/MaterialLibrary.vue'
import LibraryView from '../../components/LibraryView.vue'
import TaskProgressDialog from '../../components/TaskProgressDialog.vue'
import { useTaskManager } from '../../composables/useTaskManager.js'
import api, { uploadFile } from '../../api/index.js'
import { resolveMediaUrl } from '../../utils/media.js'

const showLogin = ref(true)
const generatedText = ref('')
const generatedAudio = ref('')
const clipVideo = ref('')
const publishVideo = ref('')
const useVideoDriver = ref(false)
const activeMenu = ref('首页')
const currentUser = ref(null)
const showUserMenu = ref(false)
const activePage = ref('home')
const videoLibraryList = ref([])
const showClipVideoLibraryDropdown = ref(false)
const showPublishVideoLibraryDropdown = ref(false)
const currentLibrary = ref('')
const currentLibraryKey = ref('')
const taskManager = useTaskManager()

const showTaskDialog = ref(false)
const currentTaskInfo = ref({
  taskType: '', taskName: '', status: 'pending', progress: 0,
  errorMessage: '', successMessage: '', isCancelling: false, progressMessage: ''
})

taskManager.subscribe((newState) => {
  showTaskDialog.value = newState.isActive
  currentTaskInfo.value = { ...newState }
})

const bottomMenuItems = ref([
  { key: '首页', label: '首页', icon: '🏠', page: 'home' },
  { key: '素材库', label: '素材库', icon: '📚', page: 'materialLibrary' },
  { key: '我的', label: '我的', icon: '👤', page: 'my' }
])

function getCurrentUser() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

function getUserAvatar() {
  const user = getCurrentUser()
  if (user && user.avatar) return resolveMediaUrl(user.avatar)
  return 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'
}

function handleLoginSuccess() {
  showLogin.value = false
  currentUser.value = getCurrentUser()
}

function handleAvatarError() {}

function toggleUserMenu() { showUserMenu.value = !showUserMenu.value }

function goToMyPage() {
  showUserMenu.value = false
  activeMenu.value = '我的'
  activePage.value = 'my'
}

function goBack() {
  activeMenu.value = '首页'
  activePage.value = 'home'
}

function handleLogout() {
  showUserMenu.value = false
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('token')
  uni.showToast({ title: '已退出登录', icon: 'success' })
  setTimeout(() => { showLogin.value = true }, 300)
}

function checkAuth() {
  const user = getCurrentUser()
  if (user) { showLogin.value = false; currentUser.value = user }
  else { showLogin.value = true }
}

function onDriverChange(e) { useVideoDriver.value = e.detail.value }

function handleBottomNavClick(menu) {
  if (menu.page) {
    activePage.value = menu.page
    activeMenu.value = menu.key
  }
}

function handleOpenLibrary(library) {
  if (library?.key) {
    currentLibraryKey.value = library.key
    activePage.value = 'libraryView'
  }
}

function handleLibraryViewBack() {
  currentLibraryKey.value = ''
  activePage.value = 'materialLibrary'
  activeMenu.value = '素材库'
}

function handleTextGenerated(text) { generatedText.value = text }
function handleAudioGenerated(audioPath) { generatedAudio.value = audioPath }
function handleVideoGenerated(videoPath) { clipVideo.value = videoPath; publishVideo.value = videoPath }

function handleStartTask(taskName, asyncFn) {
  taskManager.startTask(taskName, taskName, null)
  taskManager.executeAfterConfirm(asyncFn)
}

async function fetchVideoLibrary() {
  try {
    const user = getCurrentUser()
    const result = await api.get('/work-library', user?.id ? { userId: user.id } : {})
    videoLibraryList.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
  } catch (err) { videoLibraryList.value = [] }
}

function handleClipLocalUpload() {
  uni.chooseVideo({
    sourceType: ['album', 'camera'],
    success: async (res) => {
      clipVideo.value = res.tempFilePath
      try {
        uni.showLoading({ title: '上传中...' })
        const uploadResult = await uploadFile('/clips/upload-video', res.tempFilePath, 'video')
        if (uploadResult.videoUrl) clipVideo.value = uploadResult.videoUrl
      } catch (e) {
        uni.showToast({ title: '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

function toggleClipVideoLibrary() { showClipVideoLibraryDropdown.value = !showClipVideoLibraryDropdown.value }

function selectClipVideoFromLibrary(video) {
  if (video && video.videoPath) clipVideo.value = resolveMediaUrl(video.videoPath)
  showClipVideoLibraryDropdown.value = false
}

function handlePublishLocalUpload() {
  uni.chooseVideo({
    sourceType: ['album', 'camera'],
    success: async (res) => {
      publishVideo.value = res.tempFilePath
      try {
        uni.showLoading({ title: '上传中...' })
        const uploadResult = await uploadFile('/clips/upload-video', res.tempFilePath, 'video')
        if (uploadResult.videoUrl) publishVideo.value = uploadResult.videoUrl
      } catch (e) {
        uni.showToast({ title: '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

function togglePublishVideoLibrary() { showPublishVideoLibraryDropdown.value = !showPublishVideoLibraryDropdown.value }

function selectPublishVideoFromLibrary(video) {
  if (video && video.videoPath) publishVideo.value = resolveMediaUrl(video.videoPath)
  showPublishVideoLibraryDropdown.value = false
}

onMounted(() => {
  checkAuth()
  fetchVideoLibrary()
  if (taskManager.restoreTask()) console.log('检测到未完成的任务，已恢复显示')
})

function handleTaskConfirm() { taskManager.confirmTask() }
async function handleTaskCancel() { await taskManager.cancelTask() }
function handleTaskClose() { taskManager.closeDialog() }
</script>

<style scoped>
.mobile-app-root { width: 100vw; height: 100vh; overflow: hidden; }
.mobile-app-container { width: 100%; max-width: 100vw; min-height: 100vh; display: flex; flex-direction: column; background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%); background-attachment: fixed; position: relative; overflow-x: hidden; box-sizing: border-box; }
.mobile-header { padding: 24rpx 32rpx; display: flex; justify-content: space-between; align-items: center; background: rgba(20,20,40,0.95); border-bottom: 1rpx solid rgba(102,126,234,0.2); position: sticky; top: 0; z-index: 100; }
.mobile-header-left { display: flex; align-items: center; gap: 20rpx; }
.mobile-logo { width: 72rpx; height: 72rpx; border-radius: 16rpx; }
.mobile-header-title { font-size: 32rpx; font-weight: 700; background: linear-gradient(135deg,#667eea,#764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.mobile-header-right { display: flex; align-items: center; }
.mobile-avatar-wrapper { position: relative; }
.mobile-avatar-img { width: 64rpx; height: 64rpx; border-radius: 50%; border: 4rpx solid rgba(102,126,234,0.5); }
.mobile-user-dropdown { position: absolute; top: 112rpx; right: 32rpx; min-width: 320rpx; background: rgba(30,30,60,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; overflow: hidden; box-shadow: 0 16rpx 64rpx rgba(0,0,0,0.4); z-index: 1000; }
.mobile-dropdown-item { display: flex; align-items: center; gap: 20rpx; padding: 24rpx 32rpx; }
.mobile-dropdown-item:active { background: rgba(102,126,234,0.15); }
.dropdown-icon { font-size: 32rpx; }
.dropdown-text { font-size: 28rpx; color: rgba(255,255,255,0.9); }
.mobile-dropdown-divider { height: 2rpx; background: rgba(255,255,255,0.1); margin: 8rpx 0; }
.logout-item:active { background: rgba(245,87,108,0.15); }
.mobile-main-content { flex: 1; padding: 32rpx; padding-bottom: 160rpx; width: 100%; max-width: 100%; overflow-x: hidden; box-sizing: border-box; }
.columns-wrapper { display: flex; flex-direction: column; gap: 32rpx; width: 100%; max-width: 100%; overflow-x: hidden; box-sizing: border-box; }
.column { background: rgba(30,30,60,0.7); border-radius: 32rpx; border: 1rpx solid rgba(102,126,234,0.3); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8rpx 60rpx rgba(0,0,0,0.2); }
.column-header { padding: 24rpx; background: rgba(0,0,0,0.2); border-bottom: 1rpx solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; position: relative; flex-wrap: wrap; gap: 12rpx; }
.column-header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6rpx; background: linear-gradient(135deg,#667eea,#764ba2); }
.column-title { font-size: 30rpx; font-weight: 600; background: linear-gradient(135deg,#667eea,#764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.column-body { padding: 24rpx; width: 100%; max-width: 100%; overflow-x: hidden; box-sizing: border-box; }
.video-select-row { display: flex; align-items: center; gap: 20rpx; }
.video-source-btn { background: linear-gradient(135deg,#667eea,#764ba2); padding: 12rpx 28rpx; border-radius: 16rpx; box-shadow: 0 4rpx 30rpx rgba(102,126,234,0.3); }
.video-source-btn:active { opacity: 0.8; }
.video-source-btn-text { color: #fff; font-size: 24rpx; font-weight: 500; }
.driver-toggle { display: flex; align-items: center; gap: 16rpx; }
.driver-text { font-size: 26rpx; color: rgba(255,255,255,0.4); font-weight: 500; }
.driver-text.active { color: rgba(255,255,255,0.95); font-weight: 600; }
.video-library-dropdown { margin-bottom: 24rpx; background: rgba(30,30,60,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; overflow: hidden; box-shadow: 0 16rpx 60rpx rgba(0,0,0,0.4); z-index: 100; }
.dropdown-header { padding: 24rpx 32rpx; background: rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center; border-bottom: 1rpx solid rgba(255,255,255,0.1); }
.dropdown-header-text { font-weight: 500; color: #fff; font-size: 28rpx; }
.close-dropdown-btn { color: rgba(255,255,255,0.6); font-size: 32rpx; padding: 8rpx 16rpx; }
.dropdown-list { max-height: 360rpx; padding: 8rpx; }
.dropdown-item { padding: 20rpx 28rpx; border-radius: 16rpx; }
.dropdown-item:active { background: rgba(102,126,234,0.2); }
.dropdown-item-text { color: rgba(255,255,255,0.8); font-size: 28rpx; }
.empty-state { padding: 48rpx; text-align: center; }
.empty-state-text { color: rgba(255,255,255,0.5); font-size: 28rpx; }
.mobile-settings-wrapper { display: flex; flex-direction: column; height: 100%; }
.mobile-crud-header { display: flex; align-items: center; gap: 24rpx; padding: 24rpx 32rpx; background: rgba(20,20,40,0.95); border-bottom: 1rpx solid rgba(255,255,255,0.1); }
.mobile-back-btn { color: #fff; font-size: 32rpx; padding: 16rpx 24rpx; border-radius: 16rpx; }
.mobile-crud-title { color: #fff; font-size: 32rpx; font-weight: 600; }
.mobile-bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-around; align-items: center; background: rgba(20,20,40,0.95); border-top: 1rpx solid rgba(102,126,234,0.2); padding: 16rpx 0; padding-bottom: calc(16rpx + env(safe-area-inset-bottom)); z-index: 100; }
.nav-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 16rpx 24rpx; border-radius: 16rpx; }
.nav-item.active { background: rgba(102,126,234,0.15); }
.nav-icon { font-size: 40rpx; }
.nav-label { font-size: 22rpx; font-weight: 500; color: rgba(255,255,255,0.6); }
.nav-item.active .nav-label { color: #667eea; }
</style>

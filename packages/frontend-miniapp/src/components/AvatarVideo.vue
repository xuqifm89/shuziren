<template>
  <view class="avatar-video">
    <view class="form-group">
      <view class="form-label-row">
        <text class="form-label">{{ useVideoDriver ? '选择肖像视频' : '选择图片' }}</text>
        <text class="form-action" @tap="handleUploadPortrait">上传{{ useVideoDriver ? '肖像素材' : '图片' }}</text>
      </view>
      <scroll-view scroll-x class="horizontal-scroll" v-if="avatarList.length > 0">
        <view :class="['avatar-card', selectedAvatar && selectedAvatar.id === a.id ? 'active' : '']" v-for="a in avatarList" :key="a.id" @tap="selectedAvatar = a">
          <image v-if="a.type !== 'video' && a.fileUrl" :src="resolveMediaUrl(a.fileUrl)" class="avatar-img" mode="aspectFill" />
          <view v-else-if="a.type === 'video'" class="avatar-video-thumb">
            <image v-if="a.thumbnailUrl" :src="resolveMediaUrl(a.thumbnailUrl)" class="avatar-img" mode="aspectFill" />
            <view v-else class="avatar-video-placeholder">
              <text class="video-icon">▶</text>
            </view>
            <view class="avatar-video-badge">🎬</view>
          </view>
          <view v-else class="avatar-placeholder">👤</view>
        </view>
      </scroll-view>
      <view v-else class="empty-hint"><text class="empty-text">暂无肖像</text></view>
    </view>
    <view class="form-group">
      <view class="form-label-row">
        <text class="form-label">选择音频</text>
        <text class="form-action" @tap="handleUploadDubbing">上传配音</text>
      </view>
      <scroll-view scroll-x class="horizontal-scroll" v-if="dubbingList.length > 0">
        <view :class="['voice-card', selectedDubbing && selectedDubbing.id === d.id ? 'active' : '']" v-for="d in dubbingList" :key="d.id" @tap="selectedDubbing = d">
          <text class="voice-name">{{ d.fileName || d.name || '配音' }}</text>
        </view>
      </scroll-view>
      <view v-else class="empty-hint"><text class="empty-text">暂无配音</text></view>
    </view>
    <button class="action-btn" @tap="handleGenerate" :disabled="!selectedAvatar || !selectedDubbing">
      生成视频
    </button>
    <view v-if="videoPath" class="result-section">
      <view class="result-header">
        <text class="result-label">视频结果</text>
        <view class="result-btns">
          <text class="result-btn" @tap="playVideo">播放</text>
          <text class="result-btn primary" @tap="useVideo">使用此视频</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api, { uploadFile } from '../api/index.js'
import { resolveMediaUrl } from '../utils/media.js'

const props = defineProps({
  audioPath: { type: String, default: '' },
  useVideoDriver: { type: Boolean, default: false }
})
const emit = defineEmits(['video-generated', 'audio-generated', 'start-task'])

const avatarList = ref([])
const selectedAvatar = ref(null)
const dubbingList = ref([])
const selectedDubbing = ref(null)
const isGenerating = ref(false)
const videoPath = ref('')

function getUserId() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

async function loadData() {
  const user = getUserId()
  try {
    const params = { ...(user?.id ? { userId: user.id } : {}) }
    if (props.useVideoDriver) params.type = 'video'
    else params.type = 'image'
    const [pRes, dRes] = await Promise.allSettled([
      api.get('/portrait-library', params),
      api.get('/dubbing-library', user?.id ? { userId: user.id } : {})
    ])
    if (pRes.status === 'fulfilled') {
      const raw = pRes.value
      const list = Array.isArray(raw) ? raw : (raw?.list || raw?.data || [])
      avatarList.value = list
    }
    if (dRes.status === 'fulfilled') {
      const raw = dRes.value
      dubbingList.value = Array.isArray(raw) ? raw : (raw?.list || raw?.data || [])
    }
  } catch (e) {
    console.error('loadData error', e)
  }
}

watch(() => props.useVideoDriver, () => { selectedAvatar.value = null; loadData() })
watch(() => props.audioPath, (val) => { if (val) { const match = dubbingList.value.find(d => (d.fileUrl || d.filePath) === val); if (match) selectedDubbing.value = match } })

onMounted(() => loadData())

function handleUploadPortrait() {
  if (props.useVideoDriver) {
    uni.chooseVideo({ sourceType: ['album', 'camera'], success: async (res) => {
      try {
        uni.showLoading({ title: '上传中...' })
        const uploadResult = await uploadFile('/portrait-library/upload', res.tempFilePath, 'video', { type: 'video' })
        if (uploadResult.success || uploadResult.id) {
          const user = getUserId()
          await api.post('/portrait-library', { userId: user?.id, fileName: '肖像视频', fileUrl: uploadResult.fileUrl || uploadResult.url, type: 'video', isPublic: false })
          uni.showToast({ title: '上传成功', icon: 'success' }); loadData()
        }
      } catch (err) { uni.showToast({ title: '上传失败', icon: 'none' }) } finally { uni.hideLoading() }
    }})
  } else {
    uni.chooseImage({ count: 1, success: async (res) => {
      const file = res.tempFiles[0]
      try {
        uni.showLoading({ title: '上传中...' })
        const uploadResult = await uploadFile('/portrait-library/upload', file.path, 'image', { type: 'image' })
        if (uploadResult.success || uploadResult.id) {
          const user = getUserId()
          await api.post('/portrait-library', { userId: user?.id, fileName: '肖像图片', fileUrl: uploadResult.fileUrl || uploadResult.url, type: 'image', isPublic: false })
          uni.showToast({ title: '上传成功', icon: 'success' }); loadData()
        }
      } catch (err) { uni.showToast({ title: '上传失败', icon: 'none' }) } finally { uni.hideLoading() }
    }})
  }
}

function handleUploadDubbing() {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.wav,.mp3,.ogg'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      uni.showLoading({ title: '上传中...' })
      const uploadResult = await uploadFile('/dubbing-library/upload', file, 'audio')
      if (uploadResult.success || uploadResult.id) {
        const user = getUserId()
        await api.post('/dubbing-library', { userId: user?.id, fileName: file.name || '配音', fileUrl: uploadResult.fileUrl || uploadResult.url, isPublic: false })
        uni.showToast({ title: '上传成功', icon: 'success' }); loadData()
      }
    } catch (err) { uni.showToast({ title: '上传失败', icon: 'none' }) } finally { uni.hideLoading() }
  }
  input.click()
  // #endif
  // #ifndef H5
  uni.chooseMessageFile({ count: 1, type: 'file', extension: ['.wav', '.mp3', '.ogg'], success: async (res) => {
    const file = res.tempFiles[0]
    try {
      uni.showLoading({ title: '上传中...' })
      const uploadResult = await uploadFile('/dubbing-library/upload', file.path, 'audio')
      if (uploadResult.success || uploadResult.id) {
        const user = getUserId()
        await api.post('/dubbing-library', { userId: user?.id, fileName: file.name || '配音', fileUrl: uploadResult.fileUrl || uploadResult.url, isPublic: false })
        uni.showToast({ title: '上传成功', icon: 'success' }); loadData()
      }
    } catch (err) { uni.showToast({ title: '上传失败', icon: 'none' }) } finally { uni.hideLoading() }
  }})
  // #endif
}

async function handleGenerate() {
  if (!selectedAvatar.value || !selectedDubbing.value) { uni.showToast({ title: '请选择肖像和配音', icon: 'none' }); return }
  const taskName = props.useVideoDriver ? '视频驱动生成' : '图片驱动生成'
  emit('start-task', taskName, async () => {
    const user = getUserId()
    const endpoint = props.useVideoDriver ? '/audio/generate-video-to-video' : '/audio/generate-image-to-video'
    const payload = props.useVideoDriver
      ? { videoFileUrl: selectedAvatar.value.fileUrl || selectedAvatar.value.filePath, audioFileUrl: selectedDubbing.value.fileUrl || selectedDubbing.value.filePath, userId: user?.id }
      : { imageFileUrl: selectedAvatar.value.fileUrl || selectedAvatar.value.filePath, audioFileUrl: selectedDubbing.value.fileUrl || selectedDubbing.value.filePath, userId: user?.id }
    const result = await api.post(endpoint, payload)
    const url = result.videoUrl || result.data?.videoUrl || result.url || result.fileUrl || ''
    if (url) { videoPath.value = url; emit('video-generated', url); return { success: true, message: '视频生成成功' } }
    return { success: false, message: '视频生成中，请稍后在视频库查看' }
  })
}

function playVideo() {
  if (videoPath.value) uni.navigateTo({ url: `/pages/video-player/index?url=${encodeURIComponent(resolveMediaUrl(videoPath.value))}` })
}

function useVideo() { emit('video-generated', videoPath.value) }
</script>

<style scoped>
.avatar-video { width: 100%; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.form-action { font-size: 24rpx; color: #667eea; }
.horizontal-scroll { white-space: nowrap; }
.avatar-card { display: inline-block; width: 120rpx; height: 120rpx; margin-right: 12rpx; border-radius: 12rpx; overflow: hidden; border: 2rpx solid rgba(255,255,255,0.08); position: relative; }
.avatar-card.active { border-color: #667eea; box-shadow: 0 0 0 2rpx rgba(102,126,234,0.3); }
.avatar-img { width: 100%; height: 100%; }
.avatar-placeholder { width: 100%; height: 100%; background: rgba(102,126,234,0.1); display: flex; align-items: center; justify-content: center; font-size: 36rpx; }
.avatar-video-thumb { width: 100%; height: 100%; position: relative; }
.avatar-video-placeholder { width: 100%; height: 100%; background: rgba(102,126,234,0.15); display: flex; align-items: center; justify-content: center; }
.video-icon { font-size: 32rpx; color: rgba(255,255,255,0.6); }
.avatar-video-badge { position: absolute; bottom: 4rpx; right: 4rpx; font-size: 18rpx; }
.voice-card { display: inline-flex; align-items: center; padding: 16rpx 24rpx; margin-right: 12rpx; background: rgba(255,255,255,0.04); border: 1rpx solid rgba(255,255,255,0.08); border-radius: 12rpx; }
.voice-card.active { background: rgba(102,126,234,0.15); border-color: rgba(102,126,234,0.3); }
.voice-name { font-size: 24rpx; color: rgba(255,255,255,0.8); max-width: 200rpx; overflow: hidden; text-overflow: ellipsis; }
.empty-hint { padding: 24rpx; text-align: center; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.action-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.action-btn[disabled] { opacity: 0.5; }
.result-section { margin-top: 20rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; padding: 20rpx; border: 1rpx solid rgba(102,126,234,0.2); }
.result-header { display: flex; justify-content: space-between; align-items: center; }
.result-label { font-size: 24rpx; color: #667eea; font-weight: 600; }
.result-btns { display: flex; gap: 16rpx; }
.result-btn { font-size: 22rpx; color: rgba(255,255,255,0.6); padding: 4rpx 12rpx; background: rgba(255,255,255,0.06); border-radius: 6rpx; }
.result-btn.primary { color: #667eea; }
</style>

<template>
  <view class="avatar-video">
    <template v-if="!useVideoDriver">
      <view class="form-group">
        <view class="form-label-row">
          <text class="form-label">选择图片</text>
          <text class="form-action" @tap="handleUploadImage">上传图片</text>
        </view>
        <scroll-view scroll-x class="horizontal-scroll" v-if="imageList.length > 0">
          <view :class="['avatar-card', selectedAvatar && selectedAvatar.id === a.id ? 'active' : '']" v-for="a in imageList" :key="a.id" @tap="selectAvatar(a)">
            <image :src="resolveMediaUrl(a.fileUrl)" class="avatar-img" mode="aspectFill" />
          </view>
        </scroll-view>
        <view v-else class="empty-hint"><text class="empty-text">暂无图片</text></view>
      </view>
    </template>

    <template v-else>
      <view class="form-group">
        <view class="form-label-row">
          <text class="form-label">选择肖像视频</text>
          <text class="form-action" @tap="handleUploadPortrait">上传肖像素材</text>
        </view>
        <scroll-view scroll-x class="horizontal-scroll" v-if="videoList.length > 0">
          <view :class="['avatar-card', selectedAvatar && selectedAvatar.id === a.id ? 'active' : '']" v-for="a in videoList" :key="a.id" @tap="selectAvatar(a)">
            <view class="avatar-video-thumb">
              <video :src="resolveMediaUrl(a.fileUrl)" class="avatar-video-mini" muted :show-center-play-btn="false" :show-play-btn="false" :controls="false" :enable-progress-gesture="false" object-fit="cover" />
              <view class="avatar-play-btn" @tap.stop="previewAvatar(a)">▶</view>
              <view v-if="selectedAvatar && selectedAvatar.id === a.id" class="avatar-check">✓</view>
            </view>
          </view>
        </scroll-view>
        <view v-else class="empty-hint"><text class="empty-text">暂无肖像视频</text></view>
      </view>
    </template>

    <view class="form-group">
      <view class="form-label-row">
        <text class="form-label">选择音频</text>
        <text class="form-action" @tap="handleUploadDubbing">上传配音</text>
      </view>
      <scroll-view scroll-x class="horizontal-scroll" v-if="dubbingList.length > 0">
        <view :class="['voice-card', selectedDubbing && selectedDubbing.id === d.id ? 'active' : '']" v-for="d in dubbingList" :key="d.id" @tap="selectedDubbing = d">
          <text class="voice-name">{{ d.fileName || d.name || '配音' }}</text>
          <text :class="['voice-play', playingDubbingId === d.id ? 'playing' : '']" @tap.stop="playDubbingPreview(d)">{{ playingDubbingId === d.id ? '⏹' : '▶' }}</text>
        </view>
      </scroll-view>
      <view v-else class="empty-hint"><text class="empty-text">暂无配音</text></view>
    </view>

    <button class="action-btn" @tap="handleGenerate" :disabled="!selectedAvatar || !selectedDubbing">
      生成视频
    </button>

    <view class="video-player">
      <view class="player-header">
        <text class="player-label">视频结果</text>
        <view class="player-btns" v-if="videoPath">
          <text class="player-action-btn" @tap="useVideo">使用此视频</text>
        </view>
      </view>
      <view v-if="videoPath" class="player-video-wrap">
        <video :src="resolveMediaUrl(videoPath)" :key="videoPath" class="player-video" controls :show-center-play-btn="true" :autoplay="false" object-fit="contain" />
      </view>
      <view v-else class="player-empty">
        <text class="player-empty-text">生成视频后将在此播放</text>
      </view>
    </view>

    <view v-if="showPreviewModal" class="preview-modal-overlay" @tap="closePreviewModal">
      <view class="preview-modal-content" @tap.stop>
        <view class="preview-modal-close" @tap="closePreviewModal">✕</view>
        <template v-if="previewFileType === 'video'">
          <video :src="previewFileUrl" controls class="preview-media" :show-center-play-btn="true" object-fit="contain" @tap.stop />
        </template>
        <template v-else>
          <image :src="previewFileUrl" class="preview-media-img" mode="aspectFit" @tap="closePreviewModal" />
        </template>
        <text class="preview-modal-hint">点击空白区域关闭</text>
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

const imageList = ref([])
const videoList = ref([])
const selectedAvatar = ref(null)
const dubbingList = ref([])
const selectedDubbing = ref(null)
const videoPath = ref(uni.getStorageSync('avatarVideo_videoPath') || '')
const playingDubbingId = ref(null)

const showPreviewModal = ref(false)
const previewFileUrl = ref('')
const previewFileType = ref('image')

let innerAudioCtx = null

watch(videoPath, (val) => { uni.setStorageSync('avatarVideo_videoPath', val) })

function getUserId() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

async function loadData() {
  const user = getUserId()
  try {
    const params = { ...(user?.id ? { userId: user.id } : {}) }
    const [pRes, dRes] = await Promise.allSettled([
      api.get('/portrait-library', params),
      api.get('/dubbing-library', user?.id ? { userId: user.id } : {})
    ])
    if (pRes.status === 'fulfilled') {
      const raw = pRes.value
      const list = Array.isArray(raw) ? raw : (raw?.list || raw?.data || [])
      imageList.value = list.filter(item => item.type !== 'video')
      videoList.value = list.filter(item => item.type === 'video')
    }
    if (dRes.status === 'fulfilled') {
      const raw = dRes.value
      dubbingList.value = Array.isArray(raw) ? raw : (raw?.list || raw?.data || [])
    }
  } catch (e) {
    console.error('loadData error', e)
  }
}

function selectAvatar(a) {
  selectedAvatar.value = a
}

function previewAvatar(a) {
  if (a) {
    previewFileUrl.value = resolveMediaUrl(a.fileUrl)
    previewFileType.value = a.type || 'video'
    showPreviewModal.value = true
  }
}

function closePreviewModal() {
  showPreviewModal.value = false
  previewFileUrl.value = ''
}

function playDubbingPreview(d) {
  if (playingDubbingId.value === d.id) {
    if (innerAudioCtx) { innerAudioCtx.stop(); innerAudioCtx.destroy(); innerAudioCtx = null }
    playingDubbingId.value = null
    return
  }
  if (innerAudioCtx) { innerAudioCtx.stop(); innerAudioCtx.destroy(); innerAudioCtx = null }
  const url = d.fileUrl || d.filePath
  if (url) {
    playingDubbingId.value = d.id
    innerAudioCtx = uni.createInnerAudioContext()
    innerAudioCtx.src = resolveMediaUrl(url)
    innerAudioCtx.onEnded(() => { playingDubbingId.value = null; innerAudioCtx = null })
    innerAudioCtx.onError(() => { playingDubbingId.value = null; innerAudioCtx = null })
    innerAudioCtx.onStop(() => { playingDubbingId.value = null })
    innerAudioCtx.play()
  }
}

watch(() => props.useVideoDriver, () => { selectedAvatar.value = null; loadData() })
watch(() => props.audioPath, (val) => { if (val) { const match = dubbingList.value.find(d => (d.fileUrl || d.filePath) === val); if (match) selectedDubbing.value = match } })

onMounted(() => loadData())

function handleUploadImage() {
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

function handleUploadPortrait() {
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
}

function handleUploadDubbing() {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'audio/*,.wav,.mp3,.ogg'
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
    const submitResult = await api.post(endpoint, payload)
    const taskId = submitResult.taskId
    if (!taskId) {
      const url = submitResult.videoUrl || submitResult.data?.videoUrl || submitResult.url || submitResult.fileUrl || ''
      if (url) { videoPath.value = url; emit('video-generated', url); return { success: true, message: '视频生成成功' } }
      return { success: false, message: '提交任务失败' }
    }
    const maxPolls = 120
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try {
        const task = await api.get(`/tasks/${taskId}`)
        if (task.status === 'success') {
          const url = task.outputUrl || task.result?.videoUrl || task.result?.url || ''
          if (url) { videoPath.value = url; emit('video-generated', url) }
          return { success: true, message: url ? '视频生成成功' : '视频生成完成，请稍后在视频库查看' }
        }
        if (task.status === 'error' || task.status === 'failed') {
          return { success: false, message: task.errorMessage || '视频生成失败' }
        }
        if (task.status === 'cancelled') {
          return { success: false, message: '任务已取消' }
        }
      } catch (e) {
        console.warn('轮询任务状态失败:', e.message)
      }
    }
    return { success: false, message: '视频生成超时，请稍后在视频库查看' }
  })
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

.avatar-card { display: inline-block; width: 140rpx; height: 140rpx; margin-right: 12rpx; border-radius: 12rpx; overflow: hidden; border: 2rpx solid rgba(255,255,255,0.08); position: relative; }
.avatar-card.active { border-color: #667eea; box-shadow: 0 0 0 2rpx rgba(102,126,234,0.3); }
.avatar-img { width: 100%; height: 100%; }

.avatar-video-thumb { width: 100%; height: 100%; position: relative; }
.avatar-video-mini { width: 100%; height: 100%; }
.avatar-play-btn { position: absolute; right: 6rpx; bottom: 6rpx; width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); color: #fff; font-size: 20rpx; border-radius: 50%; }
.avatar-check { position: absolute; left: 6rpx; top: 6rpx; width: 36rpx; height: 36rpx; display: flex; align-items: center; justify-content: center; background: #667eea; color: #fff; font-size: 20rpx; border-radius: 50%; }

.voice-card { display: inline-flex; align-items: center; padding: 16rpx 24rpx; margin-right: 12rpx; background: rgba(255,255,255,0.04); border: 1rpx solid rgba(255,255,255,0.08); border-radius: 12rpx; }
.voice-card.active { background: rgba(102,126,234,0.15); border-color: rgba(102,126,234,0.3); }
.voice-name { font-size: 24rpx; color: rgba(255,255,255,0.8); max-width: 200rpx; overflow: hidden; text-overflow: ellipsis; }
.voice-play { font-size: 22rpx; color: #667eea; padding: 8rpx 16rpx; background: rgba(102,126,234,0.1); border-radius: 8rpx; margin-left: 12rpx; }
.voice-play.playing { color: #f56c6c; background: rgba(245,108,108,0.15); }

.empty-hint { padding: 24rpx; text-align: center; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.action-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.action-btn[disabled] { opacity: 0.5; }

.video-player { margin-top: 24rpx; background: rgba(0,0,0,0.3); border-radius: 16rpx; padding: 24rpx; border: 1rpx solid rgba(102,126,234,0.2); }
.player-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.player-label { font-size: 24rpx; color: #667eea; font-weight: 600; }
.player-btns { display: flex; gap: 16rpx; }
.player-action-btn { font-size: 24rpx; color: #fff; padding: 10rpx 20rpx; background: rgba(102,126,234,0.3); border-radius: 8rpx; }
.player-video-wrap { border-radius: 12rpx; overflow: hidden; }
.player-video { width: 100%; height: 400rpx; }
.player-empty { padding: 48rpx 0; text-align: center; }
.player-empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }

.preview-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.preview-modal-content { width: 90%; max-width: 680rpx; position: relative; }
.preview-modal-close { position: absolute; top: -60rpx; right: 0; width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 36rpx; z-index: 10; background: rgba(255,255,255,0.1); border-radius: 50%; }
.preview-media { width: 100%; max-height: 70vh; border-radius: 16rpx; }
.preview-media-img { width: 100%; max-height: 70vh; border-radius: 16rpx; }
.preview-modal-hint { text-align: center; margin-top: 20rpx; font-size: 22rpx; color: rgba(255,255,255,0.4); }
</style>

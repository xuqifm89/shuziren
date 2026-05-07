<template>
  <view class="container">
    <view class="header">
      <text class="title">{{ libraryName }}</text>
      <text class="count">共 {{ items.length }} 条</text>
    </view>

    <view v-if="items.length > 0" class="list">
      <view class="item" v-for="item in items" :key="item.id" @tap="handleItem(item)">
        <view class="item-info">
          <text class="item-name">{{ item.fileName || item.name || item.title || '未命名' }}</text>
          <text class="item-desc">{{ item.description || item.tags || '' }}</text>
        </view>
        <view class="item-actions">
          <text v-if="playingId === item.id" class="action-stop" @tap.stop="stopAudio">停止</text>
          <text class="action-btn" @tap.stop="deleteItem(item)">删除</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <text class="empty-icon">📭</text>
      <text class="empty-text">暂无数据</text>
    </view>

    <view v-if="showPreviewModal" class="modal-mask" @tap.self="closePreviewModal">
      <view class="preview-modal-content">
        <view class="preview-modal-header">
          <text class="preview-modal-title">{{ previewTitle }}</text>
          <text class="preview-modal-close" @tap="closePreviewModal">✕</text>
        </view>
        <scroll-view scroll-y class="preview-modal-body">
          <text class="preview-modal-text">{{ previewContent }}</text>
        </scroll-view>
      </view>
    </view>

    <view v-if="showVideoModal" class="modal-mask" @tap.self="closeVideoModal">
      <view class="video-modal-content">
        <view class="video-modal-header">
          <text class="video-modal-title">{{ videoTitle }}</text>
          <text class="video-modal-close" @tap="closeVideoModal">✕</text>
        </view>
        <video :src="videoUrl" class="video-modal-player" controls autoplay show-fullscreen-btn show-play-btn object-fit="contain" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../../api/index.js'
import { resolveMediaUrl } from '../../utils/media.js'

const items = ref([])
const libraryType = ref('')
const libraryName = ref('')
const playingId = ref(null)
let audioContext = null

const showPreviewModal = ref(false)
const previewTitle = ref('')
const previewContent = ref('')

const showVideoModal = ref(false)
const videoTitle = ref('')
const videoUrl = ref('')

const apiMap = {
  voice: { list: api.library.voiceLibrary, delete: (id) => api.voices.delete(id) },
  portrait: { list: api.library.portraitLibrary, delete: (id) => api.avatars.delete(id) },
  dubbing: { list: api.library.dubbingLibrary, delete: (id) => api.dubbing.delete(id) },
  music: { list: api.library.musicLibrary, delete: (id) => api.delete(`/music-library/${id}`) },
  copy: { list: api.library.copyLibrary, delete: (id) => api.delete(`/copy-library/${id}`) },
  prompt: { list: api.library.promptLibrary, delete: (id) => api.delete(`/prompt-library/${id}`) },
  work: { list: api.library.workLibrary, delete: (id) => api.video.delete(id) }
}

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  libraryType.value = page.options?.type || ''
  libraryName.value = decodeURIComponent(page.options?.name || '素材库')
  loadItems()
})

onUnmounted(() => { stopAudio() })

async function loadItems() {
  const type = libraryType.value
  const apiConfig = apiMap[type]
  if (!apiConfig) return

  try {
    const result = await apiConfig.list({ page: 1, pageSize: 100 })
    items.value = Array.isArray(result) ? result : (result.list || [])
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function stopAudio() {
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
  playingId.value = null
}

function playAudio(item, url) {
  stopAudio()
  audioContext = uni.createInnerAudioContext()
  audioContext.src = resolveMediaUrl(url)
  audioContext.onPlay(() => { playingId.value = item.id })
  audioContext.onEnded(() => { playingId.value = null })
  audioContext.onError(() => { playingId.value = null; uni.showToast({ title: '播放失败', icon: 'none' }) })
  audioContext.onStop(() => { playingId.value = null })
  audioContext.play()
}

function handleItem(item) {
  const type = libraryType.value
  const url = item.videoPath || item.fileUrl || item.audioUrl || item.filePath || ''

  if (type === 'copy' || type === 'prompt') {
    const title = item.title || item.name || '预览'
    const content = item.content || item.prompt || item.description || item.text || ''
    if (content) {
      previewTitle.value = title
      previewContent.value = content
      showPreviewModal.value = true
    } else {
      uni.showToast({ title: '暂无内容', icon: 'none' })
    }
    return
  }

  if (!url) return

  if (/\.(mp4|mov|webm)/i.test(url)) {
    videoTitle.value = item.title || item.fileName || item.name || '视频预览'
    videoUrl.value = resolveMediaUrl(url)
    showVideoModal.value = true
  } else if (/\.(mp3|wav|flac|m4a|ogg|aac)/i.test(url)) {
    if (playingId.value === item.id) {
      stopAudio()
    } else {
      playAudio(item, url)
    }
  } else if (/\.(jpg|jpeg|png|gif|webp)/i.test(url)) {
    uni.previewImage({ urls: [resolveMediaUrl(url)] })
  }
}

function closePreviewModal() { showPreviewModal.value = false }
function closeVideoModal() { showVideoModal.value = false }

async function deleteItem(item) {
  const type = libraryType.value
  const apiConfig = apiMap[type]
  if (!apiConfig) return

  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条记录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiConfig.delete(item.id)
          items.value = items.value.filter(i => i.id !== item.id)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
.container { padding: 20rpx; min-height: 100vh; background: #0f0f23; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30rpx; }
.title { font-size: 36rpx; font-weight: bold; color: #fff; }
.count { font-size: 24rpx; color: rgba(255, 255, 255, 0.5); }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.item { display: flex; align-items: center; background: rgba(255, 255, 255, 0.05); border-radius: 12rpx; padding: 24rpx; border: 1rpx solid rgba(255, 255, 255, 0.08); }
.item-info { flex: 1; }
.item-name { font-size: 28rpx; color: #fff; display: block; margin-bottom: 8rpx; }
.item-desc { font-size: 22rpx; color: rgba(255, 255, 255, 0.4); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-actions { margin-left: 20rpx; display: flex; gap: 12rpx; }
.action-stop { font-size: 24rpx; color: #e6a23c; padding: 8rpx 20rpx; background: rgba(230,162,60,0.1); border-radius: 6rpx; }
.action-btn { font-size: 24rpx; color: #f56c6c; padding: 8rpx 20rpx; background: rgba(245, 108, 108, 0.1); border-radius: 6rpx; }
.empty { text-align: center; padding: 120rpx 0; }
.empty-icon { font-size: 64rpx; display: block; margin-bottom: 20rpx; }
.empty-text { font-size: 26rpx; color: rgba(255, 255, 255, 0.4); }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 999; display: flex; align-items: center; justify-content: center; }
.preview-modal-content { width: 90%; max-width: 650rpx; background: rgba(26,26,46,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; max-height: 80vh; display: flex; flex-direction: column; }
.preview-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx 36rpx 20rpx; border-bottom: 1rpx solid rgba(255,255,255,0.08); }
.preview-modal-title { font-size: 30rpx; color: #fff; font-weight: 600; flex: 1; }
.preview-modal-close { font-size: 36rpx; color: rgba(255,255,255,0.5); padding: 8rpx 16rpx; }
.preview-modal-body { padding: 30rpx 36rpx; max-height: 60vh; }
.preview-modal-text { font-size: 28rpx; color: rgba(255,255,255,0.85); line-height: 1.8; white-space: pre-wrap; word-break: break-all; }
.video-modal-content { width: 92%; max-width: 700rpx; background: rgba(26,26,46,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; max-height: 85vh; display: flex; flex-direction: column; }
.video-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 30rpx 16rpx; }
.video-modal-title { font-size: 28rpx; color: #fff; font-weight: 600; flex: 1; }
.video-modal-close { font-size: 36rpx; color: rgba(255,255,255,0.5); padding: 8rpx 16rpx; }
.video-modal-player { width: 100%; height: 420rpx; border-radius: 0 0 24rpx 24rpx; }
</style>

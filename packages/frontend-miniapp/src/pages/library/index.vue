<template>
  <view class="container">
    <view class="header">
      <text class="page-title">素材库</text>
      <view class="search-bar">
        <input class="search-input" v-model="keyword" placeholder="搜索素材..." placeholder-class="placeholder" @confirm="handleSearch" />
      </view>
    </view>

    <scroll-view scroll-x class="category-scroll">
      <view :class="['category-item', activeCategory === item.key ? 'active' : '']" v-for="item in libraries" :key="item.key" @tap="switchCategory(item)">
        <text class="category-icon">{{ item.icon }}</text>
        <text class="category-name">{{ item.name }}</text>
        <text class="category-count" v-if="item.count > 0">{{ item.count }}</text>
      </view>
    </scroll-view>

    <view v-if="activeItems.length > 0" class="items-list">
      <view class="item-card" v-for="item in activeItems" :key="item.id" @tap="handleItem(item)">
        <view class="item-media">
          <MediaPreview :url="item.fileUrl || item.filePath || item.imageUrl || item.audioUrl || item.videoPath" :fileName="item.fileName || item.name" />
        </view>
        <view class="item-info">
          <text class="item-name">{{ item.fileName || item.name || item.title || '未命名' }}</text>
          <text class="item-desc">{{ item.description || item.tags || formatFileSize(item.fileSize) }}</text>
          <text class="item-time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="item-actions">
          <text v-if="playingId === item.id" class="action-stop" @tap.stop="stopAudio">停止</text>
          <text class="action-delete" @tap.stop="deleteItem(item)">删除</text>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <text class="empty-icon">{{ activeLibrary.icon }}</text>
      <text class="empty-text">暂无{{ activeLibrary.name }}素材</text>
      <view class="empty-action" @tap="handleUpload">
        <text class="empty-action-text">上传素材</text>
      </view>
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

    <view class="fab" @tap="handleUpload">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api, { uploadFile } from '../../api/index.js'
import { resolveMediaUrl } from '../../utils/media.js'
import MediaPreview from '../../components/MediaPreview.vue'

const keyword = ref('')
const activeCategory = ref('voice')
const libraries = ref([
  { key: 'voice', name: '音色库', icon: '🎤', api: 'voiceLibrary', count: 0 },
  { key: 'portrait', name: '肖像库', icon: '👤', api: 'portraitLibrary', count: 0 },
  { key: 'dubbing', name: '配音库', icon: '🔊', api: 'dubbingLibrary', count: 0 },
  { key: 'music', name: '音乐库', icon: '🎵', api: 'musicLibrary', count: 0 },
  { key: 'copy', name: '文案库', icon: '📝', api: 'copyLibrary', count: 0 },
  { key: 'prompt', name: '提示词库', icon: '💡', api: 'promptLibrary', count: 0 },
  { key: 'work', name: '作品库', icon: '🎬', api: 'workLibrary', count: 0 }
])

const allItems = ref({})

const playingId = ref(null)
let audioContext = null

const showPreviewModal = ref(false)
const previewTitle = ref('')
const previewContent = ref('')

const showVideoModal = ref(false)
const videoTitle = ref('')
const videoUrl = ref('')

const activeLibrary = computed(() => libraries.value.find(l => l.key === activeCategory.value) || libraries.value[0])

const activeItems = computed(() => {
  const items = allItems.value[activeCategory.value] || []
  if (!keyword.value) return items
  return items.filter(item => {
    const name = item.fileName || item.name || item.title || ''
    return name?.toLowerCase().includes(keyword.value.toLowerCase()) ?? false
  })
})

const apiMap = {
  voice: { list: api.library.voiceLibrary, delete: (id) => api.voices.delete(id), upload: (fp) => api.voices.upload(fp) },
  portrait: { list: api.library.portraitLibrary, delete: (id) => api.avatars.delete(id), upload: (fp) => api.avatars.upload(fp) },
  dubbing: { list: api.library.dubbingLibrary, delete: (id) => api.dubbing.delete(id), upload: (fp) => uploadFile('/dubbing-library/upload', fp, 'file') },
  music: { list: api.library.musicLibrary, delete: (id) => api.delete(`/music-library/${id}`), upload: (fp) => uploadFile('/music-library/upload', fp, 'file') },
  copy: { list: api.library.copyLibrary, delete: (id) => api.delete(`/copy-library/${id}`) },
  prompt: { list: api.library.promptLibrary, delete: (id) => api.delete(`/prompt-library/${id}`) },
  work: { list: api.library.workLibrary, delete: (id) => api.video.delete(id), upload: (fp) => uploadFile('/work-library/upload', fp, 'file') }
}

onMounted(() => {
  loadCounts()
  loadItems(activeCategory.value)
})

onUnmounted(() => { stopAudio() })

async function loadCounts() {
  for (const item of libraries.value) {
    try {
      const result = await api.library[item.api]({ page: 1, pageSize: 1 })
      const list = Array.isArray(result) ? result : (result.list || [])
      item.count = result.total || list.length || 0
    } catch (e) {}
  }
}

async function loadItems(key) {
  if (allItems.value[key]) return
  const apiConfig = apiMap[key]
  if (!apiConfig) return
  try {
    const result = await apiConfig.list({ page: 1, pageSize: 100 })
    allItems.value[key] = Array.isArray(result) ? result : (result.list || [])
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function switchCategory(item) {
  activeCategory.value = item.key
  loadItems(item.key)
}

function handleSearch() {
  // keyword filtering is computed
}

function stopAudio() {
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
  playingId.value = null
}

function handleItem(item) {
  const type = activeCategory.value
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
      stopAudio()
      audioContext = uni.createInnerAudioContext()
      audioContext.src = resolveMediaUrl(url)
      audioContext.onPlay(() => { playingId.value = item.id })
      audioContext.onEnded(() => { playingId.value = null })
      audioContext.onError(() => { playingId.value = null; uni.showToast({ title: '播放失败', icon: 'none' }) })
      audioContext.onStop(() => { playingId.value = null })
      audioContext.play()
    }
  } else if (/\.(jpg|jpeg|png|gif|webp)/i.test(url)) {
    uni.previewImage({ urls: [resolveMediaUrl(url)] })
  }
}

function closePreviewModal() { showPreviewModal.value = false }
function closeVideoModal() { showVideoModal.value = false }

async function deleteItem(item) {
  const apiConfig = apiMap[activeCategory.value]
  if (!apiConfig) return
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条记录吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiConfig.delete(item.id)
          allItems.value[activeCategory.value] = allItems.value[activeCategory.value].filter(i => i.id !== item.id)
          const lib = libraries.value.find(l => l.key === activeCategory.value)
          if (lib) lib.count = Math.max(0, (lib.count || 0) - 1)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

function handleUpload() {
  const key = activeCategory.value
  const isImage = key === 'portrait'
  const isAudio = key === 'voice' || key === 'music' || key === 'dubbing'
  const isVideo = key === 'work'

  if (isImage) {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFilePaths[0]
        try {
          uni.showLoading({ title: '上传中...' })
          const apiConfig = apiMap[key]
          if (apiConfig.upload) {
            await apiConfig.upload(filePath)
          }
          delete allItems.value[key]
          loadItems(key)
          loadCounts()
          uni.hideLoading()
          uni.showToast({ title: '上传成功', icon: 'success' })
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  } else if (isAudio) {
    // #ifdef MP-WEIXIN
    uni.chooseMessageFile({
      count: 1,
      type: 'file',
      success: async (res) => {
        const filePath = res.tempFiles[0].path
        try {
          uni.showLoading({ title: '上传中...' })
          const apiConfig = apiMap[key]
          if (apiConfig.upload) await apiConfig.upload(filePath)
          delete allItems.value[key]
          loadItems(key)
          loadCounts()
          uni.hideLoading()
          uni.showToast({ title: '上传成功', icon: 'success' })
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
    // #endif
    // #ifndef MP-WEIXIN
    uni.showToast({ title: '请在PC端上传音频文件', icon: 'none' })
    // #endif
  } else if (isVideo) {
    uni.chooseVideo({
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFilePath
        try {
          uni.showLoading({ title: '上传中...' })
          const apiConfig = apiMap[key]
          if (apiConfig.upload) await apiConfig.upload(filePath)
          delete allItems.value[key]
          loadItems(key)
          loadCounts()
          uni.hideLoading()
          uni.showToast({ title: '上传成功', icon: 'success' })
        } catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  } else {
    uni.navigateTo({
      url: `/pages/library-detail/index?type=${key}&name=${encodeURIComponent(activeLibrary.value.name)}`
    })
  }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / 1048576).toFixed(1) + 'MB'
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  min-height: 100vh;
  background: #0f0f23;
  padding-bottom: 120rpx;
}

.header {
  margin-bottom: 20rpx;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 16rpx;
}

.search-bar {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}

.search-input {
  width: 100%;
  height: 72rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #fff;
  box-sizing: border-box;
}

.placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.category-scroll {
  white-space: nowrap;
  margin-bottom: 24rpx;
}

.category-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 24rpx;
  margin-right: 12rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  border-radius: 12rpx;
  position: relative;
}

.category-item.active {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.3);
}

.category-icon {
  font-size: 32rpx;
  display: block;
  margin-bottom: 6rpx;
}

.category-name {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  display: block;
}

.category-item.active .category-name {
  color: #667eea;
}

.category-count {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  font-size: 18rpx;
  color: #fff;
  background: #667eea;
  border-radius: 8rpx;
  padding: 0 8rpx;
  min-width: 24rpx;
  text-align: center;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.item-card {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.06);
}

.item-media {
  width: 80rpx;
  height: 80rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 26rpx;
  color: #fff;
  display: block;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  display: block;
  margin-bottom: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.25);
  display: block;
}

.item-actions {
  margin-left: 12rpx;
}

.action-delete {
  font-size: 22rpx;
  color: #f56c6c;
  padding: 8rpx 16rpx;
  background: rgba(245, 108, 108, 0.08);
  border-radius: 6rpx;
}

.action-stop {
  font-size: 22rpx;
  color: #e6a23c;
  padding: 8rpx 16rpx;
  background: rgba(230, 162, 60, 0.08);
  border-radius: 6rpx;
}

.empty-state {
  text-align: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.4);
  display: block;
  margin-bottom: 24rpx;
}

.empty-action {
  display: inline-block;
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 12rpx;
}

.empty-action-text {
  font-size: 26rpx;
  color: #fff;
}

.fab {
  position: fixed;
  bottom: 120rpx;
  right: 32rpx;
  width: 96rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.4);
  z-index: 100;
}

.fab-icon {
  font-size: 48rpx;
  color: #fff;
  font-weight: 300;
}

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

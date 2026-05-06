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
          <text class="action-btn" @tap.stop="deleteItem(item)">删除</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <text class="empty-icon">📭</text>
      <text class="empty-text">暂无数据</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api/index.js'
import { resolveMediaUrl } from '../../utils/media.js'

const items = ref([])
const libraryType = ref('')
const libraryName = ref('')

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

function handleItem(item) {
  if (item.fileUrl || item.videoPath || item.audioUrl) {
    const url = item.videoPath || item.fileUrl || item.audioUrl
    if (url.match(/\.(mp4|mov|webm)/i)) {
      // #ifdef MP-WEIXIN
      uni.previewMedia({ sources: [{ url: resolveMediaUrl(url), type: 'video' }] })
      // #endif
      // #ifndef MP-WEIXIN
      uni.navigateTo({
        url: `/pages/video-player/index?url=${encodeURIComponent(resolveMediaUrl(url))}`
      })
      // #endif
    } else if (url.match(/\.(mp3|wav|flac)/i)) {
      const audio = uni.createInnerAudioContext()
      audio.src = resolveMediaUrl(url)
      audio.play()
    }
  }
}

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
.container {
  padding: 20rpx;
  min-height: 100vh;
  background: #0f0f23;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}

.count {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 28rpx;
  color: #fff;
  display: block;
  margin-bottom: 8rpx;
}

.item-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-actions {
  margin-left: 20rpx;
}

.action-btn {
  font-size: 24rpx;
  color: #f56c6c;
  padding: 8rpx 20rpx;
  background: rgba(245, 108, 108, 0.1);
  border-radius: 6rpx;
}

.empty {
  text-align: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.4);
}
</style>

<template>
  <view class="material-library">
    <view class="lib-header">
      <text class="lib-title">素材库</text>
    </view>
    <view class="lib-grid">
      <view class="lib-card" v-for="lib in libraries" :key="lib.key" @tap="handleOpen(lib)">
        <text class="lib-icon">{{ lib.icon }}</text>
        <text class="lib-name">{{ lib.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
const emit = defineEmits(['back', 'open-library'])

const libraries = [
  { key: 'voiceLibrary', name: '音色库', icon: '🎙️', table: 'voiceLibrary' },
  { key: 'portraitLibrary', name: '肖像库', icon: '👤', table: 'portraitLibrary' },
  { key: 'promptLibrary', name: '提示词库', icon: '💡', table: 'promptLibrary' },
  { key: 'workLibrary', name: '作品库', icon: '🎬', table: 'workLibrary' },
  { key: 'musicLibrary', name: '音乐库', icon: '🎵', table: 'musicLibrary' },
  { key: 'copyLibrary', name: '文案库', icon: '📝', table: 'copyLibrary' },
  { key: 'dubbingLibrary', name: '配音库', icon: '🔊', table: 'dubbingLibrary' }
]

function handleOpen(lib) { emit('open-library', lib) }
</script>

<style scoped>
.material-library { width: 100%; }
.lib-header { margin-bottom: 24rpx; }
.lib-title { font-size: 32rpx; font-weight: 700; color: #fff; }
.lib-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.lib-card { width: calc(33.33% - 12rpx); display: flex; flex-direction: column; align-items: center; padding: 32rpx 16rpx; background: rgba(30,30,60,0.7); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 16rpx; }
.lib-icon { font-size: 48rpx; margin-bottom: 12rpx; }
.lib-name { font-size: 24rpx; color: rgba(255,255,255,0.8); }
</style>

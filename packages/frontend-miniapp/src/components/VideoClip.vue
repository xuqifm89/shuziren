<template>
  <view class="video-clip">
    <view v-if="videoPath" class="video-info">
      <text class="video-info-text">已选择视频</text>
    </view>
    <view v-else class="empty-hint">
      <text class="empty-text">请先选择视频（使用上方本地上传或视频库按钮）</text>
    </view>
    <view class="clip-tabs">
      <view :class="['clip-tab', activeTab === 'subtitle' ? 'active' : '']" @tap="activeTab = 'subtitle'">
        <text class="clip-tab-text">字幕</text>
      </view>
      <view :class="['clip-tab', activeTab === 'cover' ? 'active' : '']" @tap="activeTab = 'cover'">
        <text class="clip-tab-text">封面</text>
      </view>
    </view>
    <view v-if="activeTab === 'subtitle'" class="tab-content">
      <view class="form-group">
        <text class="form-label">字幕文本</text>
        <textarea v-model="subtitleText" class="form-textarea" placeholder="输入字幕文本（每行一句）" />
      </view>
      <button class="action-btn secondary" @tap="handleAISubtitle" :disabled="!videoPath">
        AI生成字幕
      </button>
      <view v-if="alignedSubtitles.length > 0" class="subtitle-list">
        <view class="subtitle-item" v-for="(s, i) in alignedSubtitles" :key="i">
          <text class="subtitle-time">{{ formatTime(s.start) }} - {{ formatTime(s.end) }}</text>
          <text class="subtitle-text">{{ s.text }}</text>
        </view>
      </view>
    </view>
    <view v-if="activeTab === 'cover'" class="tab-content">
      <view class="form-group">
        <text class="form-label">封面文字</text>
        <input v-model="coverText" class="form-input" placeholder="输入封面文字" />
      </view>
      <button class="action-btn secondary" @tap="handleGenerateCover" :disabled="!videoPath">
        生成封面
      </button>
    </view>
    <button class="action-btn" @tap="handleCompose" :disabled="!videoPath" style="margin-top: 20rpx;">
      剪辑生成
    </button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import api, { uploadFile } from '../api/index.js'

const props = defineProps({ videoPath: { type: String, default: '' } })
const emit = defineEmits(['video-composed', 'start-task'])

const activeTab = ref('subtitle')
const subtitleText = ref('')
const alignedSubtitles = ref([])
const coverText = ref('')

function getUserId() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0:00'
  const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

async function handleAISubtitle() {
  if (!props.videoPath) return
  emit('start-task', 'AI字幕生成', async () => {
    const user = getUserId()
    const result = await api.post('/clips/ai-generate-subtitle', { videoPath: props.videoPath, userId: user?.id })
    if (result.subtitles && Array.isArray(result.subtitles)) {
      alignedSubtitles.value = result.subtitles
      subtitleText.value = result.subtitles.map(s => s.text).join('\n')
    } else if (result.text) { subtitleText.value = result.text }
    return { success: true, message: '字幕生成成功' }
  })
}

async function handleGenerateCover() {
  if (!props.videoPath) return
  emit('start-task', '封面生成', async () => {
    await api.post('/clips/generate-cover', { framePath: props.videoPath, text: coverText.value, style: {} })
    return { success: true, message: '封面生成成功' }
  })
}

async function handleCompose() {
  if (!props.videoPath) return
  emit('start-task', '剪辑合成', async () => {
    const user = getUserId()
    const result = await uploadFile('/clips/compose', props.videoPath, 'video', {
      videoPath: props.videoPath,
      subtitles: JSON.stringify(alignedSubtitles.value),
      subtitleStyle: JSON.stringify({ fontSize: 24, fontColor: '#FFFFFF', borderColor: '#000000' }),
      coverText: coverText.value,
      userId: user?.id
    })
    if (result.success || result.videoUrl) {
      emit('video-composed', result.videoUrl || props.videoPath)
      return { success: true, message: '剪辑合成完成' }
    }
    return { success: false, message: '剪辑合成失败' }
  })
}
</script>

<style scoped>
.video-clip { width: 100%; }
.video-info { padding: 16rpx 24rpx; background: rgba(102,126,234,0.1); border-radius: 12rpx; margin-bottom: 20rpx; }
.video-info-text { font-size: 24rpx; color: #667eea; }
.empty-hint { padding: 24rpx; text-align: center; margin-bottom: 20rpx; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.clip-tabs { display: flex; margin-bottom: 20rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; overflow: hidden; }
.clip-tab { flex: 1; text-align: center; padding: 16rpx 0; }
.clip-tab.active { background: rgba(102,126,234,0.2); }
.clip-tab-text { font-size: 26rpx; color: rgba(255,255,255,0.5); }
.clip-tab.active .clip-tab-text { color: #667eea; font-weight: 600; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.form-textarea { width: 100%; height: 180rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.action-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.action-btn[disabled] { opacity: 0.5; }
.action-btn.secondary { background: rgba(102,126,234,0.2); border: 1rpx solid rgba(102,126,234,0.4); }
.subtitle-list { margin-top: 16rpx; }
.subtitle-item { display: flex; align-items: center; padding: 12rpx 16rpx; background: rgba(255,255,255,0.03); border-radius: 8rpx; margin-bottom: 8rpx; }
.subtitle-time { font-size: 22rpx; color: #667eea; margin-right: 16rpx; min-width: 120rpx; }
.subtitle-text { font-size: 24rpx; color: rgba(255,255,255,0.8); flex: 1; }
</style>

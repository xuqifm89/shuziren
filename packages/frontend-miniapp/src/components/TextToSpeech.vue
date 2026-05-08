<template>
  <view class="text-to-speech">
    <view class="form-group">
      <text class="form-label">配音文案</text>
      <textarea v-model="inputText" class="form-textarea" placeholder="输入需要配音的文案" />
    </view>
    <view class="form-group">
      <view class="form-label-row">
        <text class="form-label">选择音色</text>
        <text class="form-action" @tap="handleUploadVoice">上传音色</text>
      </view>
      <scroll-view scroll-x class="horizontal-scroll" v-if="voiceList.length > 0">
        <view :class="['voice-card', selectedVoice && selectedVoice.id === v.id ? 'active' : '']" v-for="v in voiceList" :key="v.id" @tap="selectedVoice = v">
          <text class="voice-name">{{ v.fileName || v.name || '音色' }}</text>
          <text :class="['voice-play', playingVoiceId === v.id ? 'playing' : '']" @tap.stop="playVoice(v)">{{ playingVoiceId === v.id ? '⏹' : '▶' }}</text>
        </view>
      </scroll-view>
      <view v-else class="empty-hint"><text class="empty-text">暂无音色</text></view>
    </view>
    <view class="form-group">
      <text class="form-label">音色描述</text>
      <input v-model="voiceDescription" class="form-input" placeholder="可选，描述音色特征" />
    </view>
    <button class="action-btn" @tap="handleGenerate" :disabled="!inputText || !selectedVoice">
      开始生成
    </button>
    <view class="audio-player">
      <view class="player-header">
        <text class="player-label">配音结果</text>
        <text class="player-time" v-if="audioPath">{{ currentTimeText }} / {{ durationText }}</text>
      </view>
      <view v-if="audioPath" class="player-controls">
        <text class="player-btn" @tap="togglePlay">{{ isPlaying ? '⏸' : '▶' }}</text>
        <view class="player-progress-wrap" @tap="seekAudio">
          <view class="player-progress-bar">
            <view class="player-progress-fill" :style="{ width: progressPercent + '%' }"></view>
          </view>
        </view>
      </view>
      <view v-else class="player-empty">
        <text class="player-empty-text">生成配音后将在此播放</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import api, { uploadFile } from '../api/index.js'
import { resolveMediaUrl } from '../utils/media.js'

const props = defineProps({ inputText: { type: String, default: '' } })
const emit = defineEmits(['audio-generated', 'start-task'])

const inputText = ref(props.inputText || '')
const voiceList = ref([])
const selectedVoice = ref(null)
const voiceDescription = ref('')
const isGenerating = ref(false)
const audioPath = ref(uni.getStorageSync('tts_audioPath') || '')
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const playingVoiceId = ref(null)

const progressPercent = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0)
const currentTimeText = computed(() => formatTime(currentTime.value))
const durationText = computed(() => formatTime(duration.value))

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

watch(() => props.inputText, (val) => { if (val) inputText.value = val })
watch(audioPath, (val) => { uni.setStorageSync('tts_audioPath', val) })

function getUserId() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

onMounted(async () => {
  try {
    const user = getUserId()
    const result = await api.get('/voice-library', user?.id ? { userId: user.id } : {})
    voiceList.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
  } catch (e) {}
})

let innerAudioCtx = null
let voicePreviewCtx = null

function initPlayer() {
  if (innerAudioCtx) { innerAudioCtx.stop(); innerAudioCtx.destroy(); innerAudioCtx = null }
  if (!audioPath.value) return
  innerAudioCtx = uni.createInnerAudioContext()
  innerAudioCtx.src = resolveMediaUrl(audioPath.value)
  innerAudioCtx.onTimeUpdate(() => {
    currentTime.value = innerAudioCtx.currentTime
    duration.value = innerAudioCtx.duration
  })
  innerAudioCtx.onPlay(() => { isPlaying.value = true })
  innerAudioCtx.onPause(() => { isPlaying.value = false })
  innerAudioCtx.onStop(() => { isPlaying.value = false })
  innerAudioCtx.onEnded(() => { isPlaying.value = false; currentTime.value = 0 })
  innerAudioCtx.onError(() => { isPlaying.value = false })
}

function togglePlay() {
  if (!innerAudioCtx) { initPlayer(); innerAudioCtx.play(); return }
  if (isPlaying.value) { innerAudioCtx.pause() } else { innerAudioCtx.play() }
}

function seekAudio(e) {
  if (!innerAudioCtx || !duration.value) return
  const detail = e.detail || e
  const x = detail.x || (detail.touches && detail.touches[0] && detail.touches[0].clientX) || 0
  const query = uni.createSelectorQuery().select('.player-progress-wrap')
  query.boundingClientRect((rect) => {
    if (rect) {
      const percent = Math.max(0, Math.min(1, (x - rect.left) / rect.width))
      innerAudioCtx.seek(percent * duration.value)
    }
  }).exec()
}

function playVoice(v) {
  if (playingVoiceId.value === v.id) {
    if (voicePreviewCtx) { voicePreviewCtx.stop(); voicePreviewCtx.destroy(); voicePreviewCtx = null }
    playingVoiceId.value = null
    return
  }
  if (voicePreviewCtx) { voicePreviewCtx.stop(); voicePreviewCtx.destroy(); voicePreviewCtx = null }
  const url = v.fileUrl || v.filePath
  if (url) {
    playingVoiceId.value = v.id
    voicePreviewCtx = uni.createInnerAudioContext()
    voicePreviewCtx.src = resolveMediaUrl(url)
    voicePreviewCtx.onEnded(() => { playingVoiceId.value = null; voicePreviewCtx = null })
    voicePreviewCtx.onError(() => { playingVoiceId.value = null; voicePreviewCtx = null })
    voicePreviewCtx.onStop(() => { playingVoiceId.value = null })
    voicePreviewCtx.play()
  }
}

function handleUploadVoice() {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'audio/*,.wav,.mp3,.ogg'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      uni.showLoading({ title: '上传中...' })
      const uploadResult = await uploadFile('/voice-library/upload', file, 'audio')
      if (uploadResult.success || uploadResult.id) {
        const user = getUserId()
        await api.post('/voice-library', { userId: user?.id, fileName: file.name || '音色', fileUrl: uploadResult.fileUrl || uploadResult.url, fileSize: file.size, description: '', tags: '', isPublic: false })
        uni.hideLoading()
        uni.showToast({ title: '上传成功', icon: 'success' })
        const result = await api.get('/voice-library', user?.id ? { userId: user.id } : {})
        voiceList.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
      } else {
        uni.hideLoading()
      }
    } catch (err) { uni.hideLoading(); uni.showToast({ title: '上传失败', icon: 'none' }) }
  }
  input.click()
  // #endif
  // #ifndef H5
  uni.chooseMessageFile({
    count: 1, type: 'file', extension: ['.wav', '.mp3', '.ogg'],
    success: async (res) => {
      const file = res.tempFiles[0]
      try {
        uni.showLoading({ title: '上传中...' })
        const uploadResult = await uploadFile('/voice-library/upload', file.path, 'audio')
        if (uploadResult.success || uploadResult.id) {
          const user = getUserId()
          await api.post('/voice-library', { userId: user?.id, fileName: file.name || '音色', fileUrl: uploadResult.fileUrl || uploadResult.url, fileSize: file.size, description: '', tags: '', isPublic: false })
          uni.hideLoading()
          uni.showToast({ title: '上传成功', icon: 'success' })
          const result = await api.get('/voice-library', user?.id ? { userId: user.id } : {})
          voiceList.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
        } else {
          uni.hideLoading()
        }
      } catch (err) { uni.hideLoading(); uni.showToast({ title: '上传失败', icon: 'none' }) }
    }
  })
  // #endif
}

async function handleGenerate() {
  if (!inputText.value || !selectedVoice.value) {
    uni.showToast({ title: '请输入文案并选择音色', icon: 'none' })
    return
  }
  emit('start-task', '配音生成', async () => {
    const user = getUserId()
    const result = await api.post('/audio/generate-dubbing', {
      voiceFileUrl: selectedVoice.value.fileUrl || selectedVoice.value.filePath,
      text: inputText.value,
      emotionDescription: voiceDescription.value || '',
      userId: user?.id
    })
    if (result.success && result.taskId && !result.audioUrl) {
      return { success: true, taskId: result.taskId, message: '配音任务已提交，请稍后查看结果' }
    }
    const url = result.audioUrl || result.data?.audioUrl || result.url || result.fileUrl || ''
    if (url) {
      audioPath.value = url
      isPlaying.value = false
      currentTime.value = 0
      duration.value = 0
      if (innerAudioCtx) { innerAudioCtx.stop(); innerAudioCtx.destroy(); innerAudioCtx = null }
      emit('audio-generated', url)
      return { success: true, message: '配音生成成功' }
    }
    return { success: false, message: '配音生成失败' }
  })
}

onUnmounted(() => {
  if (innerAudioCtx) { innerAudioCtx.stop(); innerAudioCtx.destroy(); innerAudioCtx = null }
  if (voicePreviewCtx) { voicePreviewCtx.stop(); voicePreviewCtx.destroy(); voicePreviewCtx = null }
})
</script>

<style scoped>
.text-to-speech { width: 100%; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.form-action { font-size: 24rpx; color: #667eea; }
.form-input { width: 100%; height: 72rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.form-textarea { width: 100%; height: 320rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; overflow-y: auto; }
.horizontal-scroll { white-space: nowrap; }
.voice-card { display: inline-flex; align-items: center; padding: 16rpx 24rpx; margin-right: 12rpx; background: rgba(255,255,255,0.04); border: 1rpx solid rgba(255,255,255,0.08); border-radius: 12rpx; }
.voice-card.active { background: rgba(102,126,234,0.15); border-color: rgba(102,126,234,0.3); }
.voice-name { font-size: 24rpx; color: rgba(255,255,255,0.8); max-width: 200rpx; overflow: hidden; text-overflow: ellipsis; }
.voice-play { font-size: 22rpx; color: #667eea; padding: 8rpx 16rpx; background: rgba(102,126,234,0.1); border-radius: 8rpx; margin-left: 12rpx; }
.voice-play.playing { color: #f56c6c; background: rgba(245,108,108,0.15); }
.empty-hint { padding: 24rpx; text-align: center; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.action-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.action-btn[disabled] { opacity: 0.5; }
.audio-player { margin-top: 24rpx; background: rgba(0,0,0,0.3); border-radius: 16rpx; padding: 24rpx; border: 1rpx solid rgba(102,126,234,0.2); }
.player-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.player-label { font-size: 24rpx; color: #667eea; font-weight: 600; }
.player-time { font-size: 22rpx; color: rgba(255,255,255,0.5); }
.player-controls { display: flex; align-items: center; gap: 20rpx; }
.player-btn { font-size: 48rpx; color: #667eea; width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; background: rgba(102,126,234,0.15); border-radius: 50%; flex-shrink: 0; }
.player-progress-wrap { flex: 1; height: 40rpx; display: flex; align-items: center; }
.player-progress-bar { width: 100%; height: 8rpx; background: rgba(255,255,255,0.1); border-radius: 4rpx; overflow: hidden; position: relative; }
.player-progress-fill { height: 100%; background: linear-gradient(135deg,#667eea,#764ba2); border-radius: 4rpx; transition: width 0.3s ease; }
.player-empty { padding: 32rpx 0; text-align: center; }
.player-empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
</style>

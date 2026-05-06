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
          <text class="voice-play" @tap.stop="playVoice(v)">▶</text>
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
    <view v-if="audioPath" class="result-section">
      <view class="result-header">
        <text class="result-label">配音结果</text>
        <text class="result-btn" @tap="playAudio">播放</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import api, { uploadFile } from '../api/index.js'
import { resolveMediaUrl } from '../utils/media.js'

const props = defineProps({ inputText: { type: String, default: '' } })
const emit = defineEmits(['audio-generated', 'start-task'])

const inputText = ref(props.inputText || '')
const voiceList = ref([])
const selectedVoice = ref(null)
const voiceDescription = ref('')
const isGenerating = ref(false)
const audioPath = ref('')

watch(() => props.inputText, (val) => { if (val) inputText.value = val })

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
function playVoice(v) {
  if (innerAudioCtx) { innerAudioCtx.stop(); innerAudioCtx = null }
  const url = v.fileUrl || v.filePath
  if (url) { innerAudioCtx = uni.createInnerAudioContext(); innerAudioCtx.src = resolveMediaUrl(url); innerAudioCtx.play() }
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
        uni.showToast({ title: '上传成功', icon: 'success' })
        const result = await api.get('/voice-library', user?.id ? { userId: user.id } : {})
        voiceList.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
      }
    } catch (err) { uni.showToast({ title: '上传失败', icon: 'none' }) }
    finally { uni.hideLoading() }
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
          uni.showToast({ title: '上传成功', icon: 'success' })
          const result = await api.get('/voice-library', user?.id ? { userId: user.id } : {})
          voiceList.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
        }
      } catch (err) { uni.showToast({ title: '上传失败', icon: 'none' }) }
      finally { uni.hideLoading() }
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
    const url = result.audioUrl || result.data?.audioUrl || result.url || result.fileUrl || ''
    if (url) {
      audioPath.value = url
      emit('audio-generated', url)
      return { success: true, message: '配音生成成功' }
    }
    return { success: false, message: '配音处理中，请稍后在配音库查看' }
  })
}

function playAudio() {
  if (innerAudioCtx) { innerAudioCtx.stop(); innerAudioCtx = null }
  if (audioPath.value) { innerAudioCtx = uni.createInnerAudioContext(); innerAudioCtx.src = resolveMediaUrl(audioPath.value); innerAudioCtx.play() }
}
</script>

<style scoped>
.text-to-speech { width: 100%; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.form-action { font-size: 24rpx; color: #667eea; }
.form-input { width: 100%; height: 72rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.form-textarea { width: 100%; height: 180rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.horizontal-scroll { white-space: nowrap; }
.voice-card { display: inline-flex; align-items: center; padding: 16rpx 24rpx; margin-right: 12rpx; background: rgba(255,255,255,0.04); border: 1rpx solid rgba(255,255,255,0.08); border-radius: 12rpx; }
.voice-card.active { background: rgba(102,126,234,0.15); border-color: rgba(102,126,234,0.3); }
.voice-name { font-size: 24rpx; color: rgba(255,255,255,0.8); max-width: 200rpx; overflow: hidden; text-overflow: ellipsis; }
.voice-play { font-size: 22rpx; color: #667eea; padding: 8rpx 16rpx; background: rgba(102,126,234,0.1); border-radius: 8rpx; margin-left: 12rpx; }
.empty-hint { padding: 24rpx; text-align: center; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.action-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.action-btn[disabled] { opacity: 0.5; }
.result-section { margin-top: 20rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; padding: 20rpx; border: 1rpx solid rgba(102,126,234,0.2); }
.result-header { display: flex; justify-content: space-between; align-items: center; }
.result-label { font-size: 24rpx; color: #667eea; font-weight: 600; }
.result-btn { font-size: 22rpx; color: rgba(255,255,255,0.6); padding: 4rpx 12rpx; background: rgba(255,255,255,0.06); border-radius: 6rpx; }
</style>

<template>
  <div class="text-to-speech">
    <div class="voice-section">
      <div class="voice-select-row">
        <span class="voice-label">选择样音</span>
        <el-select
          v-model="selectedVoiceId"
          class="voice-select"
          placeholder="请选择样音"
          @change="handleVoiceChange"
        >
          <el-option
            v-for="voice in libraryVoices"
            :key="voice.id"
            :label="voice.fileName"
            :value="voice.id"
          />
        </el-select>
        <el-button
          @click="playSelectedVoice"
          :disabled="!selectedVoice"
          type="outline"
          :class="{ 'playing': isPlayingPreview }"
        >
          {{ isPlayingPreview ? '⏸' : '▶' }}
        </el-button>
      </div>
      <div class="voice-desc-row">
        <span class="voice-label">音色描述</span>
        <el-input
          v-model="voiceDescription"
          class="voice-desc-input"
          placeholder="请输入音色描述"
        />
      </div>
    </div>
    
    <div class="action-buttons">
      <input 
        type="file" 
        ref="voiceUploadInput" 
        style="display: none" 
        accept="audio/*" 
        @change="handleVoiceFileSelect"
      />
      <el-button type="outline" @click="triggerVoiceUpload" :loading="isUploadingVoice">上传音色</el-button>
      <el-button
        @click="generateAudio"
        :loading="isGenerating"
        :disabled="!inputText || !selectedVoice"
        type="primary"
      >
        开始生成
      </el-button>
    </div>
    
    <div class="audio-player-container">
      <audio 
        :key="audioPath"
        :src="audioPath" 
        controls 
        class="audio-player"
      />
    </div>
    
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="true"
      @close="error = ''"
      show-icon
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useTaskManager } from '../composables/useTaskManager'

function authFetch(url, options = {}) {
  const token = localStorage.getItem('token')
  if (token) {
    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` }
  }
  return fetch(url, options)
}

const props = defineProps({
  inputText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['audio-generated'])
const taskManager = useTaskManager()

// 缓存键名
const CACHE_KEYS = {
  PENDING_TASK: 'text_to_speech_pending_task',
  LAST_AUDIO_URL: 'text_to_speech_last_audio_url'
}

// 轮询相关常量
const POLLING_CONFIG = {
  interval: 3000,        // 轮询间隔（毫秒）
  maxAttempts: 200,      // 最大轮询次数（10分钟）
  checkInterval: 5000    // 后台检查间隔（毫秒）
}

const libraryVoices = ref([])
const selectedVoice = ref(null)
const selectedVoiceId = ref('')
const voiceDescription = ref('')
const isGenerating = ref(false)
const audioPath = ref('')
const audioFilename = ref('')
const error = ref('')
const isPlayingPreview = ref(false)
const isUploadingVoice = ref(false)
const voiceUploadInput = ref(null)
let currentAudio = null

let pollingTimer = null
let backgroundCheckTimer = null
let pollingAttempts = 0
let currentTaskId = null
let taskManagerUnsubscribe = null

const getCurrentUser = () => {
  try {
    const userInfo = localStorage.getItem('userInfo')
    if (userInfo) {
      const user = JSON.parse(userInfo)
      return user
    }
  } catch (err) {
    console.error('Failed to parse user info:', err)
  }
  return null
}

onMounted(() => {
  fetchVoices()
  fetchLatestDubbing()

  checkAndRestorePendingTask()

  taskManagerUnsubscribe = taskManager.subscribe((taskState) => {
    if (taskState.status === 'success' && taskState.outputUrl) {
      const url = 'http://localhost:3001' + taskState.outputUrl
      if (url && url !== audioPath.value) {
        audioPath.value = url
        audioFilename.value = 'dubbing.wav'
        stopPolling()
        clearPendingTask()
        emit('audio-generated', audioPath.value)
      }
    }
    if (taskState.status === 'error') {
      error.value = taskState.errorMessage || '配音生成失败'
      stopPolling()
      clearPendingTask()
    }
  })
})

onUnmounted(() => {
  stopPolling()
  stopBackgroundCheck()
  if (taskManagerUnsubscribe) {
    taskManagerUnsubscribe()
    taskManagerUnsubscribe = null
  }
})

const fetchLatestDubbing = async () => {
  try {
    const user = getCurrentUser()
    let url = 'http://localhost:3001/api/dubbing-library'
    if (user?.id) {
      url += `?userId=${user.id}`
    }
    const response = await authFetch(url)
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0 && data[0].fileUrl) {
      audioPath.value = 'http://localhost:3001' + data[0].fileUrl
      audioFilename.value = data[0].fileName || ''
    }
  } catch (err) {
    console.error('Failed to fetch latest dubbing:', err)
  }
}

/**
 * 保存待完成任务信息到localStorage
 */
const savePendingTask = (inputData) => {
  const taskInfo = {
    inputData,
    startTime: Date.now(),
    userId: getCurrentUser()?.id
  }
  localStorage.setItem(CACHE_KEYS.PENDING_TASK, JSON.stringify(taskInfo))
  console.log('💾 已保存待处理的配音任务信息:', taskInfo)
}

/**
 * 清除待完成任务信息
 */
const clearPendingTask = () => {
  localStorage.removeItem(CACHE_KEYS.PENDING_TASK)
  console.log('🗑️ 已清除待处理的配音任务信息')
}

/**
 * 检查并恢复未完成的任务
 */
const checkAndRestorePendingTask = async () => {
  try {
    const pendingTaskStr = localStorage.getItem(CACHE_KEYS.PENDING_TASK)
    if (!pendingTaskStr) return

    const pendingTask = JSON.parse(pendingTaskStr)
    console.log('🔄 发现未完成的配音任务:', pendingTask)

    const elapsed = Date.now() - pendingTask.startTime
    if (elapsed > 30 * 60 * 1000) {
      console.log('⏰ 配音任务已超时，清除')
      clearPendingTask()
      return
    }

    if (pendingTask.taskId) {
      currentTaskId = pendingTask.taskId
      startPolling()
    }
  } catch (err) {
    console.error('❌ 恢复配音任务失败:', err)
    clearPendingTask()
  }
}

const startPolling = () => {
  stopPolling()

  console.log('🔄 开始轮询配音任务, taskId:', currentTaskId)
  pollingAttempts = 0

  pollingTimer = setInterval(async () => {
    pollingAttempts++
    console.log(`📊 轮询检查配音 [${pollingAttempts}/${POLLING_CONFIG.maxAttempts}]`)

    await pollTaskResult()

    if (pollingAttempts >= POLLING_CONFIG.maxAttempts) {
      console.log('⏰ 配音轮询达到最大次数，停止')
      stopPolling()
      clearPendingTask()
      error.value = '配音生成超时，请稍后在配音库中查看'
    }
  }, POLLING_CONFIG.interval)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
    console.log('⏹️ 已停止配音轮询')
  }
}

const startBackgroundCheck = () => {
  if (backgroundCheckTimer) return

  backgroundCheckTimer = setInterval(async () => {
    if (!pollingTimer && !isGenerating.value) {
      await checkForLatestDubbingBg()
    }
  }, POLLING_CONFIG.checkInterval)

  console.log('✅ 配音后台检查已启动')
}

const stopBackgroundCheck = () => {
  if (backgroundCheckTimer) {
    clearInterval(backgroundCheckTimer)
    backgroundCheckTimer = null
  }
}

const pollTaskResult = async () => {
  if (!currentTaskId) return false

  try {
    const response = await authFetch(`http://localhost:3001/api/tasks/${currentTaskId}`)
    const task = await response.json()

    if (task.status === 'success' && task.outputUrl) {
      const url = 'http://localhost:3001' + task.outputUrl
      audioPath.value = url
      audioFilename.value = 'dubbing.wav'

      stopPolling()
      clearPendingTask()
      emit('audio-generated', audioPath.value)
      return true
    }

    if (task.status === 'error') {
      error.value = task.errorMessage || '配音生成失败'
      stopPolling()
      clearPendingTask()
      return true
    }

    return false
  } catch (err) {
    console.error('❌ 轮询任务状态失败:', err)
    return false
  }
}

const checkForNewAudio = async () => {
  return await pollTaskResult()
}

const checkForLatestDubbingBg = async () => {
  try {
    if (!audioPath.value) return

    const user = getCurrentUser()
    let url = 'http://localhost:3001/api/dubbing-library'
    if (user?.id) {
      url += `?userId=${user.id}&limit=1`
    }

    const response = await authFetch(url)
    const data = await response.json()

    if (Array.isArray(data) && data.length > 0) {
      const latestDubbing = data[0]
      const newAudioUrl = latestDubbing.fileUrl ? ('http://localhost:3001' + latestDubbing.fileUrl) : ''

      if (newAudioUrl && newAudioUrl !== audioPath.value) {
        console.log('🔄 后台检查发现更新的音频')
        audioPath.value = newAudioUrl
        audioFilename.value = latestDubbing.fileName || ''
      }
    }
  } catch (err) {
  }
}

const fetchVoices = async () => {
  console.log('=== Starting to fetch voices ===')
  try {
    const user = getCurrentUser()
    console.log('Current user:', user)
    
    let url = 'http://localhost:3001/api/voice-library'
    if (user?.id) {
      url += `?userId=${user.id}`
    }
    console.log('Fetching from:', url)
    
    const response = await authFetch(url)
    console.log('Response status:', response.status)
    
    const data = await response.json()
    console.log('Fetched voices data:', data)
    console.log('Is array?', Array.isArray(data))
    console.log('Data length:', data?.length)
    
    // 确保 data 是数组
    if (Array.isArray(data)) {
      libraryVoices.value = data
      if (data.length > 0) {
        selectedVoice.value = data[0]
        selectedVoiceId.value = data[0].id
        console.log('Selected first voice:', data[0])
      }
    } else {
      console.error('Data is not an array:', data)
      libraryVoices.value = []
    }
  } catch (err) {
    console.error('Failed to fetch voices:', err)
    libraryVoices.value = []
  }
  console.log('=== Done fetching voices, libraryVoices is:', libraryVoices.value)
}

const handleVoiceChange = (voiceId) => {
  if (Array.isArray(libraryVoices.value)) {
    selectedVoice.value = libraryVoices.value.find(v => v.id === voiceId)
  } else {
    selectedVoice.value = null
  }
}

const playSelectedVoice = () => {
  if (!selectedVoice.value) {
    return
  }
  
  // 如果正在播放，就停止
  if (currentAudio && isPlayingPreview.value) {
    console.log('Stopping audio')
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
    isPlayingPreview.value = false
    return
  }
  
  console.log('Selected voice data:', selectedVoice.value)
  
  // 构建音频URL
  const audioUrl = `http://localhost:3001${selectedVoice.value.fileUrl}`
  console.log('Playing audio from:', audioUrl)
  
  // 停止之前的音频（如果有）
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  
  // 创建新音频
  currentAudio = new Audio(audioUrl)
  
  currentAudio.onplay = () => {
    console.log('Audio playing')
    isPlayingPreview.value = true
  }
  
  currentAudio.onended = () => {
    console.log('Audio ended')
    isPlayingPreview.value = false
    currentAudio = null
  }
  
  currentAudio.onerror = (e) => {
    console.error('Audio error:', currentAudio?.error)
    isPlayingPreview.value = false
    currentAudio = null
    error.value = '播放失败，请检查音频文件'
    setTimeout(() => {
      error.value = ''
    }, 3000)
  }
  
  currentAudio.play().catch(err => {
    console.error('Play failed:', err)
    isPlayingPreview.value = false
    currentAudio = null
    error.value = '播放失败，请重试'
    setTimeout(() => {
      error.value = ''
    }, 3000)
  })
}

const playAudio = () => {
  const audio = new Audio(audioPath.value)
  audio.play()
}

const triggerVoiceUpload = () => {
  if (voiceUploadInput.value) {
    voiceUploadInput.value.click()
  }
}

const handleVoiceFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    isUploadingVoice.value = true

    // 1. 上传文件到服务器
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await authFetch('http://localhost:3001/api/voice-library/upload', {
      method: 'POST',
      body: formData
    })

    const uploadData = await uploadResponse.json()

    if (!uploadData.fileUrl) {
      throw new Error('文件上传失败')
    }

    // 2. 将音色信息存入数据库
    const user = getCurrentUser()
    const voiceData = {
      userId: user?.id || '00000000-0000-0000-0000-000000000000',
      fileName: uploadData.originalName,
      fileUrl: uploadData.fileUrl,
      fileSize: uploadData.fileSize,
      duration: uploadData.duration,
      description: voiceDescription.value || '用户上传的音色',
      tags: [],
      isPublic: false
    }

    const saveResponse = await authFetch('http://localhost:3001/api/voice-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voiceData)
    })

    if (!saveResponse.ok) {
      throw new Error('保存音色信息失败')
    }

    const savedVoice = await saveResponse.json()

    // 3. 刷新音色列表
    await fetchVoices()

    // 4. 自动选中新上传的音色
    if (savedVoice.id) {
      selectedVoiceId.value = savedVoice.id
      selectedVoice.value = savedVoice
    }

    ElMessage.success('音色上传成功')

  } catch (err) {
    console.error('上传音色失败:', err)
    ElMessage.error('上传音色失败: ' + (err.message || '未知错误'))
  } finally {
    isUploadingVoice.value = false
    event.target.value = '' // 清空文件输入
  }
}

const generateAudio = async () => {
  if (!props.inputText) {
    error.value = '请输入配音文本'
    return
  }

  if (!selectedVoice.value) {
    error.value = '请选择参考音色'
    return
  }

  taskManager.startTask('dubbing', '配音生成', {
    text: props.inputText,
    voiceId: selectedVoice.value.id,
    voiceFileUrl: selectedVoice.value.fileUrl
  })

  taskManager.executeAfterConfirm(async () => {
    try {
      stopPolling()
      stopBackgroundCheck()

      isGenerating.value = true
      error.value = ''

      let response
      try {
        response = await authFetch('http://localhost:3001/api/audio/generate-dubbing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceFileUrl: 'http://localhost:3001' + selectedVoice.value.fileUrl,
            text: props.inputText,
            emotionDescription: selectedVoice.value.description || '',
            userId: getCurrentUser()?.id
          })
        })
      } catch (networkErr) {
        throw new Error(`网络连接失败: ${networkErr.message}`)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`服务器错误 (${response.status}): ${errorText}`)
      }

      const data = await response.json()

      if (data.success && data.taskId && !data.audioUrl) {
        currentTaskId = data.taskId
        savePendingTask({
          text: props.inputText,
          voiceFileUrl: selectedVoice.value.fileUrl,
          taskId: data.taskId
        })
        startPolling()
        return { success: true, taskId: data.taskId }
      } else if (data.success && data.audioUrl) {
        const fullAudioUrl = 'http://localhost:3001' + data.audioUrl
        audioPath.value = fullAudioUrl
        audioFilename.value = data.fileName || 'dubbing.wav'

        clearPendingTask()
        stopPolling()
        stopBackgroundCheck()

        emit('audio-generated', audioPath.value)
        return { success: true, message: '配音生成完成' }
      } else {
        throw new Error(data.error || '配音生成失败')
      }
    } catch (err) {
      console.error('❌ [TextToSpeech] 配音生成异常:', err)
      error.value = err.message || '配音生成失败'
      throw err
    } finally {
      isGenerating.value = false
    }
  })
}

const regenerateAudio = () => {
  audioPath.value = ''
  generateAudio()
}

const confirmAudio = () => {
  if (audioPath.value) {
    emit('audio-generated', audioPath.value)
  }
}
</script>

<style scoped>
.text-to-speech {
  padding: 15px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-select-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.voice-desc-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.voice-label {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  min-width: 70px;
}

.voice-select {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* 下拉框选中项样式 - 确保有足够对比度 */
:deep(.voice-select .el-select__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff !important;
}

:deep(.voice-select .el-select__wrapper .el-select__selected-item) {
  color: #fff !important;
}

:deep(.voice-select .el-select__placeholder) {
  color: rgba(255, 255, 255, 0.5);
}

:deep(.voice-select .el-select__wrapper:hover) {
  background: rgba(255, 255, 255, 0.15);
}

/* 下拉选项样式 - 强制覆盖所有状态 */
:deep(.el-select-dropdown) {
  background: #ffffff !important;
  border: 1px solid #ddd !important;
}

:deep(.el-select-dropdown__wrap) {
  background: #ffffff !important;
}

:deep(.el-select-dropdown__item) {
  color: #000000 !important;
  background: #ffffff !important;
}

:deep(.el-select-dropdown__item:hover),
:deep(.el-select-dropdown__item.is-hovering),
:deep(.el-select-dropdown__item.hover) {
  background: #667eea !important;
  color: #ffffff !important;
}

:deep(.el-select-dropdown__item.is-focused),
:deep(.el-select-dropdown__item:focus),
:deep(.el-select-dropdown__item.focused) {
  background: #5a6fd6 !important;
  color: #ffffff !important;
}

:deep(.el-select-dropdown__item.is-highlighted),
:deep(.el-select-dropdown__item.highlighted) {
  background: #667eea !important;
  color: #ffffff !important;
}

:deep(.el-select-dropdown__item.selected) {
  background: #4a5fd6 !important;
  color: #ffffff !important;
  font-weight: 600;
}

/* 播放按钮样式 */
.playing {
  background: rgba(102, 126, 234, 0.2) !important;
  border-color: rgba(102, 126, 234, 0.5) !important;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.voice-desc-input {
  flex: 1;
}

.voice-desc-input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: none;
}

.voice-desc-input :deep(.el-input__inner) {
  color: #fff;
}

.voice-desc-input :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.5);
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.action-buttons button {
  flex: 1;
}

.audio-player-container {
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px;
}

.audio-player {
  width: 100%;
  outline: none;
}

.audio-player::-webkit-media-controls-panel {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.audio-player::-webkit-media-controls-play-button {
  color: #667eea;
}



.audio-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.audio-player {
  width: 100%;
}

.audio-actions {
  display: flex;
  gap: 10px;
}

.audio-actions button {
  flex: 1;
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  padding: 10px;
  background: rgba(255, 77, 79, 0.1);
  border-radius: 6px;
}
</style>

<!-- 全局覆盖下拉框样式 -->
<style>
/* 下拉框整体样式 - 深色背景适配 */
.el-select-dropdown {
  background: #1e1e3c !important;
  border: 1px solid rgba(102, 126, 234, 0.4) !important;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.3) !important;
}

.el-select-dropdown__wrap {
  background: #1e1e3c !important;
  max-height: 274px !important;
}

.el-select-dropdown__list {
  background: #1e1e3c !important;
  padding: 6px 0 !important;
}

/* 下拉选项样式 - 深色背景对比 */
.el-select-dropdown__item {
  color: #ffffff !important;
  background: #1e1e3c !important;
  font-size: 14px !important;
  padding: 0 20px !important;
  height: 36px !important;
  line-height: 36px !important;
}

/* 悬停/高亮状态 */
.el-select-dropdown__item:hover,
.el-select-dropdown__item.is-hovering,
.el-select-dropdown__item.hover,
.el-select-dropdown__item.is-highlighted,
.el-select-dropdown__item.highlighted {
  background: rgba(102, 126, 234, 0.3) !important;
  color: #ffffff !important;
}

/* 聚焦状态 */
.el-select-dropdown__item.is-focused,
.el-select-dropdown__item:focus,
.el-select-dropdown__item.focused {
  background: rgba(102, 126, 234, 0.4) !important;
  color: #ffffff !important;
}

/* 选中状态 */
.el-select-dropdown__item.selected {
  background: rgba(102, 126, 234, 0.5) !important;
  color: #ffffff !important;
  font-weight: 600;
}

/* 确保暗黑主题正常工作 */
html.dark .el-select-dropdown,
html.dark .el-select-dropdown__wrap,
html.dark .el-select-dropdown__list {
  background: #1e1e3c !important;
}

html.dark .el-select-dropdown__item {
  color: #ffffff !important;
  background: #1e1e3c !important;
}

/* 下拉框输入框样式 */
.text-to-speech .voice-select .el-select__wrapper {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.text-to-speech .voice-select .el-select__wrapper:hover {
  background: rgba(255, 255, 255, 0.15) !important;
}

.text-to-speech .voice-select .el-select__wrapper.is-focused {
  border-color: #667eea !important;
}

.text-to-speech .voice-select .el-select__placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

.text-to-speech .voice-select .el-select__selected-item {
  color: #ffffff !important;
}
</style>
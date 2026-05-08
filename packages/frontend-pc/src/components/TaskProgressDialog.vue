<template>
  <div v-if="isVisible" class="task-progress-overlay" @click.self="handleOverlayClick">
    <div class="task-progress-dialog">
      <div class="dialog-header">
        <div class="header-icon">
          <div v-if="taskStatus === 'processing'" class="loading-spinner"></div>
          <span v-else-if="taskStatus === 'success'" class="success-icon">✅</span>
          <span v-else-if="taskStatus === 'error'" class="error-icon">❌</span>
          <span v-else-if="taskStatus === 'timeout'" class="timeout-icon">⏰</span>
          <span v-else class="pending-icon">⏳</span>
        </div>
        <h3 class="dialog-title">{{ dialogTitle }}</h3>
      </div>

      <div class="dialog-content">
        <p class="dialog-message">{{ dialogMessage }}</p>

        <div v-if="taskStatus === 'processing'" class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <div class="progress-info">
            <span class="progress-percent">{{ Math.round(progressPercent) }}%</span>
            <span class="progress-hint">{{ progressHint }}</span>
          </div>
        </div>

        <div v-if="taskStatus === 'error' && errorMessage" class="error-detail">
          <p>{{ errorMessage }}</p>
        </div>

        <div v-if="taskStatus === 'timeout'" class="timeout-detail">
          <p>AI处理时间较长，任务已转入后台继续执行。完成后将自动保存到对应的作品库中，您可以稍后在作品库中查看结果。</p>
        </div>

        <div v-if="taskStatus === 'success' && successMessage" class="success-detail">
          <p>{{ successMessage }}</p>
        </div>
      </div>

      <div class="dialog-footer">
        <button
          v-if="taskStatus === 'processing'"
          @click="handleCancel"
          class="cancel-btn"
          :disabled="isCancelling"
        >
          {{ isCancelling ? '取消中...' : '取消任务' }}
        </button>
        <button
          v-if="taskStatus === 'success' || taskStatus === 'error' || taskStatus === 'timeout'"
          @click="handleClose"
          class="close-btn"
        >
          {{ taskStatus === 'success' ? '完成' : '关闭' }}
        </button>
        <button
          v-if="taskStatus === 'pending'"
          @click="handleConfirm"
          class="confirm-btn"
        >
          确认提交
        </button>
        <button
          v-if="taskStatus === 'pending'"
          @click="handleCancel"
          class="cancel-btn"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  taskType: {
    type: String,
    default: ''
  },
  taskName: {
    type: String,
    default: 'AI生成任务'
  },
  status: {
    type: String,
    default: 'pending',
    validator: (value) => ['pending', 'processing', 'success', 'error', 'timeout'].includes(value)
  },
  message: {
    type: String,
    default: ''
  },
  errorMessage: {
    type: String,
    default: ''
  },
  successMessage: {
    type: String,
    default: ''
  },
  isCancelling: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  },
  progressMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:visible', 'confirm', 'cancel', 'close'])

const isVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const taskStatus = computed(() => props.status)

const dialogTitle = computed(() => {
  switch (props.status) {
    case 'pending':
      return '确认任务'
    case 'processing':
      return `${props.taskName} - 进行中`
    case 'success':
      return `${props.taskName} - 完成`
    case 'error':
      return `${props.taskName} - 失败`
    case 'timeout':
      return `${props.taskName} - 后台执行中`
    default:
      return '任务状态'
  }
})

const dialogMessage = computed(() => {
  if (props.message) return props.message

  switch (props.status) {
    case 'pending':
      return `确定要开始${props.taskName}吗？任务提交后将进入处理队列，请耐心等待。`
    case 'processing':
      return `任务已提交，正在${props.taskName}中...`
    case 'success':
      return `${props.taskName}已完成！`
    case 'error':
      return `${props.taskName}失败`
    case 'timeout':
      return `AI处理时间较长，任务已转入后台继续执行`
    default:
      return ''
  }
})

const progressPercent = computed(() => {
  if (props.progress > 0) {
    return Math.min(props.progress, 100)
  }
  return simulatedProgress.value
})

const progressHint = computed(() => {
  if (props.progressMessage) {
    return props.progressMessage
  }
  return simulatedHint.value
})

const simulatedProgress = ref(0)
const simulatedHint = ref('正在连接服务器...')
let progressInterval = null

watch(() => props.status, (newStatus) => {
  if (newStatus === 'processing') {
    if (props.progress <= 0) {
      startProgressAnimation()
    }
  } else {
    stopProgressAnimation()
  }
})

watch(() => props.progress, (newProgress) => {
  if (newProgress > 0) {
    stopProgressAnimation()
  }
})

onMounted(() => {
  if (props.status === 'processing' && props.progress <= 0) {
    startProgressAnimation()
  }
})

onUnmounted(() => {
  stopProgressAnimation()
})

const startProgressAnimation = () => {
  stopProgressAnimation()

  const hints = [
    '正在连接服务器...',
    '任务已加入队列...',
    'AI模型准备中...',
    '内容生成中...',
    '请耐心等待...',
    '即将完成...'
  ]

  let hintIndex = 0
  simulatedProgress.value = 0

  progressInterval = setInterval(() => {
    if (simulatedProgress.value < 90) {
      simulatedProgress.value += Math.random() * 3
      if (simulatedProgress.value > 90) simulatedProgress.value = 90

      if (Math.random() > 0.7) {
        hintIndex = (hintIndex + 1) % hints.length
        simulatedHint.value = hints[hintIndex]
      }
    }
  }, 800)
}

const stopProgressAnimation = () => {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  isVisible.value = false
  emit('cancel')
}

const handleClose = () => {
  isVisible.value = false
  emit('close')
}

const handleOverlayClick = () => {
  if (props.status === 'success' || props.status === 'error' || props.status === 'timeout' || props.status === 'pending') {
    handleClose()
  }
}
</script>

<style scoped>
.task-progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.task-progress-dialog {
  background: linear-gradient(135deg, #1e1e3c 0%, #2a2a4a 100%);
  border-radius: 20px;
  width: 90%;
  max-width: 480px;
  padding: 32px 28px 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
              0 0 40px rgba(102, 126, 234, 0.2);
  border: 1px solid rgba(102, 126, 234, 0.3);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.dialog-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}

.header-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  font-size: 32px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.success-icon { animation: bounceIn 0.5s ease-out; }
.error-icon { animation: shake 0.5s ease-out; }
.timeout-icon { animation: pulse 2s ease-in-out infinite; }
.pending-icon { animation: pulse 2s ease-in-out infinite; }

@keyframes bounceIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.dialog-title {
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dialog-content { margin-bottom: 28px; }

.dialog-message {
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  line-height: 1.6;
  text-align: center;
  margin: 0 0 20px 0;
}

.progress-section { margin-top: 16px; }

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-percent {
  color: #667eea;
  font-size: 14px;
  font-weight: 600;
}

.progress-hint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.error-detail {
  background: rgba(245, 108, 108, 0.15);
  border: 1px solid rgba(245, 108, 108, 0.3);
  border-radius: 10px;
  padding: 16px;
  margin-top: 16px;
}

.error-detail p {
  color: #f56c6c;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.timeout-detail {
  background: rgba(230, 162, 60, 0.15);
  border: 1px solid rgba(230, 162, 60, 0.3);
  border-radius: 10px;
  padding: 16px;
  margin-top: 16px;
}

.timeout-detail p {
  color: #e6a23c;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.success-detail {
  background: rgba(103, 194, 58, 0.15);
  border: 1px solid rgba(103, 194, 58, 0.3);
  border-radius: 10px;
  padding: 16px;
  margin-top: 16px;
}

.success-detail p {
  color: #67c23a;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-footer button {
  flex: 1;
  max-width: 160px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}
</style>

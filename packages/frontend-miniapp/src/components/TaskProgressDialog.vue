<template>
  <view v-if="visible" class="task-dialog-mask" @tap.self="handleClose">
    <view class="task-dialog" @tap.stop>
      <view class="dialog-header">
        <text class="dialog-title">{{ taskName || '任务进度' }}</text>
        <text v-if="status === 'success' || status === 'error'" class="dialog-close" @tap="handleClose">✕</text>
      </view>
      <view class="dialog-body">
        <view v-if="status === 'pending'" class="status-pending">
          <text class="pending-icon">📋</text>
          <text class="pending-title">确认提交任务？</text>
          <text class="pending-desc">{{ taskName }}将开始执行</text>
        </view>
        <view v-else-if="status === 'processing'" class="status-processing">
          <view class="progress-bar-wrap">
            <view class="progress-bar">
              <view class="progress-fill" :style="{ width: progress + '%' }"></view>
            </view>
            <text class="progress-percent">{{ Math.floor(progress) }}%</text>
          </view>
          <text class="progress-hint">{{ progressMessage || '处理中...' }}</text>
        </view>
        <view v-else-if="status === 'success'" class="status-success">
          <text class="result-icon">✅</text>
          <text class="result-text">{{ successMessage || '处理完成' }}</text>
        </view>
        <view v-else-if="status === 'error'" class="status-error">
          <text class="result-icon">❌</text>
          <text class="result-text error">{{ errorMessage || '处理失败' }}</text>
        </view>
      </view>
      <view class="dialog-footer">
        <template v-if="status === 'pending'">
          <view class="dialog-btn cancel" @tap="handleCancel">
            <text class="btn-text">取消</text>
          </view>
          <view class="dialog-btn confirm" @tap="handleConfirm">
            <text class="btn-text">确认提交</text>
          </view>
        </template>
        <template v-else-if="status === 'processing'">
          <view class="dialog-btn cancel" @tap="handleCancel">
            <text class="btn-text">{{ isCancelling ? '取消中...' : '取消任务' }}</text>
          </view>
        </template>
        <template v-else-if="status === 'success'">
          <view class="dialog-btn confirm" @tap="handleConfirm">
            <text class="btn-text">确认</text>
          </view>
        </template>
        <template v-else-if="status === 'error'">
          <view class="dialog-btn confirm" @tap="handleConfirm">
            <text class="btn-text">关闭</text>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup>
import { watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  taskType: { type: String, default: '' },
  taskName: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  progress: { type: Number, default: 0 },
  progressMessage: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  successMessage: { type: String, default: '' },
  isCancelling: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel', 'close', 'update:visible'])

let autoCloseTimer = null

watch(() => props.status, (newStatus) => {
  if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null }
  if (newStatus === 'success') {
    autoCloseTimer = setTimeout(() => { emit('close'); emit('update:visible', false) }, 3000)
  }
})

function handleConfirm() { emit('confirm') }
function handleCancel() { emit('cancel') }
function handleClose() {
  if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null }
  emit('close'); emit('update:visible', false)
}
</script>

<style scoped>
.task-dialog-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.task-dialog { width: 80%; max-width: 600rpx; background: rgba(26,26,46,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; overflow: hidden; box-shadow: 0 16rpx 64rpx rgba(0,0,0,0.5); }
.dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 32rpx; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.dialog-title { font-size: 30rpx; font-weight: 600; color: #fff; }
.dialog-close { font-size: 32rpx; color: rgba(255,255,255,0.5); padding: 8rpx; }
.dialog-body { padding: 40rpx 32rpx; }
.status-pending, .status-processing, .status-success, .status-error { text-align: center; }
.pending-icon { font-size: 64rpx; display: block; margin-bottom: 20rpx; }
.pending-title { font-size: 30rpx; color: #fff; font-weight: 600; display: block; margin-bottom: 12rpx; }
.pending-desc { font-size: 26rpx; color: rgba(255,255,255,0.5); display: block; }
.progress-bar-wrap { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.progress-bar { flex: 1; height: 16rpx; background: rgba(255,255,255,0.1); border-radius: 8rpx; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(135deg,#667eea,#764ba2); border-radius: 8rpx; transition: width 0.5s ease; }
.progress-percent { font-size: 26rpx; color: rgba(255,255,255,0.7); min-width: 72rpx; text-align: right; }
.progress-hint { font-size: 24rpx; color: rgba(255,255,255,0.5); display: block; }
.result-icon { font-size: 64rpx; display: block; margin-bottom: 16rpx; }
.result-text { font-size: 28rpx; color: rgba(255,255,255,0.8); display: block; line-height: 1.6; }
.result-text.error { color: #f56c6c; word-break: break-all; }
.dialog-footer { padding: 0 32rpx 32rpx; display: flex; justify-content: center; gap: 20rpx; }
.dialog-btn { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.dialog-btn.cancel { background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); }
.dialog-btn.confirm { background: linear-gradient(135deg,#667eea,#764ba2); }
.btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }
.dialog-btn.cancel .btn-text { color: rgba(255,255,255,0.7); }
</style>

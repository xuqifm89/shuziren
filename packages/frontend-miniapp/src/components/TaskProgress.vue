<template>
  <view v-if="visible" class="task-progress-overlay" @tap.stop>
    <view class="progress-card">
      <view class="progress-header">
        <text class="progress-title">{{ title || '任务处理中' }}</text>
        <text v-if="closable" class="close-btn" @tap="close">✕</text>
      </view>
      <view class="progress-body">
        <view class="progress-bar-wrap">
          <view class="progress-bar" :style="{ width: progress + '%' }"></view>
        </view>
        <text class="progress-text">{{ progress }}%</text>
      </view>
      <text v-if="message" class="progress-message">{{ message }}</text>
      <view v-if="status === 'completed'" class="progress-success">
        <text class="success-icon">✅</text>
        <text class="success-text">任务完成</text>
      </view>
      <view v-if="status === 'failed'" class="progress-fail">
        <text class="fail-icon">❌</text>
        <text class="fail-text">{{ message || '任务失败' }}</text>
      </view>
      <view v-if="status === 'completed' || status === 'failed'" class="progress-actions">
        <view class="action-btn primary" @tap="close">确定</view>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  progress: { type: Number, default: 0 },
  message: { type: String, default: '' },
  status: { type: String, default: 'processing' },
  closable: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}
</script>

<style scoped>
.task-progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.progress-card {
  width: 600rpx;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  border: 1rpx solid rgba(102, 126, 234, 0.3);
}
.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}
.progress-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}
.close-btn {
  font-size: 36rpx;
  color: rgba(255, 255, 255, 0.5);
  padding: 8rpx;
}
.progress-body {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 16rpx;
}
.progress-bar-wrap {
  flex: 1;
  height: 16rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8rpx;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8rpx;
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 28rpx;
  color: #667eea;
  font-weight: 600;
  min-width: 80rpx;
  text-align: right;
}
.progress-message {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16rpx;
}
.progress-success, .progress-fail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 0;
}
.success-icon, .fail-icon {
  font-size: 40rpx;
}
.success-text {
  font-size: 30rpx;
  color: #40c480;
  font-weight: 500;
}
.fail-text {
  font-size: 30rpx;
  color: #f5576c;
  font-weight: 500;
}
.progress-actions {
  display: flex;
  justify-content: center;
  margin-top: 20rpx;
}
.action-btn {
  padding: 16rpx 64rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 500;
  text-align: center;
}
.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}
</style>

<template>
  <view class="empty-state">
    <text class="empty-icon">{{ icon || '📭' }}</text>
    <text class="empty-text">{{ text || '暂无数据' }}</text>
    <view v-if="actionText" class="empty-action" @tap="$emit('action')">
      <text class="action-text">{{ actionText }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '' },
  text: { type: String, default: '' },
  actionText: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}
.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}
.empty-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 32rpx;
}
.empty-action {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
}
.action-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}
</style>

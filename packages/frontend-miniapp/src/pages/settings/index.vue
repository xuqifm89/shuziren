<template>
  <view class="settings-page">
    <view class="settings-section">
      <text class="section-title">个人信息</text>
      <view class="settings-item" @tap="goProfile">
        <text class="item-label">编辑资料</text>
        <text class="item-arrow">›</text>
      </view>
      <view class="settings-item" @tap="goPassword">
        <text class="item-label">修改密码</text>
        <text class="item-arrow">›</text>
      </view>
    </view>

    <view class="settings-section">
      <text class="section-title">通用设置</text>
      <view class="settings-item">
        <text class="item-label">消息通知</text>
        <switch :checked="notifyEnabled" @change="toggleNotify" color="#667eea" />
      </view>
      <view class="settings-item">
        <text class="item-label">自动播放视频</text>
        <switch :checked="autoPlay" @change="toggleAutoPlay" color="#667eea" />
      </view>
      <view class="settings-item" @tap="clearCache">
        <text class="item-label">清除缓存</text>
        <text class="item-value">{{ cacheSize }}</text>
      </view>
    </view>

    <view class="settings-section">
      <text class="section-title">关于</text>
      <view class="settings-item">
        <text class="item-label">版本</text>
        <text class="item-value">1.0.0</text>
      </view>
      <view class="settings-item">
        <text class="item-label">技术支持</text>
        <text class="item-value">拾光引擎团队</text>
      </view>
    </view>

    <view class="logout-section">
      <view class="logout-btn" @tap="handleLogout">
        <text class="logout-text">退出登录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/store/user.js'

const userStore = useUserStore()

const notifyEnabled = ref(uni.getStorageSync('setting_notify') !== 'false')
const autoPlay = ref(uni.getStorageSync('setting_autoPlay') !== 'false')
const cacheSize = ref('0KB')

const calcCacheSize = () => {
  try {
    const res = uni.getStorageInfoSync()
    const kb = res.currentSize || 0
    cacheSize.value = kb > 1024 ? (kb / 1024).toFixed(1) + 'MB' : kb + 'KB'
  } catch (e) {
    cacheSize.value = '未知'
  }
}
calcCacheSize()

const toggleNotify = (e) => {
  notifyEnabled.value = e.detail.value
  uni.setStorageSync('setting_notify', String(e.detail.value))
}

const toggleAutoPlay = (e) => {
  autoPlay.value = e.detail.value
  uni.setStorageSync('setting_autoPlay', String(e.detail.value))
}

const clearCache = () => {
  uni.showModal({
    title: '确认清除',
    content: '将清除所有本地缓存数据（不含登录信息）',
    success: (res) => {
      if (res.confirm) {
        const token = uni.getStorageSync('token')
        const userInfo = uni.getStorageSync('userInfo')
        uni.clearStorageSync()
        if (token) uni.setStorageSync('token', token)
        if (userInfo) uni.setStorageSync('userInfo', userInfo)
        calcCacheSize()
        uni.showToast({ title: '缓存已清除', icon: 'success' })
      }
    }
  })
}

const goProfile = () => {
  uni.navigateTo({ url: '/pages/profile/index' })
}

const goPassword = () => {
  uni.navigateTo({ url: '/pages/change-password/index' })
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '退出后需要重新登录',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  })
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: #0f0f23;
  padding: 24rpx;
}
.settings-section {
  margin-bottom: 32rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.section-title {
  display: block;
  padding: 24rpx 32rpx 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
}
.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
}
.settings-item:last-child {
  border-bottom: none;
}
.item-label {
  font-size: 30rpx;
  color: #fff;
}
.item-value {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.4);
}
.item-arrow {
  font-size: 36rpx;
  color: rgba(255, 255, 255, 0.3);
}
.logout-section {
  margin-top: 48rpx;
  padding: 0 32rpx;
}
.logout-btn {
  background: rgba(245, 87, 108, 0.15);
  border: 1rpx solid rgba(245, 87, 108, 0.3);
  border-radius: 16rpx;
  padding: 28rpx;
  text-align: center;
}
.logout-text {
  font-size: 30rpx;
  color: #f5576c;
  font-weight: 500;
}
</style>

<template>
  <view class="container">
    <view class="user-card" v-if="userInfo">
      <view class="avatar-circle">
        <image v-if="userInfo.avatar" :src="resolveMediaUrl(userInfo.avatar)" class="avatar-img" mode="aspectFill" />
        <text v-else class="avatar-text">{{ (userInfo.nickname || userInfo.username || '?')[0] }}</text>
      </view>
      <view class="user-info">
        <text class="nickname">{{ userInfo.nickname || userInfo.username }}</text>
        <text class="role-badge">{{ roleLabels[userInfo.role] || '普通用户' }}</text>
      </view>
      <view class="edit-btn" @tap="goPage('/pages/profile/index')">
        <text class="edit-text">编辑</text>
      </view>
    </view>
    <view class="user-card" v-else @tap="goLogin">
      <view class="avatar-circle">
        <text class="avatar-text">?</text>
      </view>
      <view class="user-info">
        <text class="nickname">点击登录</text>
      </view>
    </view>

    <view class="stats-row" v-if="userInfo">
      <view class="stat-item">
        <text class="stat-value">{{ stats.workCount }}</text>
        <text class="stat-label">作品</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.taskCount }}</text>
        <text class="stat-label">任务</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ stats.materialCount }}</text>
        <text class="stat-label">素材</text>
      </view>
    </view>

    <view class="menu-section">
      <text class="menu-section-title">创作工具</text>
      <view class="menu-list">
        <view class="menu-item" @tap="goPage('/pages/create/index?type=text')">
          <text class="menu-icon">✍️</text>
          <text class="menu-label">文案生成</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goPage('/pages/create/index?type=audio')">
          <text class="menu-icon">🔊</text>
          <text class="menu-label">配音生成</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goPage('/pages/create/index?type=video')">
          <text class="menu-icon">🎬</text>
          <text class="menu-label">视频生成</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <text class="menu-section-title">素材管理</text>
      <view class="menu-list">
        <view class="menu-item" @tap="goLibrary('voice')">
          <text class="menu-icon">🎤</text>
          <text class="menu-label">音色库</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goLibrary('portrait')">
          <text class="menu-icon">👤</text>
          <text class="menu-label">肖像库</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goLibrary('dubbing')">
          <text class="menu-icon">🎵</text>
          <text class="menu-label">配音库</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goLibrary('music')">
          <text class="menu-icon">🎶</text>
          <text class="menu-label">音乐库</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goLibrary('copy')">
          <text class="menu-icon">📝</text>
          <text class="menu-label">文案库</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goLibrary('prompt')">
          <text class="menu-icon">💡</text>
          <text class="menu-label">提示词库</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goLibrary('work')">
          <text class="menu-icon">📽️</text>
          <text class="menu-label">作品库</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="menu-section">
      <text class="menu-section-title">系统</text>
      <view class="menu-list">
        <view class="menu-item" @tap="goPage('/pages/settings/index')">
          <text class="menu-icon">⚙️</text>
          <text class="menu-label">设置</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="showAbout">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-label">关于</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view v-if="userInfo" class="logout-wrap">
      <view class="logout-btn" @tap="handleLogout">
        <text class="logout-text">退出登录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../../store/user.js'
import { getTaskWebSocket } from '../../utils/websocket.js'
import { resolveMediaUrl } from '../../utils/media.js'
import api from '../../api/index.js'

const userInfo = ref(null)
const userStore = useUserStore()
const stats = ref({ workCount: 0, taskCount: 0, materialCount: 0 })

const roleLabels = {
  superadmin: '超级管理员',
  admin: '管理员',
  user: '普通用户'
}

onMounted(() => {
  loadUserInfo()
  loadStats()
})

function loadUserInfo() {
  const info = uni.getStorageSync('userInfo')
  if (info) {
    userInfo.value = typeof info === 'string' ? JSON.parse(info) : info
  }
}

async function loadStats() {
  if (!uni.getStorageSync('token')) return
  try {
    const [works, voices, avatars] = await Promise.allSettled([
      api.video.list({ page: 1, pageSize: 1 }),
      api.voices.list({ page: 1, pageSize: 1 }),
      api.avatars.list({ page: 1, pageSize: 1 })
    ])
    stats.value.workCount = works.status === 'fulfilled' ? (works.value.total || (Array.isArray(works.value) ? works.value.length : 0)) : 0
    stats.value.materialCount = 0
    if (voices.status === 'fulfilled') stats.value.materialCount += (voices.value.total || (Array.isArray(voices.value) ? voices.value.length : 0))
    if (avatars.status === 'fulfilled') stats.value.materialCount += (avatars.value.total || (Array.isArray(avatars.value) ? avatars.value.length : 0))
  } catch (e) {}
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

function goPage(url) {
  const token = uni.getStorageSync('token')
  if (!token) {
    goLogin()
    return
  }
  uni.navigateTo({ url })
}

function goLibrary(type) {
  const token = uni.getStorageSync('token')
  if (!token) {
    goLogin()
    return
  }
  const nameMap = { voice: '音色库', portrait: '肖像库', dubbing: '配音库', work: '作品库', music: '音乐库', copy: '文案库', prompt: '提示词库' }
  uni.navigateTo({
    url: `/pages/library-detail/index?type=${type}&name=${encodeURIComponent(nameMap[type] || '素材库')}`
  })
}

function showAbout() {
  uni.showModal({
    title: '关于拾光引擎',
    content: 'AI驱动的数字人视频创作平台 v1.0.0\n\n技术栈：uni-app + Vue3 + Pinia',
    showCancel: false
  })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        const ws = getTaskWebSocket()
        ws.disconnect()
        userInfo.value = null
        uni.showToast({ title: '已退出', icon: 'success' })
        setTimeout(() => {
          uni.navigateTo({ url: '/pages/login/index' })
        }, 1000)
      }
    }
  })
}
</script>

<style scoped>
.container {
  padding: 20rpx;
  min-height: 100vh;
  background: #0f0f23;
}

.user-card {
  display: flex;
  align-items: center;
  background: rgba(102, 126, 234, 0.1);
  border: 1rpx solid rgba(102, 126, 234, 0.2);
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.avatar-circle {
  width: 96rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 96rpx;
  height: 96rpx;
}

.avatar-text {
  font-size: 40rpx;
  color: #fff;
  font-weight: 600;
}

.user-info {
  flex: 1;
}

.nickname {
  font-size: 32rpx;
  color: #fff;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
}

.role-badge {
  font-size: 22rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.15);
  padding: 4rpx 16rpx;
  border-radius: 4rpx;
  display: inline-block;
}

.edit-btn {
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.15);
  border-radius: 8rpx;
}

.edit-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.stats-row {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16rpx;
  padding: 24rpx 0;
  margin-bottom: 32rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.06);
}

.stat-item {
  flex: 1;
  text-align: center;
  border-right: 1rpx solid rgba(255, 255, 255, 0.06);
}

.stat-item:last-child {
  border-right: none;
}

.stat-value {
  font-size: 36rpx;
  color: #667eea;
  font-weight: 700;
  display: block;
  margin-bottom: 4rpx;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  display: block;
}

.menu-section {
  margin-bottom: 24rpx;
}

.menu-section-title {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.menu-list {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid rgba(255, 255, 255, 0.06);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.04);
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.menu-label {
  flex: 1;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
}

.menu-arrow {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.2);
}

.logout-wrap {
  margin-top: 40rpx;
  padding: 0 16rpx;
}

.logout-btn {
  background: rgba(245, 108, 108, 0.08);
  border: 1rpx solid rgba(245, 108, 108, 0.15);
  border-radius: 16rpx;
  padding: 28rpx;
  text-align: center;
}

.logout-text {
  font-size: 28rpx;
  color: #f56c6c;
  font-weight: 500;
}
</style>

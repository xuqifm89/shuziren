<template>
  <view class="system-settings">
    <view class="user-card">
      <view class="avatar-wrap" @tap="handleChangeAvatar">
        <image :src="avatarUrl" class="avatar-img" mode="aspectFill" />
        <view class="avatar-overlay"><text class="avatar-overlay-text">更换</text></view>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userInfo.username || '用户' }}</text>
        <text class="user-email">{{ userInfo.email || '未设置邮箱' }}</text>
      </view>
    </view>

    <view class="settings-tabs">
      <view :class="['tab-item', activeTab === 'profile' ? 'active' : '']" @tap="activeTab = 'profile'">
        <text class="tab-text">个人信息</text>
      </view>
      <view :class="['tab-item', activeTab === 'password' ? 'active' : '']" @tap="activeTab = 'password'">
        <text class="tab-text">修改密码</text>
      </view>
      <view :class="['tab-item', activeTab === 'account' ? 'active' : '']" @tap="activeTab = 'account'">
        <text class="tab-text">账号安全</text>
      </view>
    </view>

    <view v-if="activeTab === 'profile'" class="tab-content">
      <view class="form-group">
        <text class="form-label">用户名</text>
        <input v-model="profileForm.username" class="form-input" placeholder="输入用户名" />
      </view>
      <view class="form-group">
        <text class="form-label">邮箱</text>
        <input v-model="profileForm.email" class="form-input" placeholder="输入邮箱" />
      </view>
      <view class="form-group">
        <text class="form-label">手机号</text>
        <input v-model="profileForm.phone" class="form-input" placeholder="输入手机号" />
      </view>
      <view class="form-group">
        <text class="form-label">个人简介</text>
        <textarea v-model="profileForm.bio" class="form-textarea" placeholder="介绍一下自己" />
      </view>
      <button class="save-btn" @tap="handleSaveProfile">保存修改</button>
    </view>

    <view v-if="activeTab === 'password'" class="tab-content">
      <view class="form-group">
        <text class="form-label">当前密码</text>
        <input v-model="passwordForm.currentPassword" class="form-input" type="password" placeholder="输入当前密码" />
      </view>
      <view class="form-group">
        <text class="form-label">新密码</text>
        <input v-model="passwordForm.newPassword" class="form-input" type="password" placeholder="输入新密码（至少6位）" />
      </view>
      <view class="form-group">
        <text class="form-label">确认密码</text>
        <input v-model="passwordForm.confirmPassword" class="form-input" type="password" placeholder="再次输入新密码" />
      </view>
      <view v-if="passwordForm.newPassword && passwordForm.confirmPassword" class="password-hint">
        <text :class="['hint-text', passwordForm.newPassword === passwordForm.confirmPassword ? 'ok' : 'err']">
          {{ passwordForm.newPassword === passwordForm.confirmPassword ? '✓ 密码一致' : '✕ 密码不一致' }}
        </text>
      </view>
      <button class="save-btn" @tap="handleChangePassword">修改密码</button>
    </view>

    <view v-if="activeTab === 'account'" class="tab-content">
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">账户类型</text>
          <text class="info-value">{{ userInfo.role === 'admin' ? '管理员' : '标准用户' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">注册时间</text>
          <text class="info-value">{{ formatDate(userInfo.createdAt) }}</text>
        </view>
      </view>
      <view class="danger-zone">
        <text class="danger-title">危险区域</text>
        <button class="logout-btn" @tap="handleLogout">退出登录</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index.js'
import { resolveMediaUrl } from '../utils/media.js'

const activeTab = ref('profile')
const userInfo = ref({})
const profileForm = ref({ username: '', email: '', phone: '', bio: '' })
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })

const avatarUrl = computed(() => {
  if (userInfo.value.avatar) return resolveMediaUrl(userInfo.value.avatar)
  return 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'
})

function loadUser() {
  const stored = uni.getStorageSync('userInfo')
  if (stored) {
    const user = typeof stored === 'string' ? JSON.parse(stored) : stored
    userInfo.value = user
    profileForm.value = { username: user.username || '', email: user.email || '', phone: user.phone || '', bio: user.bio || '' }
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '未知'
  try { return new Date(dateStr).toLocaleDateString('zh-CN') } catch (e) { return dateStr }
}

function handleChangeAvatar() {
  uni.chooseImage({
    count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: async (res) => {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          uni.uploadFile({
            url: `${api.getBaseUrl()}/users/${userInfo.value.id}/avatar`,
            filePath: res.tempFilePaths[0], name: 'avatar',
            header: { 'Authorization': `Bearer ${uni.getStorageSync('token')}` },
            success: resolve, fail: reject
          })
        })
        const data = typeof uploadResult.data === 'string' ? JSON.parse(uploadResult.data) : uploadResult.data
        if (data.avatar) {
          userInfo.value.avatar = data.avatar
          uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
          uni.showToast({ title: '头像已更新', icon: 'success' })
        }
      } catch (err) { uni.showToast({ title: '头像更新失败', icon: 'none' }) }
    }
  })
}

async function handleSaveProfile() {
  try {
    await api.put(`/users/${userInfo.value.id}`, {
      nickname: profileForm.value.username,
      email: profileForm.value.email,
      phone: profileForm.value.phone,
      bio: profileForm.value.bio
    })
    Object.assign(userInfo.value, profileForm.value)
    uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (err) { uni.showToast({ title: err.message || '保存失败', icon: 'none' }) }
}

async function handleChangePassword() {
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword) {
    uni.showToast({ title: '请填写完整', icon: 'none' }); return
  }
  if (passwordForm.value.newPassword.length < 6) {
    uni.showToast({ title: '新密码至少6位', icon: 'none' }); return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' }); return
  }
  try {
    await api.put(`/users/${userInfo.value.id}/password`, {
      oldPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    })
    uni.showToast({ title: '密码修改成功', icon: 'success' })
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) { uni.showToast({ title: err.message || '修改失败', icon: 'none' }) }
}

function handleLogout() {
  uni.showModal({
    title: '确认退出', content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        uni.reLaunch({ url: '/pages/index/index' })
      }
    }
  })
}

onMounted(() => { loadUser() })
</script>

<style scoped>
.system-settings { width: 100%; }
.user-card { display: flex; align-items: center; gap: 24rpx; padding: 32rpx; background: rgba(30,30,60,0.7); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; margin-bottom: 24rpx; }
.avatar-wrap { position: relative; width: 120rpx; height: 120rpx; flex-shrink: 0; }
.avatar-img { width: 120rpx; height: 120rpx; border-radius: 50%; border: 4rpx solid rgba(102,126,234,0.5); }
.avatar-overlay { position: absolute; bottom: 0; left: 0; right: 0; height: 36rpx; background: rgba(0,0,0,0.6); border-radius: 0 0 56rpx 56rpx; display: flex; align-items: center; justify-content: center; }
.avatar-overlay-text { font-size: 20rpx; color: #fff; }
.user-info { flex: 1; }
.user-name { font-size: 32rpx; font-weight: 600; color: #fff; display: block; margin-bottom: 4rpx; }
.user-email { font-size: 24rpx; color: rgba(255,255,255,0.5); display: block; }
.settings-tabs { display: flex; margin-bottom: 24rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; overflow: hidden; }
.tab-item { flex: 1; text-align: center; padding: 16rpx 0; }
.tab-item.active { background: rgba(102,126,234,0.2); }
.tab-text { font-size: 26rpx; color: rgba(255,255,255,0.5); }
.tab-item.active .tab-text { color: #667eea; font-weight: 600; }
.tab-content { padding: 0 8rpx; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.form-textarea { width: 100%; height: 180rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.save-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; margin-top: 20rpx; }
.password-hint { margin-bottom: 16rpx; }
.hint-text { font-size: 24rpx; }
.hint-text.ok { color: #67c23a; }
.hint-text.err { color: #f56c6c; }
.info-card { background: rgba(30,30,60,0.7); border: 1rpx solid rgba(102,126,234,0.2); border-radius: 16rpx; padding: 24rpx; margin-bottom: 32rpx; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.info-value { font-size: 26rpx; color: rgba(255,255,255,0.9); }
.danger-zone { padding: 24rpx; background: rgba(245,87,108,0.05); border: 1rpx solid rgba(245,87,108,0.2); border-radius: 16rpx; }
.danger-title { font-size: 24rpx; color: #f56c6c; font-weight: 600; display: block; margin-bottom: 16rpx; }
.logout-btn { width: 100%; height: 80rpx; background: rgba(245,87,108,0.15); color: #f56c6c; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: 1rpx solid rgba(245,87,108,0.3); }
</style>

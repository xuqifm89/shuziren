<template>
  <view class="profile-page">
    <view class="avatar-section">
      <view class="avatar-wrap" @tap="chooseAvatar">
        <text class="avatar-text">{{ userInitial }}</text>
        <view class="avatar-edit-badge">
          <text class="edit-icon">📷</text>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="form-item">
        <text class="form-label">用户名</text>
        <input class="form-input" v-model="form.username" placeholder="请输入用户名" />
      </view>
      <view class="form-item">
        <text class="form-label">邮箱</text>
        <input class="form-input" v-model="form.email" placeholder="请输入邮箱" />
      </view>
      <view class="form-item">
        <text class="form-label">手机号</text>
        <input class="form-input" v-model="form.phone" placeholder="请输入手机号" type="number" />
      </view>
      <view class="form-item">
        <text class="form-label">个人简介</text>
        <textarea class="form-textarea" v-model="form.bio" placeholder="请输入个人简介" :maxlength="200" />
      </view>
    </view>

    <view class="save-section">
      <view class="save-btn" @tap="handleSave">
        <text class="save-text">保存修改</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/store/user.js'
import api from '@/api/index.js'

const userStore = useUserStore()

const form = ref({
  username: userStore.userInfo?.username || '',
  email: userStore.userInfo?.email || '',
  phone: userStore.userInfo?.phone || '',
  bio: userStore.userInfo?.bio || ''
})

const userInitial = computed(() => {
  const name = form.value.username
  return name ? name.charAt(0).toUpperCase() : '?'
})

const chooseAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      try {
        uni.showLoading({ title: '上传中...' })
        const result = await api.uploadFile(
          api.resolveApiUrl(`/users/${userStore.userInfo.id}/avatar`),
          tempFilePath,
          'file'
        )
        userStore.setUser({ ...userStore.userInfo, avatar: result.avatarUrl })
        uni.showToast({ title: '头像更新成功', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

const handleSave = async () => {
  if (!form.value.username) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  try {
    uni.showLoading({ title: '保存中...' })
    await api.put(`/users/${userStore.userInfo.id}`, form.value)
    userStore.setUser({ ...userStore.userInfo, ...form.value })
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #0f0f23;
  padding: 24rpx;
}
.avatar-section {
  display: flex;
  justify-content: center;
  padding: 48rpx 0;
}
.avatar-wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}
.avatar-text {
  width: 160rpx;
  height: 160rpx;
  line-height: 160rpx;
  text-align: center;
  font-size: 64rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: block;
}
.avatar-edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 48rpx;
  height: 48rpx;
  background: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #0f0f23;
}
.edit-icon {
  font-size: 24rpx;
}
.form-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.form-item {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
}
.form-item:last-child {
  border-bottom: none;
}
.form-label {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12rpx;
}
.form-input {
  width: 100%;
  font-size: 30rpx;
  color: #fff;
  background: transparent;
  border: none;
  outline: none;
}
.form-textarea {
  width: 100%;
  height: 160rpx;
  font-size: 30rpx;
  color: #fff;
  background: transparent;
  border: none;
}
.save-section {
  padding: 48rpx 32rpx;
}
.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 28rpx;
  text-align: center;
}
.save-text {
  font-size: 30rpx;
  color: #fff;
  font-weight: 600;
}
</style>

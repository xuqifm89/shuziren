<template>
  <view class="change-password-page">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">当前密码</text>
        <input class="form-input" v-model="form.currentPassword" placeholder="请输入当前密码" password />
      </view>
      <view class="form-item">
        <text class="form-label">新密码</text>
        <input class="form-input" v-model="form.newPassword" placeholder="请输入新密码（至少6位）" password />
      </view>
      <view class="form-item">
        <text class="form-label">确认密码</text>
        <input class="form-input" v-model="form.confirmPassword" placeholder="请再次输入新密码" password />
      </view>
    </view>

    <view class="tips">
      <text class="tip-item">• 密码长度至少6位</text>
      <text class="tip-item">• 建议使用字母+数字组合</text>
    </view>

    <view class="submit-section">
      <view class="submit-btn" @tap="handleSubmit">
        <text class="submit-text">修改密码</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/store/user.js'
import api from '@/api/index.js'

const userStore = useUserStore()

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handleSubmit = async () => {
  if (!form.value.currentPassword) {
    uni.showToast({ title: '请输入当前密码', icon: 'none' }); return
  }
  if (!form.value.newPassword || form.value.newPassword.length < 6) {
    uni.showToast({ title: '新密码至少6位', icon: 'none' }); return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' }); return
  }
  try {
    uni.showLoading({ title: '提交中...' })
    await api.put(`/users/${userStore.userInfo.id}/password`, {
      oldPassword: form.value.currentPassword,
      newPassword: form.value.newPassword
    })
    uni.showToast({ title: '密码修改成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch (e) {
    uni.showToast({ title: '密码修改失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<style scoped>
.change-password-page {
  min-height: 100vh;
  background: #0f0f23;
  padding: 24rpx;
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
.form-item:last-child { border-bottom: none; }
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
}
.tips {
  padding: 24rpx 32rpx;
}
.tip-item {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 8rpx;
}
.submit-section {
  padding: 48rpx 32rpx;
}
.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 28rpx;
  text-align: center;
}
.submit-text {
  font-size: 30rpx;
  color: #fff;
  font-weight: 600;
}
</style>

<template>
  <view class="login-page">
    <view class="login-header">
      <text class="app-title">拾光引擎</text>
      <text class="app-subtitle">AI数字人创作平台</text>
    </view>

    <view class="login-form">
      <view class="tab-bar">
        <view
          :class="['tab-item', activeTab === 'login' ? 'active' : '']"
          @tap="activeTab = 'login'"
        >
          <text>登录</text>
        </view>
        <view
          :class="['tab-item', activeTab === 'register' ? 'active' : '']"
          @tap="activeTab = 'register'"
        >
          <text>注册</text>
        </view>
      </view>

      <view v-if="activeTab === 'login'" class="form-content">
        <view class="input-group">
          <text class="input-label">用户名</text>
          <input
            v-model="loginForm.username"
            class="input-field"
            placeholder="请输入用户名"
            placeholder-class="placeholder"
          />
        </view>
        <view class="input-group">
          <text class="input-label">密码</text>
          <input
            v-model="loginForm.password"
            class="input-field"
            type="password"
            placeholder="请输入密码"
            placeholder-class="placeholder"
          />
        </view>
        <button class="submit-btn" @tap="handleLogin" :loading="loading">登录</button>
      </view>

      <view v-if="activeTab === 'register'" class="form-content">
        <view class="input-group">
          <text class="input-label">用户名</text>
          <input
            v-model="registerForm.username"
            class="input-field"
            placeholder="请输入用户名"
            placeholder-class="placeholder"
          />
        </view>
        <view class="input-group">
          <text class="input-label">密码</text>
          <input
            v-model="registerForm.password"
            class="input-field"
            type="password"
            placeholder="请输入密码"
            placeholder-class="placeholder"
          />
        </view>
        <view class="input-group">
          <text class="input-label">确认密码</text>
          <input
            v-model="registerForm.confirmPassword"
            class="input-field"
            type="password"
            placeholder="请再次输入密码"
            placeholder-class="placeholder"
          />
        </view>
        <view class="input-group">
          <text class="input-label">昵称</text>
          <input
            v-model="registerForm.nickname"
            class="input-field"
            placeholder="请输入昵称（选填）"
            placeholder-class="placeholder"
          />
        </view>
        <button class="submit-btn" @tap="handleRegister" :loading="loading">注册</button>
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <view class="divider">
        <view class="divider-line"></view>
        <text class="divider-text">其他登录方式</text>
        <view class="divider-line"></view>
      </view>

      <view class="wechat-login" @tap="handleWechatLogin">
        <view class="wechat-icon-wrap">
          <text class="wechat-icon">💬</text>
        </view>
        <text class="wechat-text">微信一键登录</text>
      </view>
      <!-- #endif -->
    </view>

    <view class="agreement">
      <text class="agreement-text">登录即表示同意</text>
      <text class="agreement-link" @tap="showAgreement('user')">《用户协议》</text>
      <text class="agreement-text">和</text>
      <text class="agreement-link" @tap="showAgreement('privacy')">《隐私政策》</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import api from '../../api/index.js'
import { useUserStore } from '../../store/user.js'
import { getTaskWebSocket } from '../../utils/websocket.js'

const activeTab = ref('login')
const loading = ref(false)
const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', confirmPassword: '', nickname: '' })
const userStore = useUserStore()

async function handleLogin() {
  if (!loginForm.value.username || !loginForm.value.password) {
    uni.showToast({ title: '请填写用户名和密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const result = await api.auth.login(loginForm.value)
    userStore.setUser(result.user || result)
    userStore.setToken(result.token)

    const ws = getTaskWebSocket()
    if (!ws.isConnected) ws.connect()
    const userId = result.user?.id || result.id
    if (userId) ws.authenticate(userId)

    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 1000)
  } catch (err) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const form = registerForm.value
  if (!form.username || !form.password) {
    uni.showToast({ title: '请填写用户名和密码', icon: 'none' })
    return
  }
  if (form.password !== form.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const result = await api.auth.register({
      username: form.username,
      password: form.password,
      nickname: form.nickname || form.username
    })
    userStore.setUser(result.user || result)
    userStore.setToken(result.token)

    const ws = getTaskWebSocket()
    if (!ws.isConnected) ws.connect()
    const userId = result.user?.id || result.id
    if (userId) ws.authenticate(userId)

    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 1000)
  } catch (err) {
    uni.showToast({ title: err.message || '注册失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// #ifdef MP-WEIXIN
function handleWechatLogin() {
  uni.getUserProfile({
    desc: '用于完善用户资料',
    success: (profileRes) => {
      uni.login({
        provider: 'weixin',
        success: async (loginRes) => {
          loading.value = true
          try {
            const result = await api.post('/users/wechat-login', {
              code: loginRes.code,
              nickName: profileRes.userInfo.nickName,
              avatarUrl: profileRes.userInfo.avatarUrl,
              gender: profileRes.userInfo.gender
            })
            userStore.setUser(result.user || result)
            userStore.setToken(result.token)

            const ws = getTaskWebSocket()
            if (!ws.isConnected) ws.connect()
            const userId = result.user?.id || result.id
            if (userId) ws.authenticate(userId)

            uni.showToast({ title: '登录成功', icon: 'success' })
            setTimeout(() => {
              uni.switchTab({ url: '/pages/index/index' })
            }, 1000)
          } catch (err) {
            uni.showToast({ title: err.message || '微信登录失败', icon: 'none' })
          } finally {
            loading.value = false
          }
        },
        fail: () => {
          uni.showToast({ title: '微信登录取消', icon: 'none' })
        }
      })
    },
    fail: () => {
      uni.showToast({ title: '需要授权才能登录', icon: 'none' })
    }
  })
}
// #endif

function showAgreement(type) {
  const title = type === 'user' ? '用户协议' : '隐私政策'
  uni.showModal({
    title,
    content: type === 'user'
      ? '欢迎使用拾光引擎！本协议是您与拾光引擎之间关于使用拾光引擎服务所订立的协议。'
      : '我们重视您的隐私保护。本政策说明我们如何收集、使用和保护您的个人信息。',
    showCancel: false
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
  padding: 60rpx 40rpx;
}

.login-header {
  text-align: center;
  margin-bottom: 60rpx;
}

.app-title {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 12rpx;
}

.app-subtitle {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.5);
}

.login-form {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 40rpx;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.tab-bar {
  display: flex;
  margin-bottom: 36rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12rpx;
  padding: 4rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.6);
  border-radius: 10rpx;
  transition: all 0.3s;
}

.tab-item.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.form-content {
  padding: 0;
}

.input-group {
  margin-bottom: 28rpx;
}

.input-label {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12rpx;
}

.input-field {
  width: 100%;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #fff;
  box-sizing: border-box;
}

.placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 12rpx;
  border: none;
  margin-top: 16rpx;
}

.divider {
  display: flex;
  align-items: center;
  margin: 36rpx 0;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: rgba(255, 255, 255, 0.1);
}

.divider-text {
  padding: 0 20rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.3);
}

.wechat-login {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background: rgba(7, 193, 96, 0.1);
  border: 1rpx solid rgba(7, 193, 96, 0.2);
  border-radius: 12rpx;
}

.wechat-icon-wrap {
  width: 48rpx;
  height: 48rpx;
  background: #07c160;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}

.wechat-icon {
  font-size: 28rpx;
}

.wechat-text {
  font-size: 28rpx;
  color: #07c160;
  font-weight: 500;
}

.agreement {
  text-align: center;
  margin-top: 40rpx;
}

.agreement-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.3);
}

.agreement-link {
  font-size: 22rpx;
  color: #667eea;
}
</style>

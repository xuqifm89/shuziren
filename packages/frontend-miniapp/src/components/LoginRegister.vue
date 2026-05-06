<template>
  <view class="login-register">
    <view class="login-container">
      <image src="/static/logo.png" class="login-logo" mode="aspectFit" />
      <text class="login-title">拾光引擎AI</text>
      <text class="login-subtitle">超级IP智能体</text>
      <view class="tab-bar">
        <view :class="['tab-item', activeTab === 'login' ? 'active' : '']" @tap="activeTab = 'login'">
          <text class="tab-text">登录</text>
        </view>
        <view :class="['tab-item', activeTab === 'register' ? 'active' : '']" @tap="activeTab = 'register'">
          <text class="tab-text">注册</text>
        </view>
      </view>
      <view v-if="activeTab === 'login'" class="form-section">
        <view class="form-group">
          <input v-model="loginForm.username" class="form-input" placeholder="用户名" />
        </view>
        <view class="form-group">
          <input v-model="loginForm.password" class="form-input" placeholder="密码" type="password" />
        </view>
        <button class="action-btn" @tap="handleLogin" :loading="isLoading" :disabled="isLoading">登录</button>
      </view>
      <view v-if="activeTab === 'register'" class="form-section">
        <view class="form-group">
          <input v-model="registerForm.username" class="form-input" placeholder="用户名" />
        </view>
        <view class="form-group">
          <input v-model="registerForm.password" class="form-input" placeholder="密码" type="password" />
        </view>
        <view class="form-group">
          <input v-model="registerForm.confirmPassword" class="form-input" placeholder="确认密码" type="password" />
        </view>
        <button class="action-btn" @tap="handleRegister" :loading="isLoading" :disabled="isLoading">注册</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api/index.js'

const emit = defineEmits(['login-success'])

const activeTab = ref('login')
const isLoading = ref(false)
const loginForm = ref({ username: '', password: '' })
const registerForm = ref({ username: '', password: '', confirmPassword: '' })

async function handleLogin() {
  if (!loginForm.value.username || !loginForm.value.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' }); return
  }
  isLoading.value = true
  try {
    const result = await api.post('/users/login', loginForm.value)
    const token = result.token || result.data?.token || ''
    const user = result.user || result.data?.user || {}
    if (token) {
      uni.setStorageSync('token', token)
      uni.setStorageSync('userInfo', JSON.stringify(user))
      emit('login-success', { token, user })
      uni.showToast({ title: '登录成功', icon: 'success' })
    } else {
      uni.showToast({ title: '登录失败', icon: 'none' })
    }
  } catch (err) { uni.showToast({ title: err.message || '登录失败', icon: 'none' }) }
  finally { isLoading.value = false }
}

async function handleRegister() {
  if (!registerForm.value.username || !registerForm.value.password) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' }); return
  }
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' }); return
  }
  isLoading.value = true
  try {
    await api.post('/users/register', { username: registerForm.value.username, password: registerForm.value.password })
    uni.showToast({ title: '注册成功，请登录', icon: 'success' })
    activeTab.value = 'login'
    loginForm.value.username = registerForm.value.username
  } catch (err) { uni.showToast({ title: err.message || '注册失败', icon: 'none' }) }
  finally { isLoading.value = false }
}
</script>

<style scoped>
.login-register { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%); }
.login-container { width: 80%; max-width: 600rpx; padding: 60rpx 40rpx; background: rgba(30,30,60,0.7); backdrop-filter: blur(15px); border-radius: 24rpx; border: 1rpx solid rgba(102,126,234,0.3); display: flex; flex-direction: column; align-items: center; }
.login-logo { width: 120rpx; height: 120rpx; margin-bottom: 20rpx; }
.login-title { font-size: 40rpx; font-weight: 700; background: linear-gradient(135deg,#667eea,#764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8rpx; }
.login-subtitle { font-size: 24rpx; color: rgba(255,255,255,0.5); margin-bottom: 40rpx; }
.tab-bar { display: flex; width: 100%; margin-bottom: 32rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; overflow: hidden; }
.tab-item { flex: 1; text-align: center; padding: 16rpx 0; }
.tab-item.active { background: rgba(102,126,234,0.2); }
.tab-text { font-size: 28rpx; color: rgba(255,255,255,0.5); }
.tab-item.active .tab-text { color: #667eea; font-weight: 600; }
.form-section { width: 100%; }
.form-group { margin-bottom: 24rpx; }
.form-input { width: 100%; height: 80rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 24rpx; font-size: 28rpx; color: #fff; box-sizing: border-box; }
.action-btn { width: 100%; height: 88rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 32rpx; font-weight: 600; border-radius: 12rpx; border: none; margin-top: 16rpx; }
.action-btn[disabled] { opacity: 0.5; }
</style>

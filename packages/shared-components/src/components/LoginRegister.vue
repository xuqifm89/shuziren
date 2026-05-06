<template>
  <div class="login-container">
    <div class="bg-image"></div>
    <div class="content-wrapper">
      <div class="left-panel">
        <div class="panel-header">
          <div class="logo-section">
            <img src="@/assets/logo.png" alt="Logo" class="login-logo" />
            <h1 class="site-title">拾光引擎AI-超级IP智能体</h1>
          </div>
        </div>

        <div class="main-title">
          <span v-if="activeTab === 'login'">账号登录</span>
          <span v-else>账号注册</span>
        </div>

        <div class="form-tabs">
          <button
            :class="['tab-btn', { active: activeTab === 'login' }]"
            @click="activeTab = 'login'"
          >
            登录
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'register' }]"
            @click="activeTab = 'register'"
          >
            注册
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="auth-form">
          <div class="form-group" v-if="activeTab === 'register'">
            <div class="input-wrapper">
              <input
                type="text"
                v-model="formData.username"
                placeholder="用户名"
                required
              />
              <span class="input-icon">✏️</span>
            </div>
          </div>

          <div class="form-group">
            <div class="input-wrapper">
              <input
                type="text"
                v-model="formData.email"
                placeholder="用户名 / 邮箱"
                required
              />
              <span class="input-icon">👤</span>
            </div>
          </div>

          <div class="form-group">
            <div class="input-wrapper">
              <input
                type="password"
                v-model="formData.password"
                placeholder="密码"
                required
              />
            </div>
          </div>

          <div class="form-group" v-if="activeTab === 'register'">
            <div class="input-wrapper">
              <input
                type="password"
                v-model="formData.confirmPassword"
                placeholder="确认密码"
                required
              />
            </div>
          </div>

          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? '处理中...' : (activeTab === 'login' ? '立即登录' : '立即注册') }}
          </button>
        </form>

        <div class="switch-form">
          <span v-if="activeTab === 'register'">已有账号？</span>
          <span v-else>没有账号？</span>
          <span
            class="switch-link"
            @click="activeTab = activeTab === 'login' ? 'register' : 'login'"
          >
            {{ activeTab === 'login' ? '立即注册' : '立即登录' }}
          </span>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  apiBase: { type: String, default: '' }
})

const emit = defineEmits(['login-success'])

const base = computed(() => props.apiBase || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/api$/, '') : ''))

const activeTab = ref('login')
const loading = ref(false)

const formData = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const handleSubmit = async () => {
  if (activeTab.value === 'register' && formData.value.password !== formData.value.confirmPassword) {
    alert('两次密码输入不一致')
    return
  }

  loading.value = true

  try {
    if (activeTab.value === 'login') {
      const response = await fetch(`${base.value}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.value.email,
          password: formData.value.password
        })
      })

      const result = await response.json()

      if (response.ok) {
        localStorage.setItem('userInfo', JSON.stringify(result))
        if (result.token) {
          localStorage.setItem('token', result.token)
        }
        alert('登录成功！')
        emit('login-success')
      } else {
        let errorMsg = result.error || '登录失败'
        alert(errorMsg)
      }
    } else {
      const response = await fetch(`${base.value}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.value.username,
          email: formData.value.email,
          password: formData.value.password
        })
      })

      const result = await response.json()

      if (response.ok) {
        localStorage.setItem('userInfo', JSON.stringify(result))
        if (result.token) {
          localStorage.setItem('token', result.token)
        }
        alert('注册成功！')
        activeTab.value = 'login'
      } else {
        let errorMsg = result.error || '注册失败'
        alert(errorMsg)
      }
    }
  } catch (error) {
    console.error('Auth error:', error)
    alert('网络连接失败，请检查后端服务是否已启动')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.bg-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('@/assets/bg-login.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding-left: 15%;
}

.left-panel {
  width: 480px;
  background: linear-gradient(180deg, rgba(40, 80, 180, 0.4) 0%, rgba(20, 40, 120, 0.45) 100%);
  border-radius: 20px;
  padding: 24px 48px 40px;
  box-shadow: 0 0 60px rgba(100, 150, 255, 0.3);
  border: 1px solid rgba(100, 180, 255, 0.4);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.left-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(180deg, rgba(60, 100, 200, 0.4) 0%, rgba(40, 80, 180, 0.1) 100%);
  border-radius: 20px 20px 0 0;
  z-index: 0;
}

.panel-header {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.login-logo {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
  background: rgba(20, 30, 60, 0.9);
  padding: 4px;
}

.site-title {
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0;
  text-shadow: 0 0 10px rgba(100, 180, 255, 0.3);
}

.main-title {
  position: relative;
  z-index: 1;
  font-size: 35px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 32px;
  letter-spacing: 6px;
  text-shadow: 0 0 20px rgba(100, 180, 255, 0.5);
}

.form-tabs {
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

.tab-btn {
  flex: 1;
  padding: 14px 24px;
  border: 2px solid rgba(100, 180, 255, 0.4);
  background: rgba(40, 80, 180, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  border-color: rgba(100, 180, 255, 0.8);
  color: #ffffff;
  background: rgba(60, 120, 220, 0.2);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(100, 200, 255, 0.9) 0%, rgba(140, 100, 255, 0.9) 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 20px rgba(100, 180, 255, 0.4);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  z-index: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  width: 100%;
  padding: 18px 24px;
  background: rgba(40, 80, 180, 0.2);
  border: 2px solid rgba(100, 180, 255, 0.3);
  border-radius: 16px;
  font-size: 18px;
  color: #ffffff;
  outline: none;
  transition: all 0.3s ease;
}

.input-wrapper input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.input-wrapper input:focus {
  border-color: rgba(100, 200, 255, 0.8);
  box-shadow: 0 0 20px rgba(100, 180, 255, 0.2);
  background: rgba(60, 120, 220, 0.35);
}

.input-icon {
  position: absolute;
  right: 20px;
  font-size: 20px;
  opacity: 0.8;
}

.submit-btn {
  margin-top: 8px;
  padding: 18px 32px;
  background: linear-gradient(135deg, rgba(100, 200, 255, 0.95) 0%, rgba(120, 100, 255, 0.95) 50%, rgba(140, 80, 255, 0.95) 100%);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 30px rgba(100, 180, 255, 0.5);
  letter-spacing: 4px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 40px rgba(100, 180, 255, 0.7);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-form {
  margin-top: 32px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.switch-link {
  color: #60d0ff;
  cursor: pointer;
  margin-left: 8px;
  font-weight: 600;
  transition: color 0.3s ease;
}

.switch-link:hover {
  color: #a0e8ff;
  text-decoration: underline;
}
</style>

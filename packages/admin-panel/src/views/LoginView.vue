<template>
  <div class="login-view">
    <div class="admin-login-card">
      <div class="login-header">
        <div class="admin-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
        </div>
        <h1>管理后台</h1>
        <p class="subtitle">用户管理与系统配置</p>
      </div>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="adminUsername" type="text" placeholder="请输入管理员用户名" autocomplete="username" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="adminPassword" type="password" placeholder="请输入密码" autocomplete="current-password" :class="{ error: loginError }" />
          <span v-if="loginError" class="error-message">{{ loginError }}</span>
        </div>
        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="!loading">进入管理后台</span>
          <span v-else class="loading-spinner"></span>
        </button>
      </form>
      <div class="login-footer">
        <a href="/" class="back-link">← 返回用户前台</a>
      </div>
      <div class="security-notice">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <span>此区域仅限授权管理员访问</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '../utils/api.js'

const router = useRouter()
const adminUsername = ref('')
const adminPassword = ref('')
const loading = ref(false)
const loginError = ref('')

const handleLogin = async () => {
  if (!adminUsername.value.trim()) { loginError.value = '请输入管理员用户名'; return }
  if (!adminPassword.value.trim()) { loginError.value = '请输入密码'; return }
  loading.value = true
  loginError.value = ''
  try {
    const result = await api.post('/users/login', { username: adminUsername.value, password: adminPassword.value })
    if (result.token && (result.role === 'admin' || result.role === 'superadmin')) {
      sessionStorage.setItem('adminToken', result.token)
      sessionStorage.setItem('admin_auth_time', Date.now().toString())
      sessionStorage.setItem('adminUserInfo', JSON.stringify({ id: result.id, username: result.username, role: result.role }))
      ElMessage.success('✅ 登录成功')
      router.push('/')
    } else if (result.token) {
      loginError.value = '该账户没有管理员权限'
    } else {
      loginError.value = result.error || '登录失败'
    }
  } catch (error) {
    loginError.value = '用户名或密码错误'
  } finally { loading.value = false }
}
</script>

<style scoped>
.login-view { min-height: 100vh; background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%); display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; overflow: hidden; }
.login-view::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at 20% 20%, rgba(102,126,234,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(118,75,162,0.1) 0%, transparent 50%); pointer-events: none; }
.admin-login-card { position: relative; z-index: 1; width: 100%; max-width: 420px; background: rgba(30,30,60,0.85); backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(102,126,234,0.3); padding: 40px 36px; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(102,126,234,0.1); }
.login-header { text-align: center; margin-bottom: 32px; }
.admin-icon { display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; margin-bottom: 20px; color: #fff; box-shadow: 0 8px 32px rgba(102,126,234,0.4); }
.login-header h1 { color: #fff; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; }
.subtitle { color: rgba(255,255,255,0.5); font-size: 15px; margin: 0; }
.login-form { margin-bottom: 24px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 500; margin-bottom: 8px; }
.form-group input { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; color: #fff; font-size: 15px; transition: all 0.25s ease; outline: none; box-sizing: border-box; }
.form-group input::placeholder { color: rgba(255,255,255,0.35); }
.form-group input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.15); background: rgba(255,255,255,0.08); }
.form-group input.error { border-color: #f56c6c; box-shadow: 0 0 0 3px rgba(245,108,108,0.15); }
.error-message { display: block; color: #f56c6c; font-size: 12px; margin-top: 6px; }
.login-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 12px; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 20px rgba(102,126,234,0.35); display: flex; align-items: center; justify-content: center; }
.login-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 28px rgba(102,126,234,0.5); }
.login-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.loading-spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.login-footer { text-align: center; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); }
.back-link { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px; transition: color 0.25s ease; }
.back-link:hover { color: #667eea; }
.security-notice { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 20px; padding: 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; color: rgba(245,158,11,0.9); font-size: 12px; }
</style>

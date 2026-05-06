<template>
  <div class="settings-page">
    <div class="settings-layout">
      <div class="settings-sidebar">
        <div class="profile-card">
          <div class="profile-avatar">
            <el-upload
              :show-file-list="false"
              :before-upload="beforeAvatarUpload"
              :http-request="handleAvatarUpload"
              accept="image/jpeg,image/png,image/gif,image/webp"
            >
              <div class="avatar-wrapper">
                <img v-if="avatarUrl" :src="avatarUrl" alt="头像" class="avatar-img" />
                <div v-else class="avatar-placeholder">{{ userInitial }}</div>
                <div class="avatar-overlay">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <span>更换头像</span>
                </div>
              </div>
            </el-upload>
          </div>
          <h3 class="profile-name">{{ userInfo.username || '未设置用户名' }}</h3>
          <p class="profile-email">{{ userInfo.email || '未设置邮箱' }}</p>
          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">{{ userInfo.phone || '--' }}</span>
              <span class="stat-label">手机号</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ userInfo.bio ? userInfo.bio.length : 0 }}</span>
              <span class="stat-label">简介字数</span>
            </div>
          </div>
        </div>

        <div class="sidebar-nav">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            :class="['sidebar-nav-item', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            <div class="nav-item-icon" v-html="tab.icon"></div>
            <span>{{ tab.label }}</span>
          </div>
        </div>
      </div>

      <div class="settings-main">
        <div class="main-header">
          <h2>{{ currentTabTitle }}</h2>
          <p>{{ currentTabDesc }}</p>
        </div>

        <div class="main-body">
          <template v-if="activeTab === 'profile'">
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">用户名</label>
                  <el-input v-model="userInfo.username" placeholder="请输入用户名" />
                </div>
                <div class="form-group">
                  <label class="form-label">邮箱</label>
                  <el-input v-model="userInfo.email" placeholder="请输入邮箱" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">手机号</label>
                  <el-input v-model="userInfo.phone" placeholder="请输入手机号" />
                </div>
                <div class="form-group">
                  <label class="form-label">个人简介</label>
                  <el-input v-model="userInfo.bio" placeholder="请输入个人简介" />
                </div>
              </div>
              <div class="form-actions">
                <el-button type="primary" @click="handleSave" :loading="saving">保存修改</el-button>
              </div>
            </div>
          </template>

          <template v-if="activeTab === 'password'">
            <div class="form-section">
              <div class="form-row single">
                <div class="form-group">
                  <label class="form-label">当前密码</label>
                  <el-input v-model="passwordForm.currentPassword" type="password" placeholder="请输入当前密码" show-password />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">新密码</label>
                  <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password />
                </div>
                <div class="form-group">
                  <label class="form-label">确认密码</label>
                  <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
                </div>
              </div>
              <div class="password-tips">
                <div class="tip-item" :class="{ valid: passwordForm.newPassword.length >= 6 }">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <span>密码长度至少6位</span>
                </div>
                <div class="tip-item" :class="{ valid: passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword }">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <span>两次输入密码一致</span>
                </div>
              </div>
              <div class="form-actions">
                <el-button type="primary" @click="handleChangePassword" :loading="changingPassword">修改密码</el-button>
              </div>
            </div>
          </template>

          <template v-if="activeTab === 'account'">
            <div class="form-section">
              <div class="account-info-card">
                <div class="info-row">
                  <div class="info-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                  <div class="info-content">
                    <span class="info-label">账户类型</span>
                    <span class="info-value">标准用户</span>
                  </div>
                </div>
                <div class="info-row">
                  <div class="info-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                  </div>
                  <div class="info-content">
                    <span class="info-label">注册时间</span>
                    <span class="info-value">{{ registerTime }}</span>
                  </div>
                </div>
              </div>

              <div class="danger-zone">
                <div class="danger-header">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                  <span>危险区域</span>
                </div>
                <div class="danger-item">
                  <div class="danger-info">
                    <h4>退出登录</h4>
                    <p>退出当前账户，返回登录页面</p>
                  </div>
                  <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <el-dialog v-model="showLogoutConfirm" title="确认退出" width="400px" :close-on-click-modal="false" center>
      <div class="logout-dialog">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="rgba(245, 87, 108, 0.8)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <p>确定要退出当前账户吗？</p>
        <span>退出后需要重新登录才能继续使用</span>
      </div>
      <template #footer>
        <el-button @click="showLogoutConfirm = false">取消</el-button>
        <el-button type="danger" @click="confirmLogout" :loading="loggingOut">确定退出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  apiBase: { type: String, default: '' }
})

const base = computed(() => props.apiBase || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/api$/, '') : ''))

const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

const activeTab = ref('profile')
const saving = ref(false)
const changingPassword = ref(false)
const loggingOut = ref(false)
const showLogoutConfirm = ref(false)
const avatarUrl = ref('')

const userInfo = ref({
  username: '',
  email: '',
  phone: '',
  bio: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const tabs = [
  {
    key: 'profile',
    label: '个人信息',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'
  },
  {
    key: 'password',
    label: '修改密码',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>'
  },
  {
    key: 'account',
    label: '账号安全',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>'
  }
]

const currentTabTitle = computed(() => {
  const tab = tabs.find(t => t.key === activeTab.value)
  return tab ? tab.label : ''
})

const currentTabDesc = computed(() => {
  const descs = {
    profile: '管理您的个人资料信息',
    password: '更新您的账户密码',
    account: '查看账号信息与安全设置'
  }
  return descs[activeTab.value] || ''
})

const userInitial = computed(() => {
  const name = userInfo.value.username
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
})

const registerTime = computed(() => {
  const stored = localStorage.getItem('userInfo')
  if (stored) {
    const parsed = JSON.parse(stored)
    if (parsed.createdAt) return parsed.createdAt
  }
  return '未知'
})

onMounted(() => {
  loadUserInfo()
})

const loadUserInfo = () => {
  try {
    const stored = localStorage.getItem('userInfo')
    if (stored) {
      const parsed = JSON.parse(stored)
      userInfo.value = {
        username: parsed.username || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        bio: parsed.bio || ''
      }
      if (parsed.avatar) {
        avatarUrl.value = parsed.avatar.startsWith('http') || parsed.avatar.startsWith('local-media://') ? parsed.avatar : `${base.value}${parsed.avatar}`
      }
    }
  } catch (err) {
    console.error('Failed to load user info:', err)
  }
}

const beforeAvatarUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB！')
    return false
  }
  return true
}

const handleAvatarUpload = async ({ file }) => {
  const stored = localStorage.getItem('userInfo')
  const currentUser = stored ? JSON.parse(stored) : {}

  if (!currentUser.id) {
    ElMessage.error('用户未登录')
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const token = localStorage.getItem('token')
    const authHeaders = {}
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${base.value}/api/users/${currentUser.id}/avatar`, {
      method: 'POST',
      headers: authHeaders,
      body: formData
    })

    const data = await response.json()

    if (response.ok) {
      avatarUrl.value = `${base.value}${data.avatarUrl}`

      const updatedUser = { ...currentUser, avatar: data.avatarUrl }
      localStorage.setItem('userInfo', JSON.stringify(updatedUser))

      ElMessage.success('头像上传成功')
    } else {
      if (response.status === 401) {
        ElMessage.error('登录已过期，请重新登录')
      } else {
        ElMessage.error(data.error || '头像上传失败')
      }
    }
  } catch (err) {
    console.error('Avatar upload failed:', err)
    ElMessage.error('头像上传失败')
  }
}

const handleSave = async () => {
  if (!userInfo.value.username) {
    ElMessage.warning('请输入用户名')
    return
  }

  saving.value = true
  try {
    const stored = localStorage.getItem('userInfo')
    const currentUser = stored ? JSON.parse(stored) : {}

    const updatedUser = {
      ...currentUser,
      ...userInfo.value
    }

    localStorage.setItem('userInfo', JSON.stringify(updatedUser))

    if (currentUser.id) {
      const response = await fetch(`${base.value}/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nickname: userInfo.value.username,
          email: userInfo.value.email,
          phone: userInfo.value.phone,
          bio: userInfo.value.bio
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (response.status === 401) {
          ElMessage.error('登录已过期，请重新登录')
          return
        }
        throw new Error(data.error || '保存失败')
      }
    }

    ElMessage.success('个人信息保存成功')
  } catch (err) {
    console.error('Failed to save user info:', err)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleChangePassword = async () => {
  if (!passwordForm.currentPassword) {
    ElMessage.warning('请输入当前密码')
    return
  }

  if (!passwordForm.newPassword) {
    ElMessage.warning('请输入新密码')
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('密码长度不能少于6位')
    return
  }

  changingPassword.value = true
  try {
    const stored = localStorage.getItem('userInfo')
    const currentUser = stored ? JSON.parse(stored) : {}

    if (!currentUser.id) {
      ElMessage.error('用户未登录')
      return
    }

    const response = await fetch(`${base.value}/api/users/${currentUser.id}/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        oldPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
    })

    const data = await response.json()

    if (response.ok) {
      ElMessage.success('密码修改成功')
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } else {
      if (response.status === 401) {
        ElMessage.error('登录已过期，请重新登录')
      } else {
        ElMessage.error(data.error || '密码修改失败')
      }
    }
  } catch (err) {
    console.error('Failed to change password:', err)
    ElMessage.error('密码修改失败')
  } finally {
    changingPassword.value = false
  }
}

const handleLogout = () => {
  showLogoutConfirm.value = true
}

const confirmLogout = () => {
  loggingOut.value = true
  setTimeout(() => {
    localStorage.removeItem('userInfo')
    localStorage.removeItem('token')
    showLogoutConfirm.value = false
    loggingOut.value = false
    ElMessage.success('已退出登录')
    setTimeout(() => {
      window.location.reload()
    }, 300)
  }, 500)
}
</script>

<style scoped>
.settings-page {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.settings-layout {
  display: flex;
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
  min-height: 100%;
}

.settings-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-card {
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  padding: 32px 24px;
  text-align: center;
}

.profile-avatar {
  margin-bottom: 20px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
}

.avatar-img {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(102, 126, 234, 0.5);
  box-shadow: 0 0 30px rgba(102, 126, 234, 0.3);
}

.avatar-placeholder {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  color: #fff;
  border: 3px solid rgba(102, 126, 234, 0.5);
  box-shadow: 0 0 30px rgba(102, 126, 234, 0.3);
  margin: 0 auto;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.25s ease;
  color: #fff;
  cursor: pointer;
}

.avatar-overlay span {
  font-size: 11px;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.profile-name {
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.profile-email {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 0 0 20px 0;
}

.profile-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.stat-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: rgba(255, 255, 255, 0.1);
}

.sidebar-nav {
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  overflow: hidden;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.25s ease;
  border-left: 3px solid transparent;
}

.sidebar-nav-item:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(102, 126, 234, 0.08);
}

.sidebar-nav-item.active {
  color: #fff;
  background: rgba(102, 126, 234, 0.15);
  border-left-color: #667eea;
}

.nav-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
}

.sidebar-nav-item.active .nav-item-icon {
  opacity: 1;
  color: #667eea;
}

.settings-main {
  flex: 1;
  min-width: 0;
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  display: flex;
  flex-direction: column;
}

.main-header {
  padding: 28px 32px 0;
}

.main-header h2 {
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.main-header p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 0;
}

.main-body {
  padding: 28px 32px 32px;
  flex: 1;
}

.form-section {
  max-width: 600px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-row.single {
  grid-template-columns: 1fr;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
}

.form-group :deep(.el-input__wrapper),
.form-group :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  box-shadow: none;
  transition: all 0.25s ease;
}

.form-group :deep(.el-input__wrapper:hover),
.form-group :deep(.el-textarea__inner:hover) {
  border-color: rgba(255, 255, 255, 0.25);
}

.form-group :deep(.el-input__wrapper.is-focus),
.form-group :deep(.el-textarea__inner:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

.form-group :deep(.el-input__inner),
.form-group :deep(.el-textarea__inner) {
  color: #fff;
  font-size: 14px;
}

.form-group :deep(.el-input__inner::placeholder),
.form-group :deep(.el-textarea__inner::placeholder) {
  color: rgba(255, 255, 255, 0.35);
}

.form-actions {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.form-actions :deep(.el-button--primary) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  padding: 10px 32px;
  border-radius: 10px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.35);
  transition: all 0.25s ease;
}

.form-actions :deep(.el-button--primary:hover) {
  box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);
  transform: translateY(-1px);
}

.password-tips {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 8px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  transition: color 0.25s ease;
}

.tip-item svg {
  flex-shrink: 0;
}

.tip-item.valid {
  color: #4caf50;
}

.account-info-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-bottom: 28px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.info-row:last-child {
  border-bottom: none;
}

.info-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(102, 126, 234, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
  flex-shrink: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

.info-value {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.danger-zone {
  border: 1px solid rgba(245, 87, 108, 0.2);
  border-radius: 12px;
  overflow: hidden;
}

.danger-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: rgba(245, 87, 108, 0.06);
  color: rgba(245, 87, 108, 0.9);
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid rgba(245, 87, 108, 0.12);
}

.danger-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
}

.danger-info h4 {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  margin: 0 0 4px 0;
}

.danger-info p {
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  margin: 0;
}

.danger-item :deep(.el-button--danger) {
  border-radius: 10px;
  padding: 10px 24px;
  font-weight: 500;
}

.logout-dialog {
  text-align: center;
  padding: 16px 0;
}

.logout-dialog svg {
  margin-bottom: 16px;
}

.logout-dialog p {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px 0;
}

.logout-dialog span {
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }

  .settings-sidebar {
    width: 100%;
  }

  .profile-stats {
    justify-content: center;
  }

  .sidebar-nav {
    display: flex;
  }

  .sidebar-nav-item {
    flex: 1;
    justify-content: center;
    border-left: none;
    border-bottom: 3px solid transparent;
  }

  .sidebar-nav-item.active {
    border-bottom-color: #667eea;
    border-left-color: transparent;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .main-body {
    padding: 20px;
  }
}
</style>

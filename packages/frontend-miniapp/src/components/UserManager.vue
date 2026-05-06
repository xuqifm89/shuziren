<template>
  <div class="user-manager">
    <div class="manager-layout">
      <div class="page-header">
        <div class="header-left">
          <el-input
            v-model="searchQuery"
            placeholder="搜索用户名/邮箱/手机号..."
            prefix-icon="Search"
            clearable
            style="width: 280px"
            @input="handleSearch"
          />
        </div>
        <div class="header-right">
          <el-button type="primary" @click="handleAddUser">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            添加用户
          </el-button>
          <el-button @click="loadUsers">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            刷新
          </el-button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-chip">
          <span class="stat-num">{{ userStats.total }}</span>
          <span class="stat-text">总用户</span>
        </div>
        <div class="stat-chip active">
          <span class="stat-num">{{ userStats.active }}</span>
          <span class="stat-text">活跃</span>
        </div>
      </div>

      <div class="table-container">
        <el-table
          :data="filteredUsers"
          v-loading="loading"
          stripe
          style="width: 100%"
          empty-text="暂无用户数据"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" align="center" />
          
          <el-table-column label="用户信息" min-width="250">
            <template #default="{ row }">
              <div class="user-info-cell">
                <div class="user-avatar">
                  <img 
                    v-if="row.avatar" 
                    :src="getAvatarUrl(row.avatar)" 
                    :alt="row.username"
                    @error="handleAvatarError"
                  />
                  <div v-else class="avatar-placeholder">
                    {{ getInitial(row.username) }}
                  </div>
                </div>
                <div class="user-details">
                  <div class="username">{{ row.username }}</div>
                  <div class="user-meta">
                    <span v-if="row.nickname" class="nickname">{{ row.nickname }}</span>
                    <span class="id">ID: {{ formatId(row.id) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="email" label="邮箱" min-width="180">
            <template #default="{ row }">
              <span v-if="row.email" class="email-text">{{ row.email }}</span>
              <span v-else class="empty-value">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="phone" label="手机号" min-width="130" align="center">
            <template #default="{ row }">
              <span v-if="row.phone">{{ maskPhone(row.phone) }}</span>
              <span v-else class="empty-value">-</span>
            </template>
          </el-table-column>

          <el-table-column label="光粒子" width="100" align="center">
            <template #default="{ row }">
              <div class="particles-cell">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#f59e0b"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                <span>{{ row.lightParticles || 0 }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" effect="dark" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="lastLoginAt" label="最后登录" min-width="160" align="center">
            <template #default="{ row }">
              <span v-if="row.lastLoginAt">{{ formatDate(row.lastLoginAt) }}</span>
              <span v-else class="empty-value">从未登录</span>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="注册时间" min-width="160" align="center">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="240" align="center" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" size="small" @click="handleEditUser(row)">
                  编辑
                </el-button>
                <el-button 
                  type="warning" 
                  size="small" 
                  @click="handleResetPassword(row)"
                >
                  重置密码
                </el-button>
                <el-popconfirm
                  title="确定要删除此用户吗？此操作不可恢复！"
                  confirm-button-text="确定删除"
                  cancel-button-text="取消"
                  confirm-button-type="danger"
                  @confirm="handleDeleteUser(row)"
                >
                  <template #reference>
                    <el-button type="danger" plain size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-footer">
          <div class="footer-left">
            <el-button 
              type="danger" 
              plain 
              size="small"
              :disabled="selectedUsers.length === 0"
              @click="handleBatchDelete"
            >
              批量删除 ({{ selectedUsers.length }})
            </el-button>
            <span class="selected-info" v-if="selectedUsers.length > 0">
              已选择 {{ selectedUsers.length }} 个用户
            </span>
          </div>
          <div class="footer-right">
            <span class="total-info">
              共 {{ users.length }} 个用户，
              其中 {{ userStats.active }} 个活跃
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="showUserDialog"
      :title="isEditing ? '编辑用户' : '添加用户'"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="100px"
        label-position="top"
      >
        <div class="form-row">
          <el-form-item label="用户名" prop="username">
            <el-input 
              v-model="userForm.username" 
              placeholder="请输入用户名（用于登录）"
              :disabled="isEditing"
            />
          </el-form-item>
          
          <el-form-item v-if="!isEditing" label="密码" prop="password">
            <el-input 
              v-model="userForm.password" 
              type="password" 
              placeholder="请输入密码"
              show-password
            />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="userForm.nickname" placeholder="显示名称（可选）" />
          </el-form-item>
          
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="userForm.email" placeholder="电子邮箱（可选）" />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="userForm.phone" placeholder="手机号码（可选）" />
          </el-form-item>
          
          <el-form-item label="状态" prop="status">
            <el-select v-model="userForm.status" placeholder="选择状态" style="width: 100%">
              <el-option label="正常" value="active" />
              <el-option label="禁用" value="disabled" />
              <el-option label="待验证" value="pending" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="初始光粒子" prop="lightParticles">
          <el-input-number 
            v-model="userForm.lightParticles" 
            :min="0" 
            :max="999999"
            placeholder="默认: 100"
            style="width: 100%"
          />
          <div class="form-tip">新用户的初始光粒子数量</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showUserDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitUser" :loading="submitting">
          {{ isEditing ? '保存修改' : '创建用户' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="showPasswordDialog"
      title="重置用户密码"
      width="450px"
      :close-on-click-modal="false"
    >
      <div class="password-reset-content">
        <div class="reset-warning">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="rgba(245, 158, 11, 0.9)">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <h3>安全警告</h3>
          <p>您正在重置用户 <strong>{{ currentUser?.username }}</strong> 的密码</p>
        </div>

        <el-form :model="passwordForm" label-position="top">
          <el-form-item label="新密码">
            <el-input 
              v-model="passwordForm.newPassword" 
              type="password" 
              placeholder="请输入新密码"
              show-password
              prefix-icon="Lock"
            />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input 
              v-model="passwordForm.confirmPassword" 
              type="password" 
              placeholder="请再次输入新密码"
              show-password
              prefix-icon="Lock"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showPasswordDialog = false">取消</el-button>
        <el-button type="warning" @click="handleSubmitPassword" :loading="resettingPassword">
          确认重置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = '/api/users'

const loading = ref(false)
const submitting = ref(false)
const resettingPassword = ref(false)
const searchQuery = ref('')
const showUserDialog = ref(false)
const showPasswordDialog = ref(false)
const isEditing = ref(false)
const currentUser = ref(null)
const selectedUsers = ref([])
const userFormRef = ref(null)

const users = ref([])

const userForm = reactive({
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  status: 'active',
  lightParticles: 100
})

const passwordForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度在 6 到 50 个字符', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const userStats = computed(() => ({
  total: users.value.length,
  active: users.value.filter(u => u.status === 'active').length
}))

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return users.value
  
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user =>
    user.username?.toLowerCase().includes(query) ||
    user.email?.toLowerCase().includes(query) ||
    user.phone?.includes(query) ||
    user.nickname?.toLowerCase().includes(query)
  )
})

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  loading.value = true
  try {
    const response = await fetch(API_BASE)
    const data = await response.json()
    
    if (Array.isArray(data)) {
      // 隐藏密码字段
      users.value = data.map(user => {
        const { password, ...safeUser } = user
        return safeUser
      })
      
      console.log(`✅ 加载了 ${users.value.length} 个用户`)
    }
  } catch (error) {
    console.error('❌ 加载用户失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  console.log('🔍 搜索:', searchQuery.value)
}

function handleSelectionChange(selection) {
  selectedUsers.value = selection
}

function handleAddUser() {
  isEditing.value = false
  Object.assign(userForm, {
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: '',
    status: 'active',
    lightParticles: 100
  })
  showUserDialog.value = true
}

function handleEditUser(user) {
  isEditing.value = true
  currentUser.value = user
  
  Object.assign(userForm, {
    id: user.id,
    username: user.username,
    nickname: user.nickname || '',
    email: user.email || '',
    phone: user.phone || '',
    status: user.status || 'active',
    lightParticles: user.lightParticles || 0
  })
  
  showUserDialog.value = true
}

async function handleSubmitUser() {
  if (!userFormRef.value) return

  try {
    await userFormRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    let response
    
    if (isEditing.value) {
      // 更新用户
      response = await fetch(`${API_BASE}/${userForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: userForm.nickname,
          email: userForm.email,
          phone: userForm.phone,
          status: userForm.status,
          lightParticles: userForm.lightParticles
        })
      })
    } else {
      // 创建用户
      response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userForm.username,
          password: userForm.password,
          nickname: userForm.nickname,
          email: userForm.email,
          phone: userForm.phone,
          lightParticles: userForm.lightParticles
        })
      })
    }

    const data = await response.json()

    if (response.ok) {
      ElMessage.success(isEditing.value ? '✅ 用户信息已更新' : '✅ 用户创建成功')
      showUserDialog.value = false
      await loadUsers()
    } else {
      ElMessage.error(data.error || (isEditing.value ? '更新失败' : '创建失败'))
    }
  } catch (error) {
    console.error('❌ 操作失败:', error)
    ElMessage.error(isEditing.value ? '更新用户失败' : '创建用户失败')
  } finally {
    submitting.value = false
  }
}

function handleResetPassword(user) {
  currentUser.value = user
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  showPasswordDialog.value = true
}

async function handleSubmitPassword() {
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

  resettingPassword.value = true
  try {
    const response = await fetch(`${API_BASE}/${currentUser.value.id}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPassword: '', // 管理员可以跳过旧密码验证
        newPassword: passwordForm.newPassword
      })
    })

    if (response.ok) {
      ElMessage.success('✅ 密码重置成功')
      showPasswordDialog.value = false
    } else {
      const data = await response.json()
      ElMessage.error(data.error || '密码重置失败')
    }
  } catch (error) {
    console.error('❌ 密码重置失败:', error)
    ElMessage.error('密码重置失败')
  } finally {
    resettingPassword.value = false
  }
}

async function handleDeleteUser(user) {
  try {
    const response = await fetch(`${API_BASE}/${user.id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      ElMessage.success('✅ 用户已删除')
      await loadUsers()
    } else {
      const data = await response.json()
      ElMessage.error(data.error || '删除失败')
    }
  } catch (error) {
    console.error('❌ 删除用户失败:', error)
    ElMessage.error('删除用户失败')
  }
}

async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUsers.value.length} 个用户吗？此操作不可恢复！`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    let successCount = 0
    for (const user of selectedUsers.value) {
      try {
        const response = await fetch(`${API_BASE}/${user.id}`, { method: 'DELETE' })
        if (response.ok) successCount++
      } catch (error) {
        console.error(`删除用户 ${user.username} 失败:`, error)
      }
    }

    if (successCount > 0) {
      ElMessage.success(`✅ 成功删除 ${successCount} 个用户`)
      await loadUsers()
    }
  } catch {
    // 用户取消了操作
  }
}

function getAvatarUrl(avatarPath) {
  if (!avatarPath) return ''
  if (avatarPath.startsWith('http')) return avatarPath
  return `${API_BASE.replace('/api/users', '')}${avatarPath}`
}

function getInitial(username) {
  if (!username) return '?'
  return username.charAt(0).toUpperCase()
}

function formatId(id) {
  if (!id) return '-'
  return id.substring(0, 8) + '...'
}

function maskPhone(phone) {
  if (!phone || phone.length !== 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusType(status) {
  const map = {
    active: 'success',
    disabled: 'danger',
    pending: 'warning'
  }
  return map[status] || 'info'
}

function getStatusLabel(status) {
  const map = {
    active: '正常',
    disabled: '禁用',
    pending: '待验证'
  }
  return map[status] || status
}

function handleAvatarError(e) {
  e.target.style.display = 'none'
}
</script>

<style scoped>
.user-manager {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  box-sizing: border-box;
}

.manager-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  overflow: visible;
  padding: 24px 28px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header .header-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stat-chip .stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.stat-chip .stat-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.stat-chip.active .stat-num {
  color: #4caf50;
}

.table-container {
  flex: 1;
  overflow: auto;
}

.user-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid rgba(102, 126, 234, 0.3);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.user-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nickname {
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
}

.id {
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
  font-family: monospace;
}

.email-text {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.empty-value {
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

.particles-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #f59e0b;
  font-weight: 600;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.table-footer {
  padding: 16px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-info {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.footer-right {
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-tip {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.password-reset-content {
  text-align: center;
}

.reset-warning {
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
}

.reset-warning svg {
  margin-bottom: 12px;
}

.reset-warning h3 {
  color: #f59e0b;
  font-size: 16px;
  margin: 0 0 8px 0;
}

.reset-warning p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin: 0;
}

.reset-warning strong {
  color: #fff;
}

:deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(255, 255, 255, 0.03);
  --el-table-row-hover-bg-color: rgba(102, 126, 234, 0.05);
  --el-table-border-color: rgba(255, 255, 255, 0.06);
  --el-table-text-color: rgba(255, 255, 255, 0.85);
  --el-table-header-text-color: #fff;
  background: transparent !important;
}

:deep(.el-dialog) {
  background: rgba(25, 25, 55, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 16px;
}

:deep(.el-dialog__title) {
  color: #fff;
  font-weight: 600;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  box-shadow: none;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  color: #fff;
}

:deep(.el-input__inner::placeholder),
:deep(.el-textarea__inner::placeholder) {
  color: rgba(255, 255, 255, 0.35);
}

@media (max-width: 1200px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .page-header .header-right {
    flex-wrap: wrap;
  }
}
</style>
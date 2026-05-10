<template>
  <div v-if="isLoginPage" class="app-root">
    <router-view />
  </div>
  <div v-else class="app-container">
    <header class="header">
      <div class="logo-container">
        <img src="./assets/logo.png" alt="Logo" class="logo" />
        <h1>拾光引擎AI-超级IP智能体</h1>
      </div>
      <nav class="main-nav">
        <router-link
          v-for="menu in menuItems"
          :key="menu.route"
          :to="menu.route"
          custom
          v-slot="{ navigate, isActive }"
        >
          <button
            @click="navigate"
            :class="['nav-item', { active: isMenuActive(menu, isActive) }]"
          >
            <span class="nav-icon">{{ menu.icon }}</span>
            {{ menu.label }}
          </button>
        </router-link>
      </nav>
      <div class="header-right">
        <div class="user-avatar-wrapper" @click.stop="toggleUserMenu" v-click-outside="closeUserMenu">
          <img :src="getUserAvatar()" alt="用户头像" class="avatar-img" @error="handleAvatarError" />
          <div v-if="showUserMenu" class="user-dropdown">
            <div class="user-dropdown-item" @click="goToSettings">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <span>个人设置</span>
            </div>
            <div class="user-dropdown-divider"></div>
            <div class="user-dropdown-item logout-item" @click="handleLogout">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
              <span>退出登录</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="main-content-wrapper">
      <router-view />
    </div>

    <TaskProgressDialog
      v-model:visible="showTaskDialog"
      :task-type="currentTaskInfo.taskType"
      :task-name="currentTaskInfo.taskName"
      :status="currentTaskInfo.status"
      :error-message="currentTaskInfo.errorMessage"
      :success-message="currentTaskInfo.successMessage"
      :is-cancelling="currentTaskInfo.isCancelling"
      @confirm="handleTaskConfirm"
      @cancel="handleTaskCancel"
      @close="handleTaskClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import TaskProgressDialog from './components/TaskProgressDialog.vue'
import { useTaskManager } from './composables/useTaskManager'
import { resolveMediaUrl } from './utils/api.js'

const router = useRouter()
const route = useRoute()

const isLoginPage = computed(() => route.path === '/login')
const showUserMenu = ref(false)

const taskManager = useTaskManager()
const showTaskDialog = ref(false)
const currentTaskInfo = ref({
  taskType: '', taskName: '', status: 'pending',
  errorMessage: '', successMessage: '', isCancelling: false
})

taskManager.subscribe((newState) => {
  showTaskDialog.value = newState.isActive
  currentTaskInfo.value = { ...newState }
})

const menuItems = [
  { route: '/', label: '首页', icon: '🏠' },
  { route: '/library/promptLibrary', label: '提示词', icon: '💡' },
  { route: '/library/voiceLibrary', label: '音色库', icon: '🎵' },
  { route: '/library/portraitLibrary', label: '肖像库', icon: '👤' },
  { route: '/library/copyLibrary', label: '文案库', icon: '📝' },
  { route: '/library/dubbingLibrary', label: '配音库', icon: '🎙️' },
  { route: '/library/workLibrary', label: '视频库', icon: '🎬' },
  { route: '/library/musicLibrary', label: '音乐库', icon: '🎶' },
  { route: '/settings', label: '系统设置', icon: '⚙️' }
]

const isMenuActive = (menu, isActive) => {
  if (menu.route === '/') return route.path === '/'
  if (menu.route.startsWith('/library/')) return route.path.startsWith('/library/')
  return isActive
}

const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (event) => {
      if (!(el === event.target || el.contains(event.target))) binding.value()
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) { document.removeEventListener('click', el._clickOutside) }
}

const getCurrentUser = () => {
  const userInfo = localStorage.getItem('userInfo')
  if (userInfo) { try { return JSON.parse(userInfo) } catch (e) {} }
  return null
}

const getUserAvatar = () => {
  const user = getCurrentUser()
  if (user && user.avatar) return resolveMediaUrl(user.avatar)
  return 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'
}

const handleAvatarError = (e) => { e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user' }
const toggleUserMenu = () => { showUserMenu.value = !showUserMenu.value }
const closeUserMenu = () => { showUserMenu.value = false }
const goToSettings = () => { showUserMenu.value = false; router.push('/settings') }

const handleLogout = () => {
  showUserMenu.value = false
  localStorage.removeItem('userInfo')
  localStorage.removeItem('token')
  ElMessage.success('已退出登录')
  router.push('/login')
}

const handleTaskConfirm = () => { taskManager.confirmTask() }
const handleTaskCancel = async () => { await taskManager.cancelTask() }
const handleTaskClose = () => {
  if (currentTaskInfo.value.status === 'timeout') {
    taskManager.dismissTimeoutTask()
  } else {
    taskManager.clearState()
  }
}

onMounted(() => {
  if (taskManager.restoreTask()) {
    const currentTask = taskManager.getTaskInfo()
    showTaskDialog.value = currentTask.isActive
    currentTaskInfo.value = { ...currentTask }
  }
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --success-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --bg-dark: #0f0f23;
  --bg-card: rgba(30, 30, 60, 0.7);
  --bg-card-hover: rgba(40, 40, 80, 0.8);
  --border-color: rgba(102, 126, 234, 0.3);
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.5);
}
.app-root { width: 100vw; height: 100vh; overflow: hidden; }
.app-container { min-height: 100vh; display: flex; flex-direction: column; background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%); background-attachment: fixed; position: relative; overflow: visible; }
.app-container::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at 20% 20%, rgba(102,126,234,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(118,75,162,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(79,172,254,0.05) 0%, transparent 70%); pointer-events: none; }
.header { padding: 16px 30px; display: flex; justify-content: flex-start; align-items: center; background: rgba(20,20,40,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(102,126,234,0.2); position: relative; z-index: 3000; box-shadow: 0 4px 30px rgba(0,0,0,0.3); }
.logo-container { display: flex; align-items: center; gap: 14px; }
.logo { width: 52px; height: 52px; border-radius: 12px; box-shadow: 0 0 35px rgba(102,126,234,0.4); }
.header h1 { background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 28px; font-weight: 700; letter-spacing: 1px; }
.main-nav { display: flex; align-items: center; gap: 6px; padding: 0 20px 0 50px; margin-left: 50px; border-left: 1px solid rgba(255,255,255,0.1); }
.nav-item { display: flex; align-items: center; gap: 6px; padding: 10px 18px; background: transparent; border: 1px solid transparent; border-radius: 8px; color: var(--text-secondary); font-size: 14px; cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden; text-decoration: none; }
.nav-item:hover { background: rgba(102,126,234,0.15); color: var(--text-primary); border-color: rgba(102,126,234,0.3); transform: translateY(-1px); }
.nav-item.active { background: var(--primary-gradient); color: var(--text-primary); border-color: transparent; box-shadow: 0 4px 20px rgba(102,126,234,0.4); transform: translateY(-1px); }
.nav-icon { font-size: 16px; }
.header-right { display: flex; align-items: center; gap: 20px; margin-left: auto; }
.avatar-img { width: 40px; height: 40px; border-radius: 50%; cursor: pointer; border: 2px solid rgba(102,126,234,0.5); transition: all 0.3s ease; box-shadow: 0 0 15px rgba(102,126,234,0.3); }
.avatar-img:hover { border-color: #fff; transform: scale(1.1); box-shadow: 0 0 25px rgba(102,126,234,0.6); }
.user-avatar-wrapper { position: relative; padding-left: 16px; border-left: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
.user-dropdown { position: absolute; top: calc(100% + 10px); right: 0; min-width: 160px; background: rgba(30,30,60,0.95); backdrop-filter: blur(15px); border: 1px solid rgba(102,126,234,0.3); border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 9999; animation: dropdownFadeIn 0.2s ease; }
@keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.user-dropdown-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; color: rgba(255,255,255,0.8); font-size: 14px; transition: all 0.2s ease; }
.user-dropdown-item:hover { background: rgba(102,126,234,0.15); color: #fff; }
.user-dropdown-item svg { flex-shrink: 0; }
.user-dropdown-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 4px 0; }
.logout-item:hover { background: rgba(245,87,108,0.15); color: #f56c6c; }
.main-content-wrapper { flex: 1; overflow: auto; position: relative; z-index: 1; display: flex; flex-direction: column; padding: 20px; min-height: 0; }
.main-content-wrapper::-webkit-scrollbar { width: 10px; height: 10px; }
.main-content-wrapper::-webkit-scrollbar-track { background: rgba(102,126,234,0.1); border-radius: 4px; }
.main-content-wrapper::-webkit-scrollbar-thumb { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; }
.el-button--primary { background: var(--primary-gradient) !important; border: none !important; color: #fff !important; box-shadow: 0 4px 15px rgba(102,126,234,0.4); }
.el-button--primary:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(102,126,234,0.5); }
.el-button--text { color: #667eea !important; background: transparent !important; border: none !important; }
.el-button--text:hover { color: #764ba2 !important; background: rgba(102,126,234,0.1) !important; }
.el-tag { background: rgba(102,126,234,0.2) !important; border: 1px solid rgba(102,126,234,0.4) !important; color: #fff !important; }
.el-button { font-weight: 500; border-radius: 8px; }
.el-table { --el-table-border-color: rgba(255,255,255,0.1); --el-table-header-bg-color: rgba(102,126,234,0.15); --el-table-row-hover-bg-color: rgba(102,126,234,0.1); --el-table-bg-color: rgba(255,255,255,0.05); --el-table-tr-bg-color: rgba(255,255,255,0.05); --el-table-text-color: rgba(255,255,255,0.8); --el-table-header-text-color: #fff; }
.el-table .el-table__cell { border-right: 1px solid rgba(255,255,255,0.1) !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
.el-table .el-table__header-cell { background: rgba(102,126,234,0.15) !important; color: #fff !important; }
.el-table .el-table__body-row { background: rgba(255,255,255,0.05) !important; }
.el-table .el-table__body-row:hover > td { background: rgba(102,126,234,0.1) !important; }
</style>

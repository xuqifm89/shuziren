<template>
  <div v-if="isLoginPage" class="login-root">
    <router-view />
  </div>
  <div v-else class="admin-dashboard">
    <header class="top-bar">
      <div class="top-bar-left">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" class="shield-icon">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        <span class="brand">管理后台</span>
      </div>

      <nav class="tab-nav">
        <router-link
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          custom
          v-slot="{ navigate, isActive }"
        >
          <button :class="['tab-btn', { active: isActive }]" @click="navigate">
            <span v-html="tab.icon"></span>
            {{ tab.label }}
          </button>
        </router-link>
      </nav>

      <div class="top-bar-right">
        <a href="/" target="_blank" class="front-link">前台</a>
        <button @click="handleLogout" class="logout-btn">退出</button>
      </div>
    </header>

    <main class="admin-body">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const isLoginPage = computed(() => route.path === '/login')

const tabs = [
  { to: '/', label: '概览', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>' },
  { to: '/users', label: '用户管理', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>' },
  { to: '/library/voiceLibrary', label: '音色库', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>' },
  { to: '/library/portraitLibrary', label: '肖像库', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' },
  { to: '/library/copyLibrary', label: '文案库', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' },
  { to: '/library/workLibrary', label: '作品库', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>' },
  { to: '/config', label: 'API 配置', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>' },
  { to: '/logs', label: 'API 日志', icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' }
]

const handleLogout = () => {
  if (confirm('确定要退出管理后台吗？')) {
    sessionStorage.removeItem('adminToken')
    sessionStorage.removeItem('admin_auth_time')
    sessionStorage.removeItem('adminUserInfo')
    ElMessage.info('已退出管理后台')
    router.push('/login')
  }
}

onMounted(() => {
  const token = sessionStorage.getItem('adminToken')
  const authTime = sessionStorage.getItem('admin_auth_time')
  if (token && authTime) {
    const hoursSinceLogin = (Date.now() - parseInt(authTime)) / (1000 * 60 * 60)
    if (hoursSinceLogin >= 8) {
      sessionStorage.removeItem('adminToken')
      sessionStorage.removeItem('admin_auth_time')
      sessionStorage.removeItem('adminUserInfo')
      router.push('/login')
    }
  }
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --bg-dark: #0f0f23;
  --bg-card: rgba(30, 30, 60, 0.7);
  --border-color: rgba(102, 126, 234, 0.3);
}
.login-root { width: 100vw; height: 100vh; overflow: hidden; }
.admin-dashboard { height: 100vh; display: flex; flex-direction: column; background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%); overflow: hidden; }
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 28px; height: 56px; background: rgba(20,20,45,0.85); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(102,126,234,0.15); flex-shrink: 0; position: relative; z-index: 100; }
.top-bar-left { display: flex; align-items: center; gap: 10px; }
.shield-icon { color: #667eea; }
.brand { font-size: 16px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
.tab-nav { display: flex; gap: 4px; background: rgba(0,0,0,0.25); border-radius: 10px; padding: 3px; flex-wrap: wrap; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; border-radius: 8px; background: transparent; color: rgba(255,255,255,0.55); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
.tab-btn:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.06); }
.tab-btn.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; box-shadow: 0 2px 10px rgba(102,126,234,0.35); }
.top-bar-right { display: flex; align-items: center; gap: 12px; }
.front-link { color: rgba(255,255,255,0.55); text-decoration: none; font-size: 13px; font-weight: 500; padding: 6px 14px; border-radius: 6px; transition: all 0.2s ease; }
.front-link:hover { color: #667eea; background: rgba(102,126,234,0.1); }
.logout-btn { color: rgba(245,108,108,0.8); background: rgba(245,108,108,0.1); border: 1px solid rgba(245,108,108,0.2); border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
.logout-btn:hover { color: #ff6b6b; background: rgba(245,108,108,0.2); }
.admin-body { flex: 1; overflow: auto; padding: 0; min-height: 0; }
.el-button--primary { background: var(--primary-gradient) !important; border: none !important; color: #fff !important; }
.el-table { --el-table-border-color: rgba(255,255,255,0.1); --el-table-header-bg-color: rgba(102,126,234,0.15); --el-table-row-hover-bg-color: rgba(102,126,234,0.1); --el-table-bg-color: rgba(255,255,255,0.05); --el-table-tr-bg-color: rgba(255,255,255,0.05); --el-table-text-color: rgba(255,255,255,0.8); --el-table-header-text-color: #fff; }
.el-table .el-table__header-cell { background: rgba(102,126,234,0.15) !important; color: #fff !important; }
.el-table .el-table__body-row { background: rgba(255,255,255,0.05) !important; }
.el-table .el-table__body-row:hover > td { background: rgba(102,126,234,0.1) !important; }
</style>

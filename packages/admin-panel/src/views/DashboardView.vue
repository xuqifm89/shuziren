<template>
  <div class="dashboard-view">
    <h2 class="page-title">系统概览</h2>
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-icon" :style="{ background: stat.gradient }">{{ stat.icon }}</div>
        <div class="stat-info">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>
    <div class="quick-links">
      <h3>快捷管理</h3>
      <div class="link-grid">
        <router-link v-for="link in quickLinks" :key="link.to" :to="link.to" class="link-card">
          <span class="link-icon">{{ link.icon }}</span>
          <span class="link-label">{{ link.label }}</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../utils/api.js'

const stats = ref([
  { icon: '👥', label: '总用户', value: '-', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  { icon: '🎵', label: '音色', value: '-', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
  { icon: '👤', label: '肖像', value: '-', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
  { icon: '📝', label: '文案', value: '-', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
  { icon: '🎙️', label: '配音', value: '-', gradient: 'linear-gradient(135deg, #fa709a, #fee140)' },
  { icon: '🎬', label: '作品', value: '-', gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
  { icon: '💡', label: '提示词', value: '-', gradient: 'linear-gradient(135deg, #fccb90, #d57eeb)' },
  { icon: '🎶', label: '音乐', value: '-', gradient: 'linear-gradient(135deg, #84fab0, #8fd3f4)' }
])

const quickLinks = [
  { to: '/users', icon: '👥', label: '用户管理' },
  { to: '/library/voiceLibrary', icon: '🎵', label: '音色库' },
  { to: '/library/portraitLibrary', icon: '👤', label: '肖像库' },
  { to: '/library/copyLibrary', icon: '📝', label: '文案库' },
  { to: '/library/dubbingLibrary', icon: '🎙️', label: '配音库' },
  { to: '/library/workLibrary', icon: '🎬', label: '作品库' },
  { to: '/library/promptLibrary', icon: '💡', label: '提示词库' },
  { to: '/library/musicLibrary', icon: '🎶', label: '音乐库' },
  { to: '/config', icon: '⚙️', label: 'API 配置' },
  { to: '/logs', icon: '📋', label: 'API 日志' }
]

onMounted(async () => {
  try {
    const endpoints = [
      { index: 0, path: '/users' },
      { index: 1, path: '/voice-library' },
      { index: 2, path: '/portrait-library' },
      { index: 3, path: '/copy-library' },
      { index: 4, path: '/dubbing-library' },
      { index: 5, path: '/work-library' },
      { index: 6, path: '/prompt-library' },
      { index: 7, path: '/music-library' }
    ]
    const results = await Promise.allSettled(
      endpoints.map(e => api.get(e.path).catch(() => []))
    )
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const data = result.value
        stats.value[i].value = Array.isArray(data) ? data.length : (data?.data?.length || 0)
      }
    })
  } catch (err) {
    console.error('Dashboard stats error:', err)
  }
})
</script>

<style scoped>
.dashboard-view { padding: 24px; color: #fff; }
.page-title { font-size: 22px; font-weight: 700; margin: 0 0 24px 0; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(133px, 1fr)); gap: 16px; margin-bottom: 32px; }
.stat-card { background: rgba(30,30,60,0.7); backdrop-filter: blur(15px); border: 1px solid rgba(102,126,234,0.2); border-radius: 14px; padding: 20px; display: flex; align-items: center; gap: 16px; transition: all 0.3s ease; }
.stat-card:hover { transform: translateY(-3px); border-color: rgba(102,126,234,0.5); box-shadow: 0 8px 30px rgba(102,126,234,0.15); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 24px; font-weight: 700; color: #fff; }
.stat-label { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 2px; }
.quick-links h3 { font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.8); margin: 0 0 16px 0; }
.link-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.link-card { background: rgba(30,30,60,0.5); border: 1px solid rgba(102,126,234,0.15); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; color: rgba(255,255,255,0.7); transition: all 0.3s ease; }
.link-card:hover { background: rgba(102,126,234,0.15); border-color: rgba(102,126,234,0.4); color: #fff; transform: translateY(-2px); }
.link-icon { font-size: 28px; }
.link-label { font-size: 13px; font-weight: 500; }
</style>

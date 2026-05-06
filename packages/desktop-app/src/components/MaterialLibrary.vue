<template>
  <div class="material-library">
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="back-icon">←</span>
      </button>
      <h2 class="page-title">素材库</h2>
      <div class="placeholder"></div>
    </div>

    <div class="libraries-grid">
      <div 
        v-for="library in libraries" 
        :key="library.key"
        class="library-card"
        @click="openLibrary(library)"
      >
        <div class="library-icon" :style="{ background: library.color }">
          <span class="icon-emoji">{{ library.icon }}</span>
        </div>
        <span class="library-name">{{ library.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['back', 'open-library'])

const libraries = ref([
  { key: 'promptLibrary', table: 'promptLibrary', name: '提示词库', icon: '💡', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { key: 'voiceLibrary', table: 'voiceLibrary', name: '音色库', icon: '🎵', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { key: 'portraitLibrary', table: 'portraitLibrary', name: '肖像库', icon: '👤', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { key: 'workLibrary', table: 'workLibrary', name: '作品库', icon: '📚', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { key: 'musicLibrary', table: 'musicLibrary', name: '音乐库', icon: '🎶', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { key: 'copyLibrary', table: 'copyLibrary', name: '文案库', icon: '📝', color: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { key: 'dubbingLibrary', table: 'dubbingLibrary', name: '配音库', icon: '🎤', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }
])

const goBack = () => {
  emit('back')
}

const openLibrary = (library) => {
  emit('open-library', library)
}
</script>

<style scoped>
.material-library {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%);
  padding: 0;
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(20, 20, 40, 0.95);
  border-bottom: 1px solid rgba(102, 126, 234, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.back-icon {
  display: inline-block;
  transform: scale(1.2);
}

.page-title {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

.placeholder {
  width: 50px;
}

.libraries-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.library-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.library-card:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.4);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
}

.library-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.icon-emoji {
  font-size: 32px;
}

.library-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  font-weight: 500;
  text-align: center;
}
</style>

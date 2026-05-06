<template>
  <div class="view-wrapper">
    <div class="column-header">
      <h2>视频发布</h2>
      <div class="video-select-row">
        <button class="video-source-btn" @click="triggerLocalUpload">📁 本地上传</button>
        <button class="video-source-btn" @click="toggleVideoLibrary">📚 视频库</button>
      </div>
    </div>
    <input
      type="file"
      ref="videoUploadInput"
      accept="video/*"
      style="display: none"
      @change="handleLocalVideoUpload"
    />
    <div v-if="showVideoLibraryDropdown" class="video-library-dropdown">
      <div class="dropdown-header">
        <span>选择视频</span>
        <button class="close-dropdown-btn" @click="showVideoLibraryDropdown = false">✕</button>
      </div>
      <div class="dropdown-list">
        <div
          v-for="video in videoLibraryList"
          :key="video.id"
          class="dropdown-item"
          @click="selectVideoFromLibrary(video)"
        >
          <span>{{ video.title }}</span>
        </div>
        <div v-if="videoLibraryList.length === 0" class="empty-state">暂无视频</div>
      </div>
    </div>
    <VideoPublish :video-path="publishVideo" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import VideoPublish from '../components/VideoPublish.vue'
import { get as apiGet, getAuthHeaders } from '../utils/api.js'

const publishVideo = ref('')
const videoLibraryList = ref([])
const showVideoLibraryDropdown = ref(false)
const videoUploadInput = ref(null)

const getCurrentUser = () => {
  const userInfo = localStorage.getItem('userInfo')
  if (userInfo) {
    try { return JSON.parse(userInfo) } catch (e) {}
  }
  return null
}

const fetchVideoLibrary = async () => {
  try {
    const user = getCurrentUser()
    const data = await apiGet('/api/work-library', user?.id ? { userId: user.id } : {})
    if (Array.isArray(data)) videoLibraryList.value = data
    else if (data && Array.isArray(data.data)) videoLibraryList.value = data.data
    else videoLibraryList.value = []
  } catch (err) { videoLibraryList.value = [] }
}

const uploadVideoToServer = async (file) => {
  try {
    const formData = new FormData()
    formData.append('video', file)
    const response = await fetch('/api/clips/upload-video', { method: 'POST', headers: getAuthHeaders(), body: formData })
    const data = await response.json()
    if (data.success && data.videoUrl) return data.videoUrl
  } catch (err) { console.error('视频上传失败:', err) }
  return null
}

const triggerLocalUpload = () => { videoUploadInput.value?.click() }

const handleLocalVideoUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const localUrl = URL.createObjectURL(file)
  publishVideo.value = localUrl
  event.target.value = ''
  const serverUrl = await uploadVideoToServer(file)
  if (serverUrl) publishVideo.value = serverUrl
}

const toggleVideoLibrary = () => { showVideoLibraryDropdown.value = !showVideoLibraryDropdown.value }

const selectVideoFromLibrary = (video) => {
  if (video && video.videoPath) publishVideo.value = `${video.videoPath}`
  showVideoLibraryDropdown.value = false
}

onMounted(() => { fetchVideoLibrary() })
</script>

<style scoped>
.view-wrapper {
  background: var(--bg-card);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  padding: 0;
}

.column-header {
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.column-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary-gradient);
}

.column-header h2 {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.video-select-row { display: flex; align-items: center; gap: 10px; }

.video-source-btn {
  background: var(--primary-gradient);
  border: none;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.video-source-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.video-library-dropdown {
  position: relative;
  margin: 10px 20px;
  background: rgba(30, 30, 60, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 100;
}

.dropdown-header {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.dropdown-header span { font-weight: 500; color: #fff; }

.close-dropdown-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.close-dropdown-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.1); }

.dropdown-list { max-height: 200px; overflow-y: auto; }

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  color: rgba(255, 255, 255, 0.8);
}

.dropdown-item:hover { background: rgba(102, 126, 234, 0.2); color: #fff; }

.empty-state { padding: 20px; text-align: center; color: rgba(255, 255, 255, 0.5); }
</style>

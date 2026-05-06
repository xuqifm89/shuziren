<template>
  <main class="main-content">
    <div class="column">
      <div class="column-header">
        <h2>文案生成</h2>
      </div>
      <AudioToText @text-generated="handleTextGenerated" />
    </div>

    <div class="column speech-column">
      <div class="speech-generator">
        <div class="column-header">
          <h2>配音生成</h2>
        </div>
        <TextToSpeech
          :input-text="generatedText"
          @audio-generated="handleAudioGenerated"
        />
      </div>
      <div class="video-generator">
        <div class="column-header">
          <h2>视频生成</h2>
          <el-switch
            v-model="useVideoDriver"
            active-text="视频驱动"
            inactive-text="图片驱动"
            @change="toggleDriver"
          />
        </div>
        <AvatarVideo :audio-path="generatedAudio" :use-video-driver="useVideoDriver" @video-generated="handleVideoGenerated" @audio-generated="handleAudioGenerated" />
      </div>
    </div>

    <div class="column">
      <div class="column-header">
        <h2>视频剪辑</h2>
        <div class="video-select-row">
          <button class="video-source-btn" @click="triggerClipLocalUpload">
            📁 本地上传
          </button>
          <button class="video-source-btn" @click="toggleClipVideoLibrary">
            📚 视频库
          </button>
        </div>
      </div>
      <input
        type="file"
        ref="clipVideoUploadInput"
        accept="video/*"
        style="display: none"
        @change="handleClipLocalVideoUpload"
      />
      <div v-if="showClipVideoLibraryDropdown" class="video-library-dropdown">
        <div class="dropdown-header">
          <span>选择视频</span>
          <button class="close-dropdown-btn" @click="showClipVideoLibraryDropdown = false">✕</button>
        </div>
        <div class="dropdown-list">
          <div
            v-for="video in videoLibraryList"
            :key="video.id"
            class="dropdown-item"
            @click="selectClipVideoFromLibrary(video)"
          >
            <span>{{ video.title }}</span>
          </div>
          <div v-if="videoLibraryList.length === 0" class="empty-state">
            暂无视频
          </div>
        </div>
      </div>
      <VideoClip :video-path="clipVideo" />
    </div>

    <div class="column">
      <div class="column-header">
        <h2>视频发布</h2>
        <div class="video-select-row">
          <button class="video-source-btn" @click="triggerPublishLocalUpload">
            📁 本地上传
          </button>
          <button class="video-source-btn" @click="togglePublishVideoLibrary">
            📚 视频库
          </button>
        </div>
      </div>
      <input
        type="file"
        ref="publishVideoUploadInput"
        accept="video/*"
        style="display: none"
        @change="handlePublishLocalVideoUpload"
      />
      <div v-if="showPublishVideoLibraryDropdown" class="video-library-dropdown">
        <div class="dropdown-header">
          <span>选择视频</span>
          <button class="close-dropdown-btn" @click="showPublishVideoLibraryDropdown = false">✕</button>
        </div>
        <div class="dropdown-list">
          <div
            v-for="video in videoLibraryList"
            :key="video.id"
            class="dropdown-item"
            @click="selectPublishVideoFromLibrary(video)"
          >
            <span>{{ video.title }}</span>
          </div>
          <div v-if="videoLibraryList.length === 0" class="empty-state">
            暂无视频
          </div>
        </div>
      </div>
      <VideoPublish :video-path="publishVideo" />
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AudioToText from '../components/AudioToText.vue'
import TextToSpeech from '../components/TextToSpeech.vue'
import AvatarVideo from '../components/AvatarVideo.vue'
import VideoClip from '../components/VideoClip.vue'
import VideoPublish from '../components/VideoPublish.vue'
import { get as apiGet, getAuthHeaders } from '../utils/api.js'

const generatedText = ref('')
const generatedAudio = ref('')
const clipVideo = ref('')
const publishVideo = ref('')
const useVideoDriver = ref(false)
const videoLibraryList = ref([])
const showClipVideoLibraryDropdown = ref(false)
const showPublishVideoLibraryDropdown = ref(false)
const clipVideoUploadInput = ref(null)
const publishVideoUploadInput = ref(null)

const toggleDriver = () => {}

const handleTextGenerated = (text) => {
  generatedText.value = text
}

const handleAudioGenerated = (audioPath) => {
  generatedAudio.value = audioPath
}

const handleVideoGenerated = (videoPath) => {
  clipVideo.value = videoPath
  publishVideo.value = videoPath
}

const getCurrentUser = () => {
  const userInfo = localStorage.getItem('userInfo')
  if (userInfo) {
    try {
      return JSON.parse(userInfo)
    } catch (e) {}
  }
  return null
}

const fetchVideoLibrary = async () => {
  try {
    const user = getCurrentUser()
    const data = await apiGet('/api/work-library', user?.id ? { userId: user.id } : {})
    if (Array.isArray(data)) {
      videoLibraryList.value = data
    } else if (data && Array.isArray(data.data)) {
      videoLibraryList.value = data.data
    } else {
      videoLibraryList.value = []
    }
  } catch (err) {
    videoLibraryList.value = []
  }
}

const uploadVideoToServer = async (file) => {
  try {
    const formData = new FormData()
    formData.append('video', file)
    const response = await fetch('/api/clips/upload-video', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })
    const data = await response.json()
    if (data.success && data.videoUrl) {
      return data.videoUrl
    }
  } catch (err) {
    console.error('视频上传失败:', err)
  }
  return null
}

const triggerClipLocalUpload = () => {
  if (clipVideoUploadInput.value) {
    clipVideoUploadInput.value.click()
  }
}

const handleClipLocalVideoUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const localUrl = URL.createObjectURL(file)
  clipVideo.value = localUrl
  event.target.value = ''
  const serverUrl = await uploadVideoToServer(file)
  if (serverUrl) {
    clipVideo.value = serverUrl
  }
}

const toggleClipVideoLibrary = () => {
  showClipVideoLibraryDropdown.value = !showClipVideoLibraryDropdown.value
}

const selectClipVideoFromLibrary = (video) => {
  if (video && video.videoPath) {
    clipVideo.value = `${video.videoPath}`
  }
  showClipVideoLibraryDropdown.value = false
}

const triggerPublishLocalUpload = () => {
  if (publishVideoUploadInput.value) {
    publishVideoUploadInput.value.click()
  }
}

const handlePublishLocalVideoUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const localUrl = URL.createObjectURL(file)
  publishVideo.value = localUrl
  event.target.value = ''
  const serverUrl = await uploadVideoToServer(file)
  if (serverUrl) {
    publishVideo.value = serverUrl
  }
}

const togglePublishVideoLibrary = () => {
  showPublishVideoLibraryDropdown.value = !showPublishVideoLibraryDropdown.value
}

const selectPublishVideoFromLibrary = (video) => {
  if (video && video.videoPath) {
    publishVideo.value = `${video.videoPath}`
  }
  showPublishVideoLibraryDropdown.value = false
}

onMounted(() => {
  fetchVideoLibrary()
})
</script>

<style scoped>
.main-content {
  display: flex;
  flex-wrap: nowrap;
  gap: 20px;
  padding: 20px;
  min-width: max-content;
  position: relative;
  overflow-x: auto;
  overflow-y: visible;
}

.column {
  background: var(--bg-card);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
  width: 420px;
  flex-shrink: 0;
}

.column:hover {
  border-color: rgba(102, 126, 234, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 40px rgba(102, 126, 234, 0.15);
}

.speech-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: transparent;
  border: none;
  padding: 0;
}

.speech-column > div:first-child:not(.video-generator) {
  flex-shrink: 0;
}

.speech-generator {
  background: var(--bg-card);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
}

.video-generator {
  background: var(--bg-card);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
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

.video-select-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

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

.dropdown-header span {
  font-weight: 500;
  color: #fff;
}

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

.close-dropdown-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.dropdown-list {
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  color: rgba(255, 255, 255, 0.8);
}

.dropdown-item:hover {
  background: rgba(102, 126, 234, 0.2);
  color: #fff;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
}

.dropdown-list::-webkit-scrollbar {
  width: 6px;
}

.dropdown-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.dropdown-list::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.3);
  border-radius: 3px;
}

.dropdown-list::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.5);
}
</style>

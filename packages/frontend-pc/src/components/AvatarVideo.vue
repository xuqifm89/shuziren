<template>
  <div class="avatar-video">
    <template v-if="!props.useVideoDriver">
      <div class="image-to-video-section">
        <div class="file-select-row">
          <span class="section-title">选择图片</span>
          <el-select
            v-model="selectedImageId"
            class="file-select"
            placeholder="请选择图片"
            @change="handleImageChange"
            popper-class="avatar-select-popper"
          >
            <el-option
              v-for="image in imageList"
              :key="image.id"
              :label="image.fileName"
              :value="image.id"
            >
              <div class="avatar-option">
                <div class="avatar-preview-thumb">
                  <img :src="`${image.fileUrl}`" alt="" />
                </div>
                <span class="avatar-option-name">{{ image.fileName }}</span>
              </div>
            </el-option>
          </el-select>
          <el-button
            @click="previewImage"
            :disabled="!selectedImage"
            type="outline"
          >
            ▶
          </el-button>
        </div>

        <div class="file-select-row">
          <span class="section-title">选择音频</span>
          <el-select
            v-model="selectedAudioId"
            class="file-select"
            placeholder="请选择音频"
            @change="handleAudioChange"
          >
            <el-option
              v-for="audio in audioList"
              :key="audio.id"
              :label="audio.fileName"
              :value="audio.id"
            />
          </el-select>
          <el-button
            @click="previewAudio"
            :disabled="!selectedAudio"
            type="outline"
            :class="{ 'playing': isPlayingAudio }"
          >
            {{ isPlayingAudio ? '⏸' : '▶' }}
          </el-button>
        </div>

        <div class="generate-section">
          <input 
            type="file" 
            ref="imageUploadInput" 
            style="display: none" 
            accept="image/*" 
            @change="handleImageFileSelect"
          />
          <input 
            type="file" 
            ref="dubbingUploadInput" 
            style="display: none" 
            accept="audio/*" 
            @change="handleDubbingFileSelect"
          />
          <el-button @click="triggerImageUpload" type="outline" :loading="isUploadingImage">
            上传图片
          </el-button>
          <el-button @click="triggerDubbingUpload" type="outline" :loading="isUploadingDubbing">
            上传配音
          </el-button>
          <el-button
            @click="generateImageToVideo"
            :loading="isGeneratingVideo"
            :disabled="!selectedImage || !selectedAudio"
            type="primary"
          >
            生成视频
          </el-button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="avatar-section">
        <div class="avatar-select-row">
          <span class="section-title">{{ props.useVideoDriver ? '选择肖像视频' : '选择肖像图片' }}</span>
          <el-select
            v-model="selectedAvatarId"
            class="avatar-select"
            :placeholder="props.useVideoDriver ? '请选择肖像视频' : '请选择肖像图片'"
            @change="handleAvatarChange"
            popper-class="avatar-select-popper"
          >
            <el-option
              v-for="avatar in libraryAvatars"
              :key="avatar.id"
              :label="avatar.fileName"
              :value="avatar.id"
            >
              <div class="avatar-option">
                <div class="avatar-preview-thumb">
                  <img v-if="avatar.type === 'image'" :src="`${avatar.fileUrl}`" alt="" />
                  <video v-else :src="`${avatar.fileUrl}`" muted></video>
                </div>
                <span class="avatar-option-name">{{ avatar.fileName }}</span>
              </div>
            </el-option>
          </el-select>
          <el-button
            @click="previewAvatar"
            :disabled="!selectedAvatar"
            type="outline"
          >
            ▶
          </el-button>
        </div>

        <div class="sound-select-row">
          <span class="section-title">选择声音文件</span>
          <el-select
            v-model="selectedSoundId"
            class="sound-select"
            placeholder="请选择声音文件"
            @change="handleSoundChange"
          >
            <el-option
              v-for="sound in soundFiles"
              :key="sound.id"
              :label="sound.fileName || sound.name"
              :value="sound.id"
            />
          </el-select>
          <el-button
            @click="previewSound"
            :disabled="!selectedSound"
            type="outline"
            :class="{ 'playing': isPlayingSound }"
          >
            {{ isPlayingSound ? '⏸' : '▶' }}
          </el-button>
        </div>
      </div>

      <div class="generate-section">
        <input 
          type="file" 
          ref="avatarUploadInput" 
          style="display: none" 
          accept="image/*,video/*" 
          @change="handleAvatarFileSelect"
        />
        <input 
          type="file" 
          ref="dubbingUploadInput" 
          style="display: none" 
          accept="audio/*" 
          @change="handleDubbingFileSelect"
        />
        <el-button @click="triggerAvatarUpload" type="outline" :loading="isUploadingAvatar">
          上传肖像素材
        </el-button>
        <el-button @click="triggerDubbingUpload" type="outline" :loading="isUploadingDubbing">
          上传配音
        </el-button>
        <el-button
          @click="generateVideo"
          :loading="isGenerating"
          :disabled="(!generatedDubbingUrl && !props.audioPath && !selectedSound) || !selectedAvatar"
          type="primary"
        >
          生成视频
        </el-button>
      </div>

      <div v-if="generatedDubbingUrl" class="dubbing-preview">
        <audio :src="generatedDubbingUrl" controls class="audio-player"></audio>
      </div>
    </template>

    <div class="video-preview">
      <div class="video-wrapper">
        <video :src="videoPath" controls class="video-player"></video>
      </div>
      <div v-if="videoPath" class="video-actions">
        <el-button type="text" @click="regenerateVideo">重新生成</el-button>
        <el-button type="success" @click="confirmVideo">使用此视频</el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="true"
      @close="error = ''"
      show-icon
    />

    <!-- 预览弹窗 -->
    <div v-if="showPreviewModal" class="preview-modal-overlay" @click="closePreviewModal">
      <div class="preview-modal-content" @click.stop>
        <button class="preview-modal-close" @click="closePreviewModal">&times;</button>
        <template v-if="previewFileType === 'video'">
          <video :src="previewFileUrl" controls class="preview-media" @click.stop></video>
        </template>
        <template v-else>
          <img :src="previewFileUrl" alt="预览图片" class="preview-media" @click="closePreviewModal" />
        </template>
        <div class="preview-modal-hint">点击空白区域关闭</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useTaskManager } from '../composables/useTaskManager'
import { getAuthHeaders } from '../utils/api.js'

console.log('🔄 AvatarVideo 组件初始化 - 开始')

const props = defineProps({
  audioPath: {
    type: String,
    default: ''
  },
  useVideoDriver: {
    type: Boolean,
    default: false
  }
})

console.log('🔄 AvatarVideo props:', {
  audioPath: props.audioPath,
  useVideoDriver: props.useVideoDriver
})

const emit = defineEmits(['video-generated', 'audio-generated'])
const taskManager = useTaskManager()
let taskManagerUnsubscribe = null

watch(() => taskManager.state.outputUrl, (newUrl) => {
  if (newUrl && taskManager.state.status === 'success') {
    videoPath.value = '' + newUrl
    isGenerating.value = false
    isGeneratingVideo.value = false
    emit('video-generated', newUrl)
  }
})

const allAvatars = ref([])
const selectedAvatar = ref(null)
const selectedAvatarId = ref('')
const soundFiles = ref([])
const selectedSound = ref(null)
const selectedSoundId = ref('')
const isGenerating = ref(false)
const isGeneratingDubbing = ref(false)
const isGeneratingVideo = ref(false)
const videoPath = ref('')
const generatedDubbingUrl = ref('')
const error = ref('')
const isPlayingSound = ref(false)
const isPlayingAudio = ref(false)
let currentSoundAudio = null
let currentAudio = null

const imageList = ref([])
const selectedImage = ref(null)
const selectedImageId = ref('')
const audioList = ref([])
const selectedAudio = ref(null)
const selectedAudioId = ref('')

const isUploadingImage = ref(false)
const isUploadingAvatar = ref(false)
const isUploadingDubbing = ref(false)
const imageUploadInput = ref(null)
const avatarUploadInput = ref(null)
const dubbingUploadInput = ref(null)
const showPreviewModal = ref(false)
const previewFileUrl = ref('')
const previewFileType = ref('')

console.log('📦 allAvatars ref created:', allAvatars.value)

const libraryAvatars = computed(() => {
  const targetType = props.useVideoDriver ? 'video' : 'image'
  const filtered = allAvatars.value.filter(a => a.type === targetType)
  console.log(`📋 libraryAvatars computed - targetType: ${targetType}, filtered.length: ${filtered.length}`)
  return filtered
})

onMounted(() => {
  console.log('🎬 AvatarVideo onMounted - 开始获取数据')
  fetchAvatars()
  fetchSounds()
  fetchImages()
  fetchAudios()
  fetchLatestVideo()

  taskManagerUnsubscribe = taskManager.subscribe((taskState) => {
    if (taskState.status === 'success' && taskState.outputUrl) {
      videoPath.value = '' + taskState.outputUrl
      isGenerating.value = false
    }
    if (taskState.status === 'error') {
      error.value = taskState.errorMessage || '视频生成失败'
      isGenerating.value = false
    }
  })
})

onUnmounted(() => {
  if (taskManagerUnsubscribe) {
    taskManagerUnsubscribe()
  }
})

const fetchLatestVideo = async () => {
  try {
    const user = getCurrentUser()
    let url = '/api/work-library'
    if (user?.id) {
      url += `?userId=${user.id}`
    }
    const response = await fetch(url, { headers: getAuthHeaders() })
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0 && data[0].videoPath) {
      videoPath.value = '' + data[0].videoPath
    }
  } catch (err) {
    console.error('Failed to fetch latest video:', err)
  }
}

watch(() => props.useVideoDriver, (newVal, oldVal) => {
  console.log(`🔄 useVideoDriver watch - newVal: ${newVal}, oldVal: ${oldVal}`)
  console.log('📦 allAvatars 当前值:', allAvatars.value)
  console.log('📋 libraryAvatars 当前值:', libraryAvatars.value)

  if (libraryAvatars.value.length > 0) {
    selectedAvatar.value = libraryAvatars.value[0]
    selectedAvatarId.value = libraryAvatars.value[0].id
    console.log('✅ 自动选择了:', selectedAvatar.value.fileName)
  } else {
    selectedAvatar.value = null
    selectedAvatarId.value = ''
    console.log('⚠️ 没有可用的肖像')
  }
}, { immediate: true })

const getCurrentUser = () => {
  try {
    const userInfo = localStorage.getItem('userInfo')
    if (userInfo) {
      const user = JSON.parse(userInfo)
      console.log('👤 找到用户:', user)
      return user
    } else {
      console.log('❌ 没有找到用户信息 (userInfo is null)')
    }
  } catch (err) {
    console.error('❌ 解析用户信息失败:', err)
  }
  return null
}

const fetchImages = async () => {
  console.log('📡 fetchImages 开始执行')
  try {
    const user = getCurrentUser()
    let url = '/api/portrait-library?type=image'
    if (user && user.id) {
      url += '&userId=' + user.id
    }

    const response = await fetch(url, { headers: getAuthHeaders() })
    const data = await response.json()

    if (Array.isArray(data)) {
      imageList.value = data
      console.log('✅ 图片列表已获取, 数量:', data.length)
      if (data.length > 0) {
        selectedImage.value = data[0]
        selectedImageId.value = data[0].id
      }
    } else {
      imageList.value = []
    }
  } catch (err) {
    console.error('❌ fetchImages 出错:', err)
    imageList.value = []
  }
}

const fetchAudios = async () => {
  console.log('📡 fetchAudios 开始执行')
  try {
    const user = getCurrentUser()
    let url = '/api/dubbing-library'
    if (user && user.id) {
      url += '?userId=' + user.id
    }

    const response = await fetch(url, { headers: getAuthHeaders() })
    const data = await response.json()

    if (Array.isArray(data)) {
      audioList.value = data
      console.log('✅ 音频列表已获取, 数量:', data.length)
      if (data.length > 0) {
        selectedAudio.value = data[0]
        selectedAudioId.value = data[0].id
      }
    } else {
      audioList.value = []
    }
  } catch (err) {
    console.error('❌ fetchAudios 出错:', err)
    audioList.value = []
  }
}

const handleImageChange = (imageId) => {
  console.log('🔄 handleImageChange - imageId:', imageId)
  if (Array.isArray(imageList.value)) {
    selectedImage.value = imageList.value.find(v => v.id === imageId)
    console.log('✅ 选择的图片:', selectedImage.value)
  } else {
    selectedImage.value = null
  }
}

const handleAudioChange = (audioId) => {
  console.log('🔄 handleAudioChange - audioId:', audioId)
  if (Array.isArray(audioList.value)) {
    selectedAudio.value = audioList.value.find(v => v.id === audioId)
    console.log('✅ 选择的音频:', selectedAudio.value)
  } else {
    selectedAudio.value = null
  }
}



const previewAudio = () => {
  console.log('🔊 previewAudio - selectedAudio:', selectedAudio.value)

  if (currentAudio && isPlayingAudio.value) {
    console.log('🔊 停止播放')
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
    isPlayingAudio.value = false
    return
  }

  if (selectedAudio.value) {
    const audioUrl = '' + selectedAudio.value.fileUrl
    console.log('🔊 播放音频:', audioUrl)

    if (currentAudio) {
      currentAudio.pause()
      currentAudio = null
    }

    currentAudio = new Audio(audioUrl)

    currentAudio.onplay = () => {
      isPlayingAudio.value = true
    }

    currentAudio.onended = () => {
      isPlayingAudio.value = false
      currentAudio = null
    }

    currentAudio.onerror = () => {
      isPlayingAudio.value = false
      currentAudio = null
      console.error('❌ 播放失败')
    }

    currentAudio.play().catch(err => {
      console.error('❌ 播放失败:', err)
      isPlayingAudio.value = false
      currentAudio = null
    })
  }
}

const triggerImageUpload = () => {
  if (imageUploadInput.value) {
    imageUploadInput.value.click()
  }
}

const handleImageFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    isUploadingImage.value = true

    // 1. 上传文件到服务器
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch('/api/portrait-library/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })

    const uploadData = await uploadResponse.json()

    if (!uploadData.fileUrl) {
      throw new Error('文件上传失败')
    }

    // 2. 将肖像信息存入数据库
    const user = getCurrentUser()
    const portraitData = {
      userId: user?.id || '00000000-0000-0000-0000-000000000000',
      fileName: uploadData.originalName,
      fileUrl: uploadData.fileUrl,
      fileSize: uploadData.fileSize,
      type: uploadData.type,
      width: uploadData.width,
      height: uploadData.height,
      duration: uploadData.duration,
      description: '用户上传的图片',
      tags: [],
      isPublic: false
    }

    const saveResponse = await fetch('/api/portrait-library', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(portraitData)
    })

    if (!saveResponse.ok) {
      throw new Error('保存肖像信息失败')
    }

    // 3. 刷新图片列表
    await fetchImages()

    // 4. 自动选择新上传的图片
    const savedPortrait = await saveResponse.json()
    if (savedPortrait.id) {
      selectedImageId.value = savedPortrait.id
      selectedImage.value = savedPortrait
    }

    ElMessage.success('图片上传成功')

  } catch (err) {
    console.error('上传图片失败:', err)
    ElMessage.error('上传图片失败: ' + (err.message || '未知错误'))
  } finally {
    isUploadingImage.value = false
    event.target.value = ''
  }
}

const getFriendlyErrorMessage = (errorMsg) => {
  if (errorMsg?.includes('TASK_QUEUE_MAXED')) {
    return 'RunningHub服务当前繁忙，正在自动重试，请稍候...'
  }
  if (errorMsg?.includes('超时') || errorMsg?.includes('TIMEOUT')) {
    return '任务执行超时，请稍后重试'
  }
  return errorMsg || '生成失败'
}

const generateImageToVideo = async () => {
  console.log('🎬 generateImageToVideo 开始')

  if (!selectedImage.value) {
    error.value = '请选择图片'
    return
  }

  if (!selectedAudio.value) {
    error.value = '请选择音频'
    return
  }

  taskManager.startTask('image-to-video', '图片转视频', {
    imageId: selectedImage.value.id,
    audioId: selectedAudio.value.id
  })

  taskManager.executeAfterConfirm(async () => {
    try {
      isGeneratingVideo.value = true
      error.value = ''

      const imageFileUrl = '' + selectedImage.value.fileUrl
      const audioFileUrl = '' + selectedAudio.value.fileUrl
      const user = getCurrentUser()

      const response = await fetch('/api/audio/generate-image-to-video', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          imageFileUrl: imageFileUrl,
          audioFileUrl: audioFileUrl,
          userId: user?.id
        })
      })

      let data
      try {
        data = await response.json()
      } catch (parseErr) {
        console.error('❌ 解析响应失败:', parseErr)
        if (!response.ok) {
          throw new Error(`服务器错误 (${response.status})，请检查后端服务是否正常运行`)
        } else {
          throw new Error('响应格式错误，请稍后重试')
        }
      }

      if (data.success && data.taskId) {
        return { success: true, taskId: data.taskId }
      } else if (data.success && data.videoUrl) {
        videoPath.value = '' + data.videoUrl
        return { success: true, message: '视频生成完成' }
      } else {
        throw new Error(getFriendlyErrorMessage(data.error))
      }
    } catch (err) {
      console.error('❌ 生成视频失败:', err)
    } finally {
      isGeneratingVideo.value = false
    }
  })
}

const fetchAvatars = async () => {
  console.log('📡 fetchAvatars 开始执行')
  try {
    const user = getCurrentUser()
    let url = '/api/portrait-library'
    if (user && user.id) {
      url += '?userId=' + user.id
    }

    console.log('🌐 请求URL:', url)
    console.log('👤 请求使用的userId:', user?.id || '(无)')

    const response = await fetch(url, { headers: getAuthHeaders() })
    console.log('📡 HTTP状态码:', response.status)

    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`)
    }

    const data = await response.json()
    console.log('📦 接收到的数据:', data)
    console.log('📦 数据类型:', typeof data)
    console.log('📦 是否是数组:', Array.isArray(data))

    if (Array.isArray(data)) {
      allAvatars.value = data
      console.log('✅ 数据已赋值给 allAvatars, 数量:', data.length)

      data.forEach((avatar, index) => {
        console.log(`  ${index + 1}. id: ${avatar.id}, fileName: ${avatar.fileName}, type: ${avatar.type}, userId: ${avatar.userId}`)
      })

      console.log('📋 libraryAvatars (filtered):', libraryAvatars.value)

      if (libraryAvatars.value.length > 0) {
        selectedAvatar.value = libraryAvatars.value[0]
        selectedAvatarId.value = libraryAvatars.value[0].id
        console.log('✅ 已自动选择第一个肖像:', selectedAvatar.value.fileName)
      } else {
        console.log('⚠️ libraryAvatars 为空，可能没有匹配的数据')
      }
    } else {
      console.log('❌ 响应数据不是数组，设置 allAvatars 为空数组')
      console.log('❌ 实际数据:', data)
      allAvatars.value = []
    }
  } catch (err) {
    console.error('❌ fetchAvatars 出错:', err)
    console.error('❌ 错误详情:', err.message)
    console.error('❌ 错误堆栈:', err.stack)
    allAvatars.value = []
  }
}

const handleAvatarChange = (avatarId) => {
  console.log('🔄 handleAvatarChange - avatarId:', avatarId)
  console.log('📋 libraryAvatars:', libraryAvatars.value)
  if (Array.isArray(libraryAvatars.value)) {
    selectedAvatar.value = libraryAvatars.value.find(v => v.id === avatarId)
    console.log('✅ 选择的肖像:', selectedAvatar.value)
  } else {
    selectedAvatar.value = null
    console.log('❌ libraryAvatars 不是数组')
  }
}

const fetchSounds = async () => {
  console.log('📡 fetchSounds 开始执行')
  try {
    const user = getCurrentUser()
    let url = '/api/dubbing-library'
    if (user && user.id) {
      url += '?userId=' + user.id
    }

    console.log('🌐 fetchSounds 请求URL:', url)

    const response = await fetch(url, { headers: getAuthHeaders() })
    console.log('📡 fetchSounds HTTP状态码:', response.status)

    const data = await response.json()
    console.log('📦 fetchSounds 接收到的数据:', data)

    if (Array.isArray(data)) {
      soundFiles.value = data
      console.log('✅ 声音文件数量:', data.length)
      if (data.length > 0) {
        selectedSound.value = data[0]
        selectedSoundId.value = data[0].id
        console.log('✅ 已选择第一个声音:', selectedSound.value.fileName)
      }
    } else {
      console.log('⚠️ 声音数据不是数组')
      soundFiles.value = []
    }
  } catch (err) {
    console.error('❌ fetchSounds 出错:', err)
    soundFiles.value = []
  }
}

const handleSoundChange = (soundId) => {
  console.log('🔄 handleSoundChange - soundId:', soundId)
  if (Array.isArray(soundFiles.value)) {
    selectedSound.value = soundFiles.value.find(v => v.id === soundId)
    console.log('✅ 选择的声音:', selectedSound.value)
  } else {
    selectedSound.value = null
  }
}

const previewSound = () => {
  console.log('🔊 previewSound - selectedSound:', selectedSound.value)
  
  if (currentSoundAudio && isPlayingSound.value) {
    console.log('🔊 停止播放')
    currentSoundAudio.pause()
    currentSoundAudio.currentTime = 0
    currentSoundAudio = null
    isPlayingSound.value = false
    return
  }
  
  if (selectedSound.value) {
    const audioUrl = '' + selectedSound.value.fileUrl
    console.log('🔊 播放音频:', audioUrl)
    
    if (currentSoundAudio) {
      currentSoundAudio.pause()
      currentSoundAudio = null
    }
    
    currentSoundAudio = new Audio(audioUrl)
    
    currentSoundAudio.onplay = () => {
      isPlayingSound.value = true
    }
    
    currentSoundAudio.onended = () => {
      isPlayingSound.value = false
      currentSoundAudio = null
    }
    
    currentSoundAudio.onerror = () => {
      isPlayingSound.value = false
      currentSoundAudio = null
      console.error('❌ 播放失败')
    }
    
    currentSoundAudio.play().catch(err => {
      console.error('❌ 播放失败:', err)
      isPlayingSound.value = false
      currentSoundAudio = null
    })
  }
}

const previewAvatar = () => {
  console.log('🖼️ previewAvatar - selectedAvatar:', selectedAvatar.value)
  if (selectedAvatar.value) {
    previewFileUrl.value = '' + selectedAvatar.value.fileUrl
    previewFileType.value = selectedAvatar.value.type
    showPreviewModal.value = true
  }
}

const previewImage = () => {
  console.log('🖼️ previewImage - selectedImage:', selectedImage.value)
  if (selectedImage.value) {
    previewFileUrl.value = '' + selectedImage.value.fileUrl
    previewFileType.value = 'image'
    showPreviewModal.value = true
  }
}

const closePreviewModal = () => {
  showPreviewModal.value = false
  previewFileUrl.value = ''
  previewFileType.value = ''
}

const triggerAvatarUpload = () => {
  if (avatarUploadInput.value) {
    avatarUploadInput.value.click()
  }
}

const handleAvatarFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    isUploadingAvatar.value = true

    // 1. 上传文件到服务器
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch('/api/portrait-library/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })

    const uploadData = await uploadResponse.json()

    if (!uploadData.fileUrl) {
      throw new Error('文件上传失败')
    }

    // 2. 将肖像信息存入数据库
    const user = getCurrentUser()
    const portraitData = {
      userId: user?.id || '00000000-0000-0000-0000-000000000000',
      fileName: uploadData.originalName,
      fileUrl: uploadData.fileUrl,
      fileSize: uploadData.fileSize,
      type: uploadData.type,
      width: uploadData.width,
      height: uploadData.height,
      duration: uploadData.duration,
      description: '用户上传的肖像素材',
      tags: [],
      isPublic: false
    }

    const saveResponse = await fetch('/api/portrait-library', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(portraitData)
    })

    if (!saveResponse.ok) {
      throw new Error('保存肖像信息失败')
    }

    // 3. 刷新肖像列表
    await fetchAvatars()

    // 4. 自动选择新上传的肖像
    const savedPortrait = await saveResponse.json()
    if (savedPortrait.id) {
      selectedAvatarId.value = savedPortrait.id
      selectedAvatar.value = savedPortrait
    }

    ElMessage.success('肖像素材上传成功')

  } catch (err) {
    console.error('上传肖像素材失败:', err)
    ElMessage.error('上传肖像素材失败: ' + (err.message || '未知错误'))
  } finally {
    isUploadingAvatar.value = false
    event.target.value = ''
  }
}

const triggerDubbingUpload = () => {
  if (dubbingUploadInput.value) {
    dubbingUploadInput.value.click()
  }
}

const handleDubbingFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    isUploadingDubbing.value = true

    // 1. 上传文件到服务器
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch('/api/dubbing-library/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    })

    const uploadData = await uploadResponse.json()

    if (!uploadData.fileUrl) {
      throw new Error('文件上传失败')
    }

    // 2. 将配音信息存入数据库
    const user = getCurrentUser()
    const dubbingData = {
      userId: user?.id || '00000000-0000-0000-0000-000000000000',
      fileName: uploadData.originalName,
      fileUrl: uploadData.fileUrl,
      fileSize: uploadData.fileSize,
      duration: uploadData.duration,
      description: '用户上传的配音',
      tags: [],
      isPublic: false
    }

    const saveResponse = await fetch('/api/dubbing-library', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(dubbingData)
    })

    if (!saveResponse.ok) {
      throw new Error('保存配音信息失败')
    }

    // 3. 刷新两个列表
    await fetchSounds()
    await fetchAudios()

    // 4. 自动选择新上传的配音
    const savedDubbing = await saveResponse.json()
    if (savedDubbing.id) {
      // 根据当前模式选择对应的列表
      if (props.useVideoDriver) {
        selectedSoundId.value = savedDubbing.id
        selectedSound.value = savedDubbing
      } else {
        selectedAudioId.value = savedDubbing.id
        selectedAudio.value = savedDubbing
      }
    }

    ElMessage.success('配音上传成功')

  } catch (err) {
    console.error('上传配音失败:', err)
    ElMessage.error('上传配音失败: ' + (err.message || '未知错误'))
  } finally {
    isUploadingDubbing.value = false
    event.target.value = ''
  }
}

const generateDubbing = async () => {
  console.log('🎤 generateDubbing 开始')
  isGeneratingDubbing.value = true
  error.value = ''

  if (!props.audioPath) {
    error.value = '请先生成文案并选择'
    isGeneratingDubbing.value = false
    return
  }

  if (!selectedSound.value) {
    error.value = '请选择声音文件'
    isGeneratingDubbing.value = false
    return
  }

  try {
    const response = await fetch('/api/audio/generate-dubbing', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        voiceFileUrl: '' + selectedSound.value.fileUrl,
        text: props.audioPath,
        emotionDescription: selectedSound.value.description || '',
        userId: getCurrentUser()?.id
      })
    })

    let data
    try {
      data = await response.json()
    } catch (parseErr) {
      console.error('❌ 解析响应失败:', parseErr)
      if (!response.ok) {
        error.value = `服务器错误 (${response.status})，请检查后端服务是否正常运行`
      } else {
        error.value = '响应格式错误，请稍后重试'
      }
      return
    }

    console.log('🎤 配音生成结果:', data)
    if (data.success && data.taskId && !data.audioUrl) {
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch('/api/tasks/' + data.taskId + '?_t=' + Date.now(), {
            headers: {
              ...getAuthHeaders(),
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          })
          const pollData = await pollRes.json()
          if (pollData.status === 'success' && pollData.outputUrl) {
            clearInterval(pollInterval)
            generatedDubbingUrl.value = '' + pollData.outputUrl
            emit('audio-generated', generatedDubbingUrl.value)
            isGeneratingDubbing.value = false
            taskManager.completeTask('配音生成完成')
          } else if (pollData.status === 'timeout') {
            clearInterval(pollInterval)
            error.value = '⏰ AI处理时间较长，任务已转入后台执行，完成后将自动保存到配音库'
            isGeneratingDubbing.value = false
            taskManager.failTask('AI处理时间较长，任务已转入后台执行')
          } else if (pollData.status === 'error') {
            clearInterval(pollInterval)
            error.value = pollData.errorMessage || '配音生成失败'
            isGeneratingDubbing.value = false
            taskManager.failTask(pollData.errorMessage || '配音生成失败')
          }
        } catch (e) {
          clearInterval(pollInterval)
          error.value = '轮询任务状态失败'
          isGeneratingDubbing.value = false
        }
      }, 3000)
      setTimeout(() => { clearInterval(pollInterval); isGeneratingDubbing.value = false }, 600000)
    } else if (data.success && data.audioUrl) {
      generatedDubbingUrl.value = '' + data.audioUrl
      emit('audio-generated', generatedDubbingUrl.value)
    } else {
      error.value = getFriendlyErrorMessage(data.error)
    }
  } catch (err) {
    console.error('❌ 生成配音失败:', err)
    error.value = '网络错误，请检查后端服务是否运行'
  } finally {
    isGeneratingDubbing.value = false
  }
}

const generateVideo = async () => {
  console.log('🎬 generateVideo 开始')

  let audioToUse = generatedDubbingUrl.value || props.audioPath
  if (selectedSound.value && selectedSound.value.fileUrl && !generatedDubbingUrl.value) {
    audioToUse = '' + selectedSound.value.fileUrl
  }

  console.log('🎬 使用的音频:', audioToUse)
  console.log('🎬 使用的肖像:', selectedAvatar.value)
  console.log('🎬 使用视频驱动:', props.useVideoDriver)

  if (!audioToUse) {
    error.value = '请先选择声音文件或生成配音'
    return
  }

  if (!selectedAvatar.value) {
    error.value = '请选择肖像素材'
    return
  }

  const taskName = props.useVideoDriver ? '视频驱动生成' : '肖像视频生成'
  taskManager.startTask('video-generation', taskName, {
    avatarId: selectedAvatar.value.id,
    useVideoDriver: props.useVideoDriver
  })

  taskManager.executeAfterConfirm(async () => {
    try {
      isGenerating.value = true
      error.value = ''

      if (props.useVideoDriver) {
        const videoFileUrl = '' + selectedAvatar.value.fileUrl

        const response = await fetch('/api/audio/generate-video-to-video', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            videoFileUrl: videoFileUrl,
            audioFileUrl: audioToUse,
            userId: getCurrentUser()?.id
          })
        })

        let data
        try {
          data = await response.json()
        } catch (parseErr) {
          console.error('❌ 解析响应失败:', parseErr)
          if (!response.ok) {
            throw new Error(`服务器错误 (${response.status})，请检查后端服务是否正常运行`)
          } else {
            throw new Error('响应格式错误，请稍后重试')
          }
        }

        if (data.success && data.taskId) {
          return { success: true, taskId: data.taskId }
        } else if (data.success && data.videoUrl) {
          videoPath.value = '' + data.videoUrl
          return { success: true, message: '视频生成完成' }
        } else {
          throw new Error(getFriendlyErrorMessage(data.error))
        }
      } else {
        const response = await fetch('/api/video/generate', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            audioPath: audioToUse,
            avatarId: selectedAvatar.value.id,
            modelType: 'local',
            userId: getCurrentUser()?.id
          })
        })

        const data = await response.json()
        if (data.success && data.taskId) {
          return { success: true, taskId: data.taskId }
        } else if (data.videoPath) {
          videoPath.value = '/' + data.videoPath
          return { success: true, message: '视频生成完成' }
        } else {
          throw new Error(data.error || '生成失败')
        }
      }
    } catch (err) {
      console.error('❌ 生成视频失败:', err)
    } finally {
      isGenerating.value = false
    }
  })
}

const regenerateVideo = () => {
  console.log('🔄 regenerateVideo')
  videoPath.value = ''
  generateVideo()
}

const confirmVideo = () => {
  console.log('✅ confirmVideo - videoPath:', videoPath.value)
  if (videoPath.value) {
    emit('video-generated', videoPath.value)
  }
}
</script>

<style scoped>
.avatar-video {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
}

.image-to-video-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-select-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-select {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-select-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-select {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.sound-select-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.sound-select {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.section-title {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.generate-section {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.generate-section button {
  flex: 1;
}

.video-preview {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.video-wrapper {
  position: relative;
  width: 100%;
  padding-top: 75%;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
  outline: 1px solid rgba(255, 255, 255, 0.2);
}

.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.video-actions {
  display: flex;
  gap: 10px;
}

.video-actions button {
  flex: 1;
}

.dubbing-preview {
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.audio-player {
  width: 100%;
  margin-top: 10px;
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  padding: 10px;
  background: rgba(255, 77, 79, 0.1);
  border-radius: 6px;
}

.playing {
  background: rgba(102, 126, 234, 0.2) !important;
  border-color: rgba(102, 126, 234, 0.5) !important;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 预览弹窗样式 */
.preview-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.preview-modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 85vh;
}

.preview-modal-close {
  position: absolute;
  top: -45px;
  right: 0;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  color: white;
  font-size: 28px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
  z-index: 10;
}

.preview-modal-close:hover {
  background: rgba(255, 255, 255, 0.6);
}

.preview-modal-hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  text-align: center;
  margin-top: 12px;
}

.preview-media {
  max-width: 100%;
  max-height: 80vh;
  display: block;
  border-radius: 8px;
}
</style>

<style>
.avatar-select-popper .el-select-dropdown__item {
  padding: 8px 12px;
}

.avatar-option {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-preview-thumb {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.avatar-preview-thumb img,
.avatar-preview-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-option-name {
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
</style>

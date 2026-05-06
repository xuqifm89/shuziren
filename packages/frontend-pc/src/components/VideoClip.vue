<template>
  <div class="video-clip">
    <div class="video-wrapper" v-if="currentVideoPath">
      <video :src="getVideoUrl(currentVideoPath)" controls class="video-player" />
      <div class="upload-status" v-if="isUploadingVideo">
        <span>视频正在上传中...</span>
      </div>
    </div>
    <div class="no-video" v-else>
      <span class="no-video-text">请先生成视频</span>
    </div>

    <div class="section editor-section">
      <div class="tab-bar">
        <div :class="['tab-item', { active: activeTab === 'subtitle' }]" @click="activeTab = 'subtitle'">📝 字幕</div>
        <div :class="['tab-item', { active: activeTab === 'cover' }]" @click="activeTab = 'cover'">🖼 封面</div>
      </div>

      <div class="tab-content" v-if="activeTab === 'subtitle'">
        <div class="frame-viewer" v-if="subtitleFrameUrl" ref="subtitleViewerRef">
          <img :src="subtitleFrameUrl" class="frame-viewer-img" />
          <div
            v-if="subtitleDisplayText"
            class="draggable-text"
            :style="subtitleDraggableStyle"
            @mousedown="onSubtitleDragStart"
            @touchstart.prevent="onSubtitleTouchStart"
          >
            {{ subtitleDisplayText }}
          </div>
          <div class="frame-nav frame-nav-left" @click="prevSubtitleFrame" v-if="subtitleFrames.length > 1">‹</div>
          <div class="frame-nav frame-nav-right" @click="nextSubtitleFrame" v-if="subtitleFrames.length > 1">›</div>
          <div class="frame-refresh" @click="refreshSubtitleFrames">🔄</div>
          <div class="frame-indicator" v-if="subtitleFrames.length > 1">{{ subtitleFrameIndex + 1 }} / {{ subtitleFrames.length }}</div>
          <div class="drag-hint" v-if="subtitleDisplayText">↕ 拖动文字调整位置</div>
        </div>
        <div class="subtitle-input-area">
          <el-input
            :model-value="displaySubtitleText"
            @update:model-value="handleSubtitleTextChange"
            type="textarea"
            :rows="3"
            placeholder="输入字幕内容，每行一句"
          />
        </div>
        <div class="subtitle-align-row">
          <el-button size="small" :loading="aligning" @click="handleAiGenerateSubtitle" :disabled="!props.videoPath">
            🤖 AI生成字幕
          </el-button>
          <span class="align-tip" v-if="alignedSubtitles.length">已对齐 {{ alignedSubtitles.length }} 句</span>
        </div>
        <div class="style-group">
          <div class="style-group-title">文字</div>
          <div class="subtitle-style-row">
            <span class="style-label">字号</span>
            <el-slider v-model="subtitleStyle.fontSize" :min="12" :max="40" :step="2" class="style-slider" />
            <span class="style-value">{{ subtitleStyle.fontSize }}px</span>
          </div>
          <div class="subtitle-style-row">
            <span class="style-label">字体</span>
            <el-select v-model="subtitleStyle.fontName" class="font-select">
              <el-option v-for="f in fontOptions" :key="f.value" :label="f.label" :value="f.value" />
            </el-select>
          </div>
          <div class="subtitle-style-row">
            <span class="style-label">颜色</span>
            <el-color-picker v-model="subtitleStyle.fontColor" show-alpha size="small" />
          </div>
          <div class="subtitle-style-row">
            <span class="style-label">边框</span>
            <el-color-picker v-model="subtitleStyle.outlineColor" size="small" />
            <el-slider v-model="subtitleStyle.outlineWidth" :min="0" :max="6" :step="1" class="style-slider outline-slider" />
            <span class="style-value">{{ subtitleStyle.outlineWidth }}px</span>
          </div>
        </div>
        <div class="style-group">
          <div class="style-group-title">背景</div>
          <div class="subtitle-style-row">
            <span class="style-label">颜色</span>
            <el-color-picker v-model="subtitleStyle.backColor" show-alpha size="small" />
            <span class="style-label" style="margin-left:8px">透明</span>
            <el-slider v-model="subtitleStyle.backAlpha" :min="0" :max="100" :step="5" class="style-slider" />
            <span class="style-value">{{ subtitleStyle.backAlpha }}%</span>
          </div>
        </div>
      </div>

      <div class="tab-content" v-if="activeTab === 'cover'">
        <div class="frame-viewer" v-if="coverDisplayUrl" ref="coverViewerRef">
          <img :src="coverDisplayUrl" class="frame-viewer-img" />
          <div
            v-if="coverText.trim()"
            class="draggable-text"
            :style="coverDraggableStyle"
            @mousedown="onCoverDragStart"
            @touchstart.prevent="onCoverTouchStart"
          >
            {{ coverText }}
          </div>
          <div class="frame-nav frame-nav-left" @click="prevCoverFrame" v-if="coverFrames.length > 1 && !coverIsUploadedFile">‹</div>
          <div class="frame-nav frame-nav-right" @click="nextCoverFrame" v-if="coverFrames.length > 1 && !coverIsUploadedFile">›</div>
          <div class="frame-refresh" @click="refreshCoverFrames" v-if="!coverIsUploadedFile">🔄</div>
          <div class="frame-indicator" v-if="coverFrames.length > 1 && !coverIsUploadedFile">{{ coverFrameIndex + 1 }} / {{ coverFrames.length }}</div>
          <div class="drag-hint" v-if="coverText.trim()">↕ 拖动文字调整位置</div>
        </div>

        <div class="subtitle-input-area">
          <el-input
            v-model="coverText"
            type="textarea"
            :rows="2"
            placeholder="输入封面文字"
          />
        </div>
        <div class="style-group">
          <div class="style-group-title">文字</div>
          <div class="subtitle-style-row">
            <span class="style-label">字号</span>
            <el-slider v-model="coverStyle.fontSize" :min="12" :max="60" :step="2" class="style-slider" />
            <span class="style-value">{{ coverStyle.fontSize }}px</span>
          </div>
          <div class="subtitle-style-row">
            <span class="style-label">字体</span>
            <el-select v-model="coverStyle.fontName" class="font-select">
              <el-option v-for="f in fontOptions" :key="f.value" :label="f.label" :value="f.value" />
            </el-select>
          </div>
          <div class="subtitle-style-row">
            <span class="style-label">颜色</span>
            <el-color-picker v-model="coverStyle.fontColor" show-alpha size="small" />
          </div>
          <div class="subtitle-style-row">
            <span class="style-label">边框</span>
            <el-color-picker v-model="coverStyle.outlineColor" size="small" />
            <el-slider v-model="coverStyle.outlineWidth" :min="0" :max="6" :step="1" class="style-slider outline-slider" />
            <span class="style-value">{{ coverStyle.outlineWidth }}px</span>
          </div>
        </div>
        <div class="style-group">
          <div class="style-group-title">背景</div>
          <div class="subtitle-style-row">
            <span class="style-label">颜色</span>
            <el-color-picker v-model="coverStyle.backColor" show-alpha size="small" />
            <span class="style-label" style="margin-left:8px">透明</span>
            <el-slider v-model="coverStyle.backAlpha" :min="0" :max="100" :step="5" class="style-slider" />
            <span class="style-value">{{ coverStyle.backAlpha }}%</span>
          </div>
        </div>
        <div class="cover-action-row">
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleCoverUpload"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png,.webp"
          >
            <el-button size="small">📁 上传封面</el-button>
          </el-upload>
          <el-button type="primary" size="small" :loading="generatingCover" @click="handleUseCover" :disabled="!coverText.trim() || !coverCurrentFrame">
            <span v-if="coverUsed">✅ </span>使用此封面
          </el-button>
        </div>
      </div>
    </div>

    <div class="section bgm-section">
      <div class="section-header" @click="toggleSection('bgm')">
        <span class="section-title">🎵 背景音乐</span>
        <span :class="['section-arrow', { expanded: expandedSections.bgm }]">▼</span>
      </div>
      <div class="section-body" v-if="expandedSections.bgm">
        <div class="bgm-select-row">
          <el-select v-model="selectedBgmId" placeholder="从音乐库选择" class="bgm-select" @change="handleBgmChange">
            <el-option v-for="music in musicList" :key="music.id" :label="music.fileName" :value="music.id" />
          </el-select>
        </div>
        <div class="bgm-volume-row" v-if="selectedBgmId">
          <span class="style-label">音量</span>
          <el-slider v-model="bgmVolume" :min="0" :max="100" :step="5" class="style-slider" />
          <span class="style-value">{{ bgmVolume }}%</span>
        </div>
      </div>
    </div>

    <el-button
      type="primary"
      class="compose-btn"
      :disabled="!canCompose"
      :loading="composing"
      @click="handleCompose"
    >
      {{ composing ? '处理中...' : '剪辑生成' }}
    </el-button>

    <div class="result-section" v-if="resultVideoPath">
      <div class="result-header">
        <span class="result-title">✅ 生成完成</span>
      </div>
      <video :src="getVideoUrl(resultVideoPath)" controls class="result-player" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useTaskManager } from '../composables/useTaskManager'
import { getAuthHeaders } from '../utils/api.js'

const API_BASE = '/api/clips'
const taskManager = useTaskManager()

const authAxios = axios.create()
authAxios.interceptors.request.use(config => {
  const headers = getAuthHeaders({ 'Content-Type': config.headers?.['Content-Type'] || 'application/json' })
  Object.entries(headers).forEach(([key, value]) => {
    if (value) config.headers[key] = value
  })
  return config
})

const props = defineProps({
  videoPath: {
    type: String,
    default: ''
  },
  userId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['video-composed', 'video-uploaded'])

const activeTab = ref('subtitle')
const localVideoPath = ref('')
const isUploadingVideo = ref(false)

const expandedSections = reactive({
  bgm: false
})

const subtitleText = ref(localStorage.getItem('vc_subtitleText') || '')
const subtitleStyle = reactive({
  fontSize: parseInt(localStorage.getItem('vc_subFontSize')) || 20,
  fontName: localStorage.getItem('vc_subFontName') || 'PingFang SC',
  fontColor: localStorage.getItem('vc_subFontColor') || '#FFFFFF',
  outlineColor: localStorage.getItem('vc_subOutlineColor') || '#000000',
  outlineWidth: parseInt(localStorage.getItem('vc_subOutlineWidth')) || 2,
  backColor: localStorage.getItem('vc_subBackColor') || '#000000',
  backAlpha: parseInt(localStorage.getItem('vc_subBackAlpha')) || 50,
  posX: parseInt(localStorage.getItem('vc_subPosX')) || 50,
  posY: parseInt(localStorage.getItem('vc_subPosY')) || 85
})

const fontOptions = [
  { label: '苹方', value: 'PingFang SC' },
  { label: '黑体', value: 'STHeiti' },
  { label: '宋体', value: 'STSong' },
  { label: '楷体', value: 'STKaiti' },
  { label: '华文中宋', value: 'STZhongsong' },
  { label: '华文仿宋', value: 'STFangsong' },
  { label: '圆体', value: 'Hiragino Sans GB' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Microsoft YaHei', value: 'Microsoft YaHei' }
]

const subtitleDisplayText = computed(() => {
  if (!subtitleText.value.trim()) return ''
  return subtitleText.value.split('\n').find(l => l.trim()) || ''
})

const displaySubtitleText = computed(() => {
  if (!subtitleText.value.trim()) return ''
  const lines = subtitleText.value.split('\n')
  return lines.map(line => {
    const parts = line.trim().split(/\t/)
    return parts[0] || line
  }).join('\n')
})

function handleSubtitleTextChange(value) {
  if (alignedSubtitles.value.length > 0) {
    const originalLines = subtitleText.value.split('\n')
    const newLines = value.split('\n')
    const updatedLines = originalLines.map((original, index) => {
      if (index < newLines.length) {
        const originalParts = original.trim().split(/\t/)
        if (originalParts.length >= 3) {
          return `${newLines[index].trim()}\t${originalParts[1]}\t${originalParts[2]}`
        }
      }
      return newLines[index] || ''
    })
    subtitleText.value = updatedLines.join('\n')
  } else {
    subtitleText.value = value
  }
}

const subtitleFrames = ref([])
const subtitleFrameIndex = ref(0)
const subtitleFrameUrl = computed(() => {
  if (subtitleFrames.value.length === 0) return ''
  const frame = subtitleFrames.value[subtitleFrameIndex.value]
  return frame ? getFrameUrl(frame.url) : ''
})

const subtitleViewerRef = ref(null)
const subtitleDragging = ref(false)
const videoResolution = ref({ width: 720, height: 1280 })

function getPreviewScale() {
  return 1.3
}

const subtitleDraggableStyle = computed(() => {
  const scale = getPreviewScale()
  const baseStyle = buildDraggableStyle(subtitleStyle, subtitleDragging.value)
  return {
    ...baseStyle,
    fontSize: `${(subtitleStyle.fontSize || 20) * scale}px`
  }
})

const coverFrames = ref([])
const coverFrameIndex = ref(0)
const coverIsUploadedFile = ref(false)
const coverUploadedUrl = ref('')
const coverFile = ref(null)
const coverUsed = ref(false)  // 新增：标记封面是否已使用
const coverCurrentFrame = computed(() => {
  if (coverIsUploadedFile.value) return 'uploaded'
  if (coverFrames.value.length === 0) return null
  return coverFrames.value[coverFrameIndex.value] || null
})
const coverDisplayUrl = computed(() => {
  if (coverIsUploadedFile.value) return coverUploadedUrl.value
  if (coverFrames.value.length === 0) return ''
  const frame = coverFrames.value[coverFrameIndex.value]
  return frame ? getFrameUrl(frame.url) : ''
})

const coverText = ref(localStorage.getItem('vc_coverText') || '')
const coverStyle = reactive({
  fontSize: parseInt(localStorage.getItem('vc_coverFontSize')) || 30,
  fontName: localStorage.getItem('vc_coverFontName') || 'PingFang SC',
  fontColor: localStorage.getItem('vc_coverFontColor') || '#FFFFFF',
  outlineColor: localStorage.getItem('vc_coverOutlineColor') || '#000000',
  outlineWidth: parseInt(localStorage.getItem('vc_coverOutlineWidth')) || 3,
  backColor: localStorage.getItem('vc_coverBackColor') || '',
  backAlpha: parseInt(localStorage.getItem('vc_coverBackAlpha')) || 50,
  posX: parseInt(localStorage.getItem('vc_coverPosX')) || 50,
  posY: parseInt(localStorage.getItem('vc_coverPosY')) || 50
})

const coverViewerRef = ref(null)
const coverDragging = ref(false)

function getCoverPreviewScale() {
  return 1.3
}

const coverDraggableStyle = computed(() => {
  const scale = getCoverPreviewScale()
  const baseStyle = buildDraggableStyle(coverStyle, coverDragging.value)
  return {
    ...baseStyle,
    fontSize: `${(coverStyle.fontSize || 20) * scale}px`
  }
})

function buildDraggableStyle(style, dragging) {
  const color = style.fontColor || '#FFFFFF'
  let hexColor = color
  if (color.startsWith('rgba')) {
    const parts = color.match(/[\d.]+/g)
    if (parts && parts.length >= 3) {
      hexColor = `#${parseInt(parts[0]).toString(16).padStart(2,'0')}${parseInt(parts[1]).toString(16).padStart(2,'0')}${parseInt(parts[2]).toString(16).padStart(2,'0')}`
    }
  }
  const outlineW = style.outlineWidth || 0
  const outlineC = style.outlineColor || '#000000'
  let textShadow = ''
  for (let dx = -outlineW; dx <= outlineW; dx++) {
    for (let dy = -outlineW; dy <= outlineW; dy++) {
      if (dx === 0 && dy === 0) continue
      textShadow += `${dx}px ${dy}px 0 ${outlineC}, `
    }
  }
  textShadow = textShadow.replace(/, $/, '')

  const s = {
    left: `${style.posX}%`,
    top: `${style.posY}%`,
    transform: 'translate(-50%, -50%)',
    fontFamily: style.fontName,
    color: hexColor,
    textShadow: textShadow || 'none',
    cursor: dragging ? 'grabbing' : 'grab'
  }

  if (style.backColor) {
    s.backgroundColor = style.backColor
    s.padding = '2px 8px'
    s.borderRadius = '4px'
  }

  return s
}

function createDragHandler(viewerRef, style, draggingRef) {
  function onStart(e) {
    e.preventDefault()
    draggingRef.value = true
    const viewerEl = viewerRef.value
    if (!viewerEl) return
    const rect = viewerEl.getBoundingClientRect()
    const clientX = e.clientX
    const clientY = e.clientY
    const clickX = clientX - rect.left
    const clickY = clientY - rect.top
    const offsetX = clickX - (style.posX / 100) * rect.width
    const offsetY = clickY - (style.posY / 100) * rect.height

    const onMove = (ev) => {
      const r = viewerEl.getBoundingClientRect()
      let x = ev.clientX - r.left - offsetX
      let y = ev.clientY - r.top - offsetY
      x = Math.max(0, Math.min(r.width, x))
      y = Math.max(0, Math.min(r.height, y))
      style.posX = Math.round((x / r.width) * 100)
      style.posY = Math.round((y / r.height) * 100)
    }

    const onUp = () => {
      draggingRef.value = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onTouchStart(e) {
    draggingRef.value = true
    const viewerEl = viewerRef.value
    if (!viewerEl) return
    const touch = e.touches[0]
    const rect = viewerEl.getBoundingClientRect()
    const clickX = touch.clientX - rect.left
    const clickY = touch.clientY - rect.top
    const offsetX = clickX - (style.posX / 100) * rect.width
    const offsetY = clickY - (style.posY / 100) * rect.height

    const onMove = (ev) => {
      ev.preventDefault()
      const t = ev.touches[0]
      const r = viewerEl.getBoundingClientRect()
      let x = t.clientX - r.left - offsetX
      let y = t.clientY - r.top - offsetY
      x = Math.max(0, Math.min(r.width, x))
      y = Math.max(0, Math.min(r.height, y))
      style.posX = Math.round((x / r.width) * 100)
      style.posY = Math.round((y / r.height) * 100)
    }

    const onEnd = () => {
      draggingRef.value = false
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
    }

    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
  }

  return { onStart, onTouchStart }
}

const subtitleDrag = createDragHandler(subtitleViewerRef, subtitleStyle, subtitleDragging)
const onSubtitleDragStart = subtitleDrag.onStart
const onSubtitleTouchStart = subtitleDrag.onTouchStart

const coverDrag = createDragHandler(coverViewerRef, coverStyle, coverDragging)
const onCoverDragStart = coverDrag.onStart
const onCoverTouchStart = coverDrag.onTouchStart

const generatingCover = ref(false)
const generatedCoverPath = ref('')

const finalCoverUrl = ref('')
const finalCoverServerPath = ref('')
const finalCoverIsUploaded = ref(false)
const coverDuration = ref(0.5)

const musicList = ref([])
const selectedBgmId = ref('')
const selectedBgmPath = ref('')
const bgmVolume = ref(30)

const composing = ref(false)
const resultVideoPath = ref('')
const aligning = ref(false)
const alignedSubtitles = ref([])

const currentVideoPath = computed(() => {
  return localVideoPath.value || props.videoPath
})

const canCompose = computed(() => {
  if (!currentVideoPath.value) return false
  if (!subtitleText.value && !coverFile.value && !generatedCoverPath.value && !selectedBgmId.value) return false
  return !composing.value && !isUploadingVideo.value
})

function getVideoUrl(p) {
  if (!p) return ''
  if (p.startsWith('http') || p.startsWith('blob:') || p.startsWith('data:')) return p
  return `${p}`
}

function getFrameUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${url}`
}

async function uploadLocalVideo(file) {
  try {
    isUploadingVideo.value = true
    const formData = new FormData()
    formData.append('video', file)
    const { data } = await authAxios.post(`${API_BASE}/upload-video`, formData)
    if (data.success && data.videoUrl) {
      localVideoPath.value = data.videoUrl
      emit('video-uploaded', data.videoUrl)
      return data.videoUrl
    }
  } catch (err) {
    console.error('视频上传失败:', err)
    ElMessage.error('视频上传失败')
  } finally {
    isUploadingVideo.value = false
  }
  return null
}

function toggleSection(name) {
  expandedSections[name] = !expandedSections[name]
}

async function extractFramesFor(target) {
  if (!currentVideoPath.value) return
  
  if (currentVideoPath.value.startsWith('blob:')) {
    console.log('检测到本地视频，等待上传...')
    return
  }
  
  try {
    const { data } = await authAxios.post(`${API_BASE}/extract-frames`, {
      videoPath: currentVideoPath.value,
      count: 5
    })
    if (data.success && data.frames && data.frames.length > 0) {
      if (target === 'subtitle') {
        subtitleFrames.value = data.frames
        subtitleFrameIndex.value = 0
      } else {
        coverFrames.value = data.frames
        coverFrameIndex.value = 0
        coverIsUploadedFile.value = false
      }
    }
  } catch (err) {
    console.error('提取帧失败:', err)
  }
}

function prevSubtitleFrame() {
  if (subtitleFrames.value.length <= 1) return
  subtitleFrameIndex.value = (subtitleFrameIndex.value - 1 + subtitleFrames.value.length) % subtitleFrames.value.length
}

function nextSubtitleFrame() {
  if (subtitleFrames.value.length <= 1) return
  subtitleFrameIndex.value = (subtitleFrameIndex.value + 1) % subtitleFrames.value.length
}

function refreshSubtitleFrames() {
  extractFramesFor('subtitle')
}

function prevCoverFrame() {
  if (coverFrames.value.length <= 1) return
  coverFrameIndex.value = (coverFrameIndex.value - 1 + coverFrames.value.length) % coverFrames.value.length
}

function nextCoverFrame() {
  if (coverFrames.value.length <= 1) return
  coverFrameIndex.value = (coverFrameIndex.value + 1) % coverFrames.value.length
}

function refreshCoverFrames() {
  extractFramesFor('cover')
}

function handleCoverUpload(file) {
  coverFile.value = file.raw
  coverUploadedUrl.value = URL.createObjectURL(file.raw)
  coverIsUploadedFile.value = true
  generatedCoverPath.value = ''
  finalCoverUrl.value = coverUploadedUrl.value
  finalCoverServerPath.value = ''
  finalCoverIsUploaded.value = true
  coverUsed.value = false  // 上传新封面时重置使用状态
}

function buildCoverStylePayload() {
  const styleToSend = {
    fontSize: coverStyle.fontSize,
    fontName: coverStyle.fontName,
    fontColor: coverStyle.fontColor || '#FFFFFF',
    outlineColor: coverStyle.outlineColor || '#000000',
    outlineWidth: coverStyle.outlineWidth,
    posX: coverStyle.posX,
    posY: coverStyle.posY
  }
  if (coverStyle.backColor) {
    styleToSend.backColor = coverStyle.backColor
    styleToSend.backAlpha = coverStyle.backAlpha
  }
  return styleToSend
}

async function handleUseCover() {
  if (!coverText.value.trim()) return
  const frame = coverCurrentFrame.value
  if (!frame) return

  generatingCover.value = true
  try {
    const styleToSend = buildCoverStylePayload()

    if (coverIsUploadedFile.value && coverFile.value) {
      const formData = new FormData()
      formData.append('cover', coverFile.value)
      formData.append('text', coverText.value.trim())
      formData.append('style', JSON.stringify(styleToSend))

      const { data } = await authAxios.post(`${API_BASE}/generate-cover-upload`, formData)
      if (data.success && data.coverUrl) {
        finalCoverUrl.value = `${data.coverUrl}?t=${Date.now()}`
        finalCoverServerPath.value = data.coverUrl
        finalCoverIsUploaded.value = true
        coverUsed.value = true  // 标记封面已使用
        ElMessage.success('封面已设置')
      }
    } else {
      const { data } = await authAxios.post(`${API_BASE}/generate-cover`, {
        framePath: frame.url,
        text: coverText.value.trim(),
        style: styleToSend
      })
      if (data.success && data.coverUrl) {
        generatedCoverPath.value = data.coverUrl
        coverFile.value = null
        coverIsUploadedFile.value = false
        finalCoverUrl.value = `${data.coverUrl}?t=${Date.now()}`
        finalCoverServerPath.value = data.coverUrl
        finalCoverIsUploaded.value = false
        coverUsed.value = true  // 标记封面已使用
        ElMessage.success('封面已设置')
      }
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '封面生成失败')
  } finally {
    generatingCover.value = false
  }
}

async function fetchMusicList() {
  try {
    const userInfo = localStorage.getItem('userInfo')
    const userId = userInfo ? JSON.parse(userInfo).id : undefined
    const { data } = await authAxios.get(`${API_BASE}/music-list`, { params: { userId } })
    musicList.value = data
  } catch (err) {
    console.error('获取音乐列表失败:', err)
  }
}

function handleBgmChange(musicId) {
  const music = musicList.value.find(m => m.id === musicId)
  if (music) {
    selectedBgmPath.value = music.fileUrl
  }
}

async function handleAiGenerateSubtitle() {
  if (!currentVideoPath.value) return

  if (currentVideoPath.value.startsWith('blob:')) {
    ElMessage.warning('请等待视频上传完成')
    return
  }

  taskManager.startTask('subtitle', '字幕生成', {
    videoPath: currentVideoPath.value
  })

  taskManager.executeAfterConfirm(async () => {
    try {
      aligning.value = true

      const { data } = await authAxios.post(`${API_BASE}/ai-generate-subtitle`, {
        videoPath: currentVideoPath.value
      })

      if (data.success && data.taskId) {
        return { success: true, taskId: data.taskId }
      } else if (data.success) {
        if (data.text) {
          subtitleText.value = data.text
        }
        if (data.segments && data.segments.length > 0) {
          alignedSubtitles.value = data.segments
        }
        return { success: true, message: '字幕生成完成' }
      } else {
        throw new Error(data.error || '字幕生成失败')
      }
    } catch (err) {
      console.error('❌ [VideoClip] 字幕生成失败:', err)
      throw err
    } finally {
      aligning.value = false
    }
  })
}

function parseSubtitles() {
  if (alignedSubtitles.value.length > 0) {
    return alignedSubtitles.value
  }
  if (!subtitleText.value.trim()) return []
  const lines = subtitleText.value.split('\n').filter(l => l.trim())
  if (lines.length === 0) return []

  const parsed = lines.map(line => {
    const trimmed = line.trim()
    const parts = trimmed.split(/\t/)
    if (parts.length >= 3) {
      const text = parts[0].trim()
      const start = parseFloat(parts[1])
      const end = parseFloat(parts[2])
      if (text && !isNaN(start) && !isNaN(end)) {
        return { start, end, text }
      }
    }
    return null
  }).filter(Boolean)

  if (parsed.length > 0) {
    return parsed
  }

  const avgDuration = 3
  return lines.map((text, index) => ({
    start: index * avgDuration,
    end: (index + 1) * avgDuration,
    text: text.trim()
  }))
}

function getDisplayText() {
  if (!subtitleText.value.trim()) return ''
  const lines = subtitleText.value.split('\n')
  return lines.map(line => {
    const parts = line.trim().split(/\t/)
    return parts[0] || line
  }).join('\n')
}

async function handleCompose() {
  if (!canCompose.value) return
  composing.value = true
  resultVideoPath.value = ''
  try {
    const formData = new FormData()
    
    if (currentVideoPath.value.startsWith('blob:')) {
      ElMessage.warning('请等待视频上传完成')
      composing.value = false
      return
    }
    
    const videoPath = currentVideoPath.value
    if (!videoPath) {
      ElMessage.error('视频路径无效')
      return
    }
    formData.append('videoPath', videoPath)

    const subtitles = parseSubtitles()
    if (subtitles.length > 0) {
      formData.append('subtitles', JSON.stringify(subtitles))
      formData.append('subtitleStyle', JSON.stringify({
        fontSize: subtitleStyle.fontSize,
        fontName: subtitleStyle.fontName,
        fontColor: subtitleStyle.fontColor,
        outlineColor: subtitleStyle.outlineColor,
        outlineWidth: subtitleStyle.outlineWidth,
        backColor: subtitleStyle.backColor,
        backAlpha: subtitleStyle.backAlpha,
        posX: subtitleStyle.posX,
        posY: subtitleStyle.posY
      }))
    }

    if (finalCoverIsUploaded.value && coverFile.value) {
      formData.append('cover', coverFile.value)
      formData.append('coverDuration', String(coverDuration.value))
    } else if (finalCoverServerPath.value) {
      formData.append('coverImagePath', finalCoverServerPath.value)
      formData.append('coverDuration', String(coverDuration.value))
    }

    if (selectedBgmId.value && selectedBgmPath.value) {
      formData.append('bgmPath', selectedBgmPath.value)
      formData.append('bgmVolume', String(bgmVolume.value / 100))
    }

    const currentUserId = props.userId || (() => { try { const userInfo = localStorage.getItem('userInfo'); return userInfo ? JSON.parse(userInfo).id : ''; } catch { return '' } })()
    if (currentUserId) {
      formData.append('userId', currentUserId)
    }

    const { data } = await authAxios.post(`${API_BASE}/compose`, formData)
    if (data.success) {
      resultVideoPath.value = data.videoUrl || data.videoPath
      emit('video-composed', data.videoUrl || data.videoPath)
      ElMessage.success('剪辑生成完成')
    } else {
      ElMessage.error('剪辑生成失败')
    }
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '剪辑生成失败')
  } finally {
    composing.value = false
  }
}

onMounted(() => {
  fetchMusicList()
})

watch(() => props.videoPath, async (newPath) => {
  if (newPath) {
    coverUsed.value = false
    finalCoverUrl.value = ''
    finalCoverServerPath.value = ''
    coverFile.value = null
    coverIsUploadedFile.value = false
    coverUploadedUrl.value = ''
    generatedCoverPath.value = ''

    try {
      const videoUrl = getVideoUrl(newPath)
      const video = document.createElement('video')
      video.src = videoUrl
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = reject
        video.load()
      })
      videoResolution.value = {
        width: video.videoWidth || 720,
        height: video.videoHeight || 1280
      }
    } catch (e) {
      console.warn('Failed to get video resolution:', e)
    }

    if (newPath.startsWith('blob:')) {
      console.log('检测到本地视频，正在上传...')
    } else {
      extractFramesFor('subtitle')
      extractFramesFor('cover')
    }
  } else {
    subtitleFrames.value = []
    coverFrames.value = []
    localVideoPath.value = ''
  }
}, { immediate: true })

watch(localVideoPath, (newPath) => {
  if (newPath) {
    extractFramesFor('subtitle')
    extractFramesFor('cover')
  }
})

watch(subtitleText, (val) => {
  alignedSubtitles.value = []
  localStorage.setItem('vc_subtitleText', val)
})

watch(coverText, (val) => {
  localStorage.setItem('vc_coverText', val)
})

watch(() => ({ ...subtitleStyle }), (val) => {
  localStorage.setItem('vc_subFontSize', val.fontSize)
  localStorage.setItem('vc_subFontName', val.fontName)
  localStorage.setItem('vc_subFontColor', val.fontColor)
  localStorage.setItem('vc_subOutlineColor', val.outlineColor)
  localStorage.setItem('vc_subOutlineWidth', val.outlineWidth)
  localStorage.setItem('vc_subBackColor', val.backColor)
  localStorage.setItem('vc_subBackAlpha', val.backAlpha)
  localStorage.setItem('vc_subPosX', val.posX)
  localStorage.setItem('vc_subPosY', val.posY)
}, { deep: true })

watch(() => ({ ...coverStyle }), (val) => {
  localStorage.setItem('vc_coverFontSize', val.fontSize)
  localStorage.setItem('vc_coverFontName', val.fontName)
  localStorage.setItem('vc_coverFontColor', val.fontColor)
  localStorage.setItem('vc_coverOutlineColor', val.outlineColor)
  localStorage.setItem('vc_coverOutlineWidth', val.outlineWidth)
  localStorage.setItem('vc_coverBackColor', val.backColor)
  localStorage.setItem('vc_coverBackAlpha', val.backAlpha)
  localStorage.setItem('vc_coverPosX', val.posX)
  localStorage.setItem('vc_coverPosY', val.posY)
}, { deep: true })
</script>

<style scoped>
.video-clip {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.video-wrapper {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(102, 126, 234, 0.2);
  position: relative;
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.upload-status {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}

.no-video {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-video-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.section {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  transition: background 0.2s;
}

.section-header:hover {
  background: rgba(102, 126, 234, 0.08);
}

.section-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
}

.section-arrow {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  transition: transform 0.25s ease;
}

.section-arrow.expanded {
  transform: rotate(180deg);
}

.section-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

.tab-item:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(102, 126, 234, 0.05);
}

.tab-item.active {
  color: rgba(255, 255, 255, 0.95);
  border-bottom-color: #667eea;
  background: rgba(102, 126, 234, 0.08);
}

.tab-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.frame-viewer {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(102, 126, 234, 0.3);
  background: #000;
  user-select: none;
}

.frame-viewer-img {
  width: 100%;
  display: block;
}

.draggable-text {
  position: absolute;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 90%;
  text-align: center;
  line-height: 1.4;
  z-index: 10;
  pointer-events: auto;
  transition: none;
}

.drag-hint {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 8px;
  pointer-events: none;
}

.frame-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 22px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.2s, color 0.2s;
  user-select: none;
  z-index: 5;
}

.frame-nav:hover {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

.frame-nav-left {
  left: 0;
  border-radius: 0 6px 6px 0;
}

.frame-nav-right {
  right: 0;
  border-radius: 6px 0 0 6px;
}

.frame-refresh {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  z-index: 5;
}

.frame-refresh:hover {
  background: rgba(102, 126, 234, 0.8);
}

.frame-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  pointer-events: none;
}

.subtitle-input-area :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.subtitle-input-area :deep(.el-textarea__inner::placeholder) {
  color: rgba(255, 255, 255, 0.35);
}

.subtitle-input-area :deep(.el-textarea__inner:focus) {
  border-color: rgba(102, 126, 234, 0.5);
}

.font-select {
  flex: 1;
}

.outline-slider {
  flex: 1;
  margin-left: 8px;
}

.style-group {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-group-title {
  color: rgba(102, 126, 234, 0.8);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.subtitle-style-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.subtitle-align-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.align-tip {
  color: #67c23a;
  font-size: 12px;
}

.style-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  min-width: 28px;
  flex-shrink: 0;
}

.style-slider {
  flex: 1;
}

.style-value {
  color: rgba(102, 126, 234, 0.9);
  font-size: 12px;
  min-width: 36px;
  text-align: right;
  flex-shrink: 0;
}

.cover-action-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.cover-duration-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bgm-select-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bgm-select {
  flex: 1;
}

.bgm-volume-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compose-btn {
  width: 100%;
  height: 40px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
  transition: all 0.3s ease !important;
}

.compose-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(102, 126, 234, 0.5) !important;
}

.compose-btn:disabled {
  opacity: 0.5;
  box-shadow: none !important;
}

.result-section {
  border: 1px solid rgba(103, 194, 58, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  padding: 8px 12px;
  background: rgba(103, 194, 58, 0.08);
}

.result-title {
  color: #67c23a;
  font-size: 13px;
  font-weight: 500;
}

.result-player {
  width: 100%;
  display: block;
}
</style>

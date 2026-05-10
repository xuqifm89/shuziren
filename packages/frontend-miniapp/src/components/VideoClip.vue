<template>
  <view class="video-clip">
    <view v-if="!videoPath" class="empty-hint">
      <text class="empty-text">请先选择视频（使用上方本地上传或视频库按钮）</text>
    </view>

    <view v-else class="clip-body">
      <view class="clip-tabs">
        <view :class="['clip-tab', activeTab === 'subtitle' ? 'active' : '']" @tap="activeTab = 'subtitle'">
          <text class="clip-tab-text">字幕</text>
        </view>
        <view :class="['clip-tab', activeTab === 'cover' ? 'active' : '']" @tap="activeTab = 'cover'">
          <text class="clip-tab-text">封面</text>
        </view>
      </view>

      <!-- 字幕面板 -->
      <view v-if="activeTab === 'subtitle'" class="tab-content">
        <view class="frame-viewer" v-if="subtitleFrameUrl" ref="subtitleViewerRef">
          <image :src="subtitleFrameUrl" class="frame-img" mode="widthFix" />
          <view
            v-if="subtitleDisplayText"
            class="draggable-text"
            :style="subtitleDraggableStyle"
            @touchstart.prevent="onSubtitleTouchStart"
            @mousedown="onSubtitleMouseDown"
          >
            {{ subtitleDisplayText }}
          </view>
          <view class="frame-nav frame-nav-left" @tap="prevSubtitleFrame" v-if="subtitleFrames.length > 1">‹</view>
          <view class="frame-nav frame-nav-right" @tap="nextSubtitleFrame" v-if="subtitleFrames.length > 1">›</view>
          <view class="frame-refresh" @tap="refreshSubtitleFrames">🔄</view>
          <view class="frame-indicator" v-if="subtitleFrames.length > 1">{{ subtitleFrameIndex + 1 }} / {{ subtitleFrames.length }}</view>
          <view class="drag-hint" v-if="subtitleDisplayText">↕ 拖动文字调整位置</view>
        </view>
        <view v-else-if="extractingFrames" class="frame-loading">
          <text class="loading-text">提取关键帧中...</text>
        </view>
        <view v-else class="frame-empty">
          <text class="empty-text">暂无关键帧</text>
        </view>

        <view class="form-group">
          <text class="form-label">字幕文本</text>
          <textarea v-model="subtitleText" class="form-textarea" placeholder="输入字幕文本（每行一句）" />
        </view>
        <button class="action-btn secondary" @tap="handleAISubtitle" :disabled="!videoPath">
          AI生成字幕
        </button>
        <view v-if="alignedSubtitles.length > 0" class="subtitle-list">
          <view class="subtitle-item" v-for="(s, i) in alignedSubtitles" :key="i">
            <text class="subtitle-time">{{ formatTime(s.start) }} - {{ formatTime(s.end) }}</text>
            <text class="subtitle-text">{{ s.text }}</text>
          </view>
        </view>

        <view class="style-section">
          <text class="style-section-title">文字样式</text>
          <view class="style-row">
            <text class="s-label">字号</text>
            <slider :value="subtitleStyle.fontSize" :min="12" :max="40" :step="2" activeColor="#667eea" backgroundColor="rgba(255,255,255,0.1)" block-size="18" show-value @change="e => subtitleStyle.fontSize = e.detail.value" class="style-slider" />
          </view>
          <view class="style-row">
            <text class="s-label">字体</text>
            <view class="font-picker" @tap="showFontPicker = true">
              <text class="font-picker-text">{{ currentFontLabel }}</text>
              <text class="font-picker-arrow">▼</text>
            </view>
          </view>
          <view class="style-row">
            <text class="s-label">颜色</text>
            <view class="color-preview-area" @tap="openColorPicker('fontColor')">
              <view class="color-swatch-lg" :style="{background: subtitleStyle.fontColor}"></view>
              <text class="color-hex-text">{{ subtitleStyle.fontColor }}</text>
            </view>
          </view>
          <view class="style-row">
            <text class="s-label">边框色</text>
            <view class="color-preview-area" @tap="openColorPicker('outlineColor')">
              <view class="color-swatch-lg" :style="{background: subtitleStyle.outlineColor}"></view>
              <text class="color-hex-text">{{ subtitleStyle.outlineColor }}</text>
            </view>
          </view>
          <view class="style-row">
            <text class="s-label">边框宽</text>
            <slider :value="subtitleStyle.outlineWidth" :min="0" :max="6" :step="1" activeColor="#667eea" backgroundColor="rgba(255,255,255,0.1)" block-size="18" show-value @change="e => subtitleStyle.outlineWidth = e.detail.value" class="style-slider" />
          </view>
        </view>

        <view class="style-section">
          <text class="style-section-title">背景样式</text>
          <view class="style-row">
            <text class="s-label">背景色</text>
            <view class="color-preview-area" @tap="openColorPicker('backColor')">
              <view class="color-swatch-lg" :style="{background: subtitleStyle.backColor, opacity: subtitleStyle.backAlpha / 100}"></view>
              <text class="color-hex-text">{{ subtitleStyle.backColor }}</text>
            </view>
          </view>
          <view class="style-row">
            <text class="s-label">透明度</text>
            <slider :value="subtitleStyle.backAlpha" :min="0" :max="100" :step="5" activeColor="#667eea" backgroundColor="rgba(255,255,255,0.1)" block-size="18" show-value @change="e => subtitleStyle.backAlpha = e.detail.value" class="style-slider" />
          </view>
        </view>
      </view>

      <!-- 封面面板 -->
      <view v-if="activeTab === 'cover'" class="tab-content">
        <view class="frame-viewer" v-if="coverDisplayUrl" ref="coverViewerRef">
          <image :src="coverDisplayUrl" class="frame-img" mode="widthFix" />
          <view
            v-if="coverText.trim()"
            class="draggable-text"
            :style="coverDraggableStyle"
            @touchstart.prevent="onCoverTouchStart"
            @mousedown="onCoverMouseDown"
          >
            {{ coverText }}
          </view>
          <view class="frame-nav frame-nav-left" @tap="prevCoverFrame" v-if="coverFrames.length > 1">‹</view>
          <view class="frame-nav frame-nav-right" @tap="nextCoverFrame" v-if="coverFrames.length > 1">›</view>
          <view class="frame-refresh" @tap="refreshCoverFrames">🔄</view>
          <view class="frame-indicator" v-if="coverFrames.length > 1">{{ coverFrameIndex + 1 }} / {{ coverFrames.length }}</view>
          <view class="drag-hint" v-if="coverText.trim()">↕ 拖动文字调整位置</view>
        </view>
        <view v-else-if="extractingFrames" class="frame-loading">
          <text class="loading-text">提取关键帧中...</text>
        </view>
        <view v-else class="frame-empty">
          <text class="empty-text">暂无关键帧</text>
        </view>

        <view class="form-group">
          <text class="form-label">封面文字</text>
          <input v-model="coverText" class="form-input" placeholder="输入封面文字" />
        </view>
        <view class="style-section">
          <text class="style-section-title">封面样式</text>
          <view class="style-row">
            <text class="s-label">字号</text>
            <slider :value="coverStyle.fontSize" :min="12" :max="60" :step="2" activeColor="#667eea" backgroundColor="rgba(255,255,255,0.1)" block-size="18" show-value @change="e => coverStyle.fontSize = e.detail.value" class="style-slider" />
          </view>
          <view class="style-row">
            <text class="s-label">颜色</text>
            <view class="color-preview-area" @tap="openColorPicker('coverFontColor')">
              <view class="color-swatch-lg" :style="{background: coverStyle.fontColor}"></view>
              <text class="color-hex-text">{{ coverStyle.fontColor }}</text>
            </view>
          </view>
          <view class="style-row">
            <text class="s-label">边框色</text>
            <view class="color-preview-area" @tap="openColorPicker('coverOutlineColor')">
              <view class="color-swatch-lg" :style="{background: coverStyle.outlineColor}"></view>
              <text class="color-hex-text">{{ coverStyle.outlineColor }}</text>
            </view>
          </view>
          <view class="style-row">
            <text class="s-label">边框宽</text>
            <slider :value="coverStyle.outlineWidth" :min="0" :max="6" :step="1" activeColor="#667eea" backgroundColor="rgba(255,255,255,0.1)" block-size="18" show-value @change="e => coverStyle.outlineWidth = e.detail.value" class="style-slider" />
          </view>
        </view>
        <button class="action-btn secondary" @tap="handleUseCover" :disabled="!coverDisplayUrl">
          {{ coverUsed ? '✅ 封面已使用' : '使用此封面' }}
        </button>
      </view>

      <view class="bgm-section">
        <view class="bgm-header" @tap="showBgm = !showBgm">
          <text class="bgm-title">🎵 背景音乐</text>
          <text :class="['bgm-arrow', showBgm ? 'expanded' : '']">▼</text>
        </view>
        <view v-if="showBgm" class="bgm-body">
          <view class="form-group">
            <text class="form-label">选择音乐</text>
            <picker :range="musicList" range-key="fileName" @change="onBgmPickerChange">
              <view class="bgm-picker">
                <text class="bgm-picker-text">{{ currentBgmName }}</text>
                <text class="bgm-picker-arrow">▼</text>
              </view>
            </picker>
          </view>
          <view class="style-row" v-if="selectedBgmId">
            <text class="s-label">音量</text>
            <slider :value="bgmVolume" :min="0" :max="100" :step="5" activeColor="#667eea" backgroundColor="rgba(255,255,255,0.1)" block-size="18" show-value @change="e => bgmVolume = e.detail.value" class="style-slider" />
          </view>
        </view>
      </view>

      <button class="action-btn" @tap="handleCompose" :disabled="!videoPath" style="margin-top: 20rpx;">
        剪辑生成
      </button>

      <view v-if="resultVideoPath" class="result-section">
        <view class="result-header">
          <text class="result-title">✅ 剪辑完成</text>
        </view>
        <video :src="resolveMediaUrl(resultVideoPath)" :key="resultVideoPath" controls :autoplay="false" class="result-player" />
        <view class="result-actions">
          <view class="result-action-btn" @tap="handleSaveToLibrary">
            <text class="result-action-text">{{ savedToLibrary ? '✅ 已存入视频库' : '💾 存入视频库' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 颜色选择器 -->
    <view v-if="showColorPickerPanel" class="color-picker-overlay" @tap="closeColorPicker">
      <view class="color-picker-panel" @tap.stop>
        <view class="picker-header">
          <text class="picker-title">选择颜色</text>
          <text class="picker-close" @tap="closeColorPicker">✕</text>
        </view>
        <view class="preset-colors">
          <view
            v-for="c in presetColors"
            :key="c"
            :class="['preset-color-item', currentPickerValue === c ? 'selected' : '']"
            :style="{background: c}"
            @tap="selectPresetColor(c)"
          >
            <text v-if="currentPickerValue === c" class="check-mark">✓</text>
          </view>
        </view>
        <view class="custom-color-row">
          <view class="custom-swatch" :style="{background: currentPickerValue}"></view>
          <input type="text" class="custom-color-input" v-model="currentPickerValue" placeholder="#FFFFFF" @input="onCustomColorInput" />
        </view>
        <view class="picker-actions">
          <view class="picker-btn cancel" @tap="closeColorPicker"><text class="picker-btn-text">取消</text></view>
          <view class="picker-btn confirm" @tap="confirmColor"><text class="picker-btn-text confirm-text">确定</text></view>
        </view>
      </view>
    </view>

    <!-- 字体选择器 -->
    <view v-if="showFontPicker" class="color-picker-overlay" @tap="showFontPicker = false">
      <view class="color-picker-panel" @tap.stop>
        <view class="picker-header">
          <text class="picker-title">选择字体</text>
          <text class="picker-close" @tap="showFontPicker = false">✕</text>
        </view>
        <view class="font-list">
          <view
            v-for="f in fontOptions"
            :key="f.value"
            :class="['font-item', subtitleStyle.fontName === f.value ? 'selected' : '']"
            @tap="subtitleStyle.fontName = f.value; showFontPicker = false"
          >
            <text class="font-item-text" :style="{fontFamily: f.value}">{{ f.label }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, getCurrentInstance } from 'vue'
import api from '../api/index.js'
import { resolveMediaUrl, toRelativePath } from '../utils/media.js'

const props = defineProps({ videoPath: { type: String, default: '' } })
const emit = defineEmits(['video-composed', 'start-task'])
const instance = getCurrentInstance()

const activeTab = ref('subtitle')
const subtitleText = ref('')
const alignedSubtitles = ref([])
const coverText = ref('')
const showColorPickerPanel = ref(false)
const showFontPicker = ref(false)
const currentPickerTarget = ref('')
const currentPickerValue = ref('')
const extractingFrames = ref(false)

const subtitleFrames = ref([])
const subtitleFrameIndex = ref(0)
const subtitleDragging = ref(false)

const coverFrames = ref([])
const coverFrameIndex = ref(0)
const coverDragging = ref(false)
const coverUsed = ref(false)
const generatedCoverPath = ref('')
const coverDuration = ref(0.5)

const musicList = ref([])
const selectedBgmId = ref('')
const selectedBgmPath = ref('')
const bgmVolume = ref(30)
const showBgm = ref(false)
const resultVideoPath = ref('')
const savedToLibrary = ref(false)

const currentBgmName = computed(() => {
  if (!selectedBgmId.value) return '从音乐库选择'
  const music = musicList.value.find(m => m.id === selectedBgmId.value)
  return music ? (music.fileName || music.name || '未知音乐') : '从音乐库选择'
})

const subtitleStyle = reactive({
  fontSize: 20,
  fontName: 'PingFang SC',
  fontColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 2,
  backColor: '#000000',
  backAlpha: 50,
  posX: 50,
  posY: 85
})

const coverStyle = reactive({
  fontSize: 30,
  fontName: 'PingFang SC',
  fontColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 3,
  posX: 50,
  posY: 50
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
  { label: '微软雅黑', value: 'Microsoft YaHei' }
]

const presetColors = [
  '#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000',
  '#FF0000', '#FF4444', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00',
  '#00FF00', '#00CC00', '#009933', '#006633', '#003366', '#0000FF',
  '#3333FF', '#6600CC', '#9900CC', '#CC00CC', '#FF00FF', '#FF66CC',
  '#FFCCCC', '#FFE0CC', '#FFFFCC', '#CCFFCC', '#CCE5FF', '#E0CCFF'
]

const currentFontLabel = computed(() => {
  const f = fontOptions.find(o => o.value === subtitleStyle.fontName)
  return f ? f.label : subtitleStyle.fontName
})

const subtitleDisplayText = computed(() => {
  if (!subtitleText.value) return ''
  const lines = subtitleText.value.split('\n').filter(l => l.trim())
  return lines[0] || ''
})

const subtitleFrameUrl = computed(() => {
  if (subtitleFrames.value.length === 0) return ''
  const frame = subtitleFrames.value[subtitleFrameIndex.value]
  return frame ? resolveMediaUrl(frame.url) : ''
})

const coverDisplayUrl = computed(() => {
  if (coverFrames.value.length === 0) return ''
  const frame = coverFrames.value[coverFrameIndex.value]
  return frame ? resolveMediaUrl(frame.url) : ''
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
  const ow = style.outlineWidth || 0
  const oc = style.outlineColor || '#000000'
  let textShadow = ''
  if (ow > 0) {
    for (let dx = -ow; dx <= ow; dx++) {
      for (let dy = -ow; dy <= ow; dy++) {
        if (dx === 0 && dy === 0) continue
        textShadow += `${dx}px ${dy}px 0 ${oc}, `
      }
    }
    textShadow = textShadow.replace(/, $/, '')
  }
  const s = {
    left: `${style.posX}%`,
    top: `${style.posY}%`,
    transform: 'translate(-50%, -50%)',
    fontFamily: style.fontName || 'PingFang SC',
    color: hexColor,
    textShadow: textShadow || 'none',
    cursor: dragging ? 'grabbing' : 'grab'
  }
  if (style.backColor) {
    s.backgroundColor = style.backColor
    s.opacity = (style.backAlpha !== undefined ? style.backAlpha : 50) / 100
    s.padding = '2px 8px'
    s.borderRadius = '4px'
  }
  return s
}

const subtitleDraggableStyle = computed(() => {
  const base = buildDraggableStyle(subtitleStyle, subtitleDragging.value)
  return { ...base, fontSize: `${(subtitleStyle.fontSize || 20) * 0.7}px` }
})

const coverDraggableStyle = computed(() => {
  const base = buildDraggableStyle(coverStyle, coverDragging.value)
  return { ...base, fontSize: `${(coverStyle.fontSize || 30) * 0.7}px` }
})

function getViewerRect(refName) {
  return new Promise(resolve => {
    const query = uni.createSelectorQuery().in(instance.proxy)
    query.select(refName === 'subtitleViewerRef' ? '.frame-viewer' : '.frame-viewer').boundingClientRect(rect => {
      resolve(rect)
    }).exec()
  })
}

function createDragHandlers(style, draggingRef, viewerRefKey) {
  let cachedRect = null

  function onTouchStart(e) {
    draggingRef.value = true
    getViewerRect(viewerRefKey).then(rect => {
      cachedRect = rect
      if (cachedRect) updateFromTouch(e.touches[0])
    })
    const onTouchMove = (ev) => {
      ev.preventDefault()
      if (!draggingRef.value || !cachedRect) return
      updateFromTouch(ev.touches[0])
    }
    const onTouchEnd = () => {
      draggingRef.value = false
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }

  function onMouseDown(e) {
    draggingRef.value = true
    getViewerRect(viewerRefKey).then(rect => {
      cachedRect = rect
      if (cachedRect) updateFromMouse(e)
    })
    const onMouseMove = (ev) => {
      if (!draggingRef.value || !cachedRect) return
      ev.preventDefault()
      updateFromMouse(ev)
    }
    const onMouseUp = () => {
      draggingRef.value = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function updateFromTouch(touch) {
    const x = touch.clientX - cachedRect.left
    const y = touch.clientY - cachedRect.top
    style.posX = Math.round(Math.max(0, Math.min(100, (x / cachedRect.width) * 100)))
    style.posY = Math.round(Math.max(0, Math.min(100, (y / cachedRect.height) * 100)))
  }

  function updateFromMouse(e) {
    const x = e.clientX - cachedRect.left
    const y = e.clientY - cachedRect.top
    style.posX = Math.round(Math.max(0, Math.min(100, (x / cachedRect.width) * 100)))
    style.posY = Math.round(Math.max(0, Math.min(100, (y / cachedRect.height) * 100)))
  }

  return { onTouchStart, onMouseDown }
}

const subtitleDrag = createDragHandlers(subtitleStyle, subtitleDragging, 'subtitleViewerRef')
const onSubtitleTouchStart = subtitleDrag.onTouchStart
const onSubtitleMouseDown = subtitleDrag.onMouseDown

const coverDrag = createDragHandlers(coverStyle, coverDragging, 'coverViewerRef')
const onCoverTouchStart = coverDrag.onTouchStart
const onCoverMouseDown = coverDrag.onMouseDown

function prevSubtitleFrame() {
  if (subtitleFrames.value.length <= 1) return
  subtitleFrameIndex.value = (subtitleFrameIndex.value - 1 + subtitleFrames.value.length) % subtitleFrames.value.length
}
function nextSubtitleFrame() {
  if (subtitleFrames.value.length <= 1) return
  subtitleFrameIndex.value = (subtitleFrameIndex.value + 1) % subtitleFrames.value.length
}
function refreshSubtitleFrames() { extractFramesFor('subtitle') }

function prevCoverFrame() {
  if (coverFrames.value.length <= 1) return
  coverFrameIndex.value = (coverFrameIndex.value - 1 + coverFrames.value.length) % coverFrames.value.length
}
function nextCoverFrame() {
  if (coverFrames.value.length <= 1) return
  coverFrameIndex.value = (coverFrameIndex.value + 1) % coverFrames.value.length
}
function refreshCoverFrames() { extractFramesFor('cover') }

function isLocalPath(p) {
  if (!p) return false
  return p.startsWith('blob:') || p.startsWith('wxfile://') || p.startsWith('http://tmp/') || (!p.startsWith('/') && !p.startsWith('http'))
}

async function extractFramesFor(target) {
  if (!props.videoPath) return
  if (isLocalPath(props.videoPath)) return
  extractingFrames.value = true
  try {
    const result = await api.post('/clips/extract-frames', { videoPath: toRelativePath(props.videoPath), count: 5 })
    if (result.success && result.frames && result.frames.length > 0) {
      if (target === 'subtitle') {
        subtitleFrames.value = result.frames
        subtitleFrameIndex.value = 0
      } else {
        coverFrames.value = result.frames
        coverFrameIndex.value = 0
      }
    }
  } catch (err) {
    console.error('提取帧失败:', err)
  } finally {
    extractingFrames.value = false
  }
}

watch(() => props.videoPath, async (newPath) => {
  if (newPath) {
    await extractFramesFor('subtitle')
    await extractFramesFor('cover')
  } else {
    subtitleFrames.value = []
    coverFrames.value = []
  }
}, { immediate: true })

onMounted(() => {
  fetchMusicList()
})

function openColorPicker(target) {
  currentPickerTarget.value = target
  if (target === 'fontColor') currentPickerValue.value = subtitleStyle.fontColor
  else if (target === 'outlineColor') currentPickerValue.value = subtitleStyle.outlineColor
  else if (target === 'backColor') currentPickerValue.value = subtitleStyle.backColor
  else if (target === 'coverFontColor') currentPickerValue.value = coverStyle.fontColor
  else if (target === 'coverOutlineColor') currentPickerValue.value = coverStyle.outlineColor
  showColorPickerPanel.value = true
}
function closeColorPicker() { showColorPickerPanel.value = false }
function selectPresetColor(c) { currentPickerValue.value = c }
function onCustomColorInput() {
  let v = currentPickerValue.value.trim()
  if (v && !v.startsWith('#')) v = '#' + v
  currentPickerValue.value = v
}
function confirmColor() {
  const v = currentPickerValue.value
  const t = currentPickerTarget.value
  if (t === 'fontColor') subtitleStyle.fontColor = v
  else if (t === 'outlineColor') subtitleStyle.outlineColor = v
  else if (t === 'backColor') subtitleStyle.backColor = v
  else if (t === 'coverFontColor') coverStyle.fontColor = v
  else if (t === 'coverOutlineColor') coverStyle.outlineColor = v
  showColorPickerPanel.value = false
}

function getUserId() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0:00'
  const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
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

  if (parsed.length > 0) return parsed

  const avgDuration = 3
  return lines.map((text, index) => ({
    start: index * avgDuration,
    end: (index + 1) * avgDuration,
    text: text.trim()
  }))
}

async function fetchMusicList() {
  try {
    const user = getUserId()
    const result = await api.get('/music-library', user?.id ? { userId: user.id } : {})
    musicList.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
  } catch (err) {
    musicList.value = []
  }
}

function handleBgmChange(musicId) {
  const music = musicList.value.find(m => m.id === musicId)
  if (music) {
    selectedBgmPath.value = music.fileUrl || music.filePath || ''
  }
}

function onBgmPickerChange(e) {
  const index = e.detail.value
  const music = musicList.value[index]
  if (music) {
    selectedBgmId.value = music.id
    selectedBgmPath.value = music.fileUrl || music.filePath || ''
  }
}

async function handleAISubtitle() {
  if (!props.videoPath) return
  emit('start-task', 'AI字幕生成', async () => {
    const user = getUserId()
    const result = await api.post('/clips/ai-generate-subtitle', { videoPath: toRelativePath(props.videoPath), userId: user?.id })
    if (result.subtitles && Array.isArray(result.subtitles)) {
      alignedSubtitles.value = result.subtitles
      subtitleText.value = result.subtitles.map(s => s.text).join('\n')
    } else if (result.text) { subtitleText.value = result.text }
    return { success: true, message: '字幕生成成功' }
  })
}

async function handleUseCover() {
  if (!coverDisplayUrl.value) return
  const currentFrame = coverFrames.value[coverFrameIndex.value]
  if (!currentFrame) { uni.showToast({ title: '请先选择封面帧', icon: 'none' }); return }
  try {
    uni.showLoading({ title: '设置封面中...' })
    const result = await api.post('/clips/generate-cover', {
      framePath: toRelativePath(currentFrame.url),
      text: coverText.value,
      style: {
        fontSize: coverStyle.fontSize,
        fontName: coverStyle.fontName,
        fontColor: coverStyle.fontColor,
        outlineColor: coverStyle.outlineColor,
        outlineWidth: coverStyle.outlineWidth,
        posX: coverStyle.posX,
        posY: coverStyle.posY
      }
    })
    uni.hideLoading()
    if (result.success && result.coverUrl) {
      generatedCoverPath.value = result.coverUrl
      coverUsed.value = true
      uni.showToast({ title: '封面已设置', icon: 'success' })
    } else {
      uni.showToast({ title: result.error || '封面设置失败', icon: 'none' })
    }
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: '封面设置失败', icon: 'none' })
  }
}

async function handleCompose() {
  if (!props.videoPath) return
  emit('start-task', '剪辑合成', async () => {
    const user = getUserId()
    const subtitles = parseSubtitles()
    const payload = {
      videoPath: toRelativePath(props.videoPath),
      userId: user?.id
    }

    if (subtitles.length > 0) {
      payload.subtitles = JSON.stringify(subtitles)
      payload.subtitleStyle = JSON.stringify({
        fontSize: subtitleStyle.fontSize,
        fontName: subtitleStyle.fontName,
        fontColor: subtitleStyle.fontColor,
        outlineColor: subtitleStyle.outlineColor,
        outlineWidth: subtitleStyle.outlineWidth,
        backColor: subtitleStyle.backColor,
        backAlpha: subtitleStyle.backAlpha,
        posX: subtitleStyle.posX,
        posY: subtitleStyle.posY
      })
    }

    if (generatedCoverPath.value) {
      payload.coverImagePath = toRelativePath(generatedCoverPath.value)
      payload.coverDuration = String(coverDuration.value)
    }

    if (selectedBgmId.value && selectedBgmPath.value) {
      payload.bgmPath = toRelativePath(selectedBgmPath.value)
      payload.bgmVolume = String(bgmVolume.value / 100)
    }

    const result = await api.post('/clips/compose', payload)
    if (result.success || result.videoUrl) {
      const videoUrl = result.videoUrl || result.videoPath || props.videoPath
      resultVideoPath.value = videoUrl
      savedToLibrary.value = false
      emit('video-composed', videoUrl)
      return { success: true, message: '剪辑合成完成' }
    }
    return { success: false, message: result.error || '剪辑合成失败' }
  })
}

async function handleSaveToLibrary() {
  if (!resultVideoPath.value || savedToLibrary.value) return
  try {
    uni.showLoading({ title: '保存中...' })
    const user = getUserId()
    await api.post('/work-library', {
      userId: user?.id,
      title: `剪辑作品_${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '')}`,
      videoPath: resultVideoPath.value,
      sourceType: 'clip',
      status: 'draft',
      category: 'default'
    })
    savedToLibrary.value = true
    uni.hideLoading()
    uni.showToast({ title: '已存入视频库', icon: 'success' })
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
</script>

<style scoped>
.video-clip { width: 100%; max-width: 100%; overflow: hidden; box-sizing: border-box; }
.clip-body { width: 100%; max-width: 100%; overflow: hidden; box-sizing: border-box; }
.empty-hint { padding: 40rpx; text-align: center; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }

.clip-tabs { display: flex; margin-bottom: 20rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; overflow: hidden; }
.clip-tab { flex: 1; text-align: center; padding: 16rpx 0; }
.clip-tab.active { background: rgba(102,126,234,0.2); }
.clip-tab-text { font-size: 26rpx; color: rgba(255,255,255,0.5); }
.clip-tab.active .clip-tab-text { color: #667eea; font-weight: 600; }

.tab-content { width: 100%; max-width: 100%; overflow: hidden; box-sizing: border-box; }

.frame-viewer { position: relative; width: 100%; border-radius: 16rpx; overflow: hidden; border: 2rpx solid rgba(102,126,234,0.3); background: #000; user-select: none; margin-bottom: 20rpx; touch-action: none; }
.frame-img { width: 100%; display: block; }
.frame-loading { padding: 60rpx; text-align: center; margin-bottom: 20rpx; background: rgba(0,0,0,0.2); border-radius: 16rpx; }
.loading-text { font-size: 24rpx; color: rgba(255,255,255,0.5); }
.frame-empty { padding: 40rpx; text-align: center; margin-bottom: 20rpx; background: rgba(0,0,0,0.1); border-radius: 16rpx; border: 2rpx dashed rgba(255,255,255,0.1); }

.draggable-text { position: absolute; white-space: pre-wrap; word-break: break-word; max-width: 90%; text-align: center; line-height: 1.4; z-index: 10; pointer-events: auto; transition: none; font-weight: 500; }
.frame-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); color: #fff; font-size: 36rpx; border-radius: 50%; z-index: 20; cursor: pointer; }
.frame-nav:active { background: rgba(102,126,234,0.5); }
.frame-nav-left { left: 12rpx; }
.frame-nav-right { right: 12rpx; }
.frame-refresh { position: absolute; top: 12rpx; right: 12rpx; width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); border-radius: 50%; z-index: 20; font-size: 24rpx; cursor: pointer; }
.frame-refresh:active { background: rgba(102,126,234,0.5); }
.frame-indicator { position: absolute; top: 12rpx; left: 12rpx; background: rgba(0,0,0,0.6); padding: 6rpx 16rpx; border-radius: 8rpx; z-index: 20; }
.frame-indicator text { font-size: 20rpx; color: rgba(255,255,255,0.7); font-family: monospace; }
.drag-hint { position: absolute; bottom: 12rpx; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.6); padding: 6rpx 20rpx; border-radius: 8rpx; z-index: 20; }
.drag-hint text { font-size: 20rpx; color: rgba(255,255,255,0.5); }

.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.form-textarea { width: 100%; height: 180rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.action-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.action-btn[disabled] { opacity: 0.5; }
.action-btn.secondary { background: rgba(102,126,234,0.2); border: 1rpx solid rgba(102,126,234,0.4); }
.subtitle-list { margin-top: 16rpx; }
.subtitle-item { display: flex; align-items: center; padding: 12rpx 16rpx; background: rgba(255,255,255,0.03); border-radius: 8rpx; margin-bottom: 8rpx; }
.subtitle-time { font-size: 22rpx; color: #667eea; margin-right: 16rpx; min-width: 120rpx; }
.subtitle-text { font-size: 24rpx; color: rgba(255,255,255,0.8); flex: 1; }

.style-section { margin-top: 24rpx; padding: 20rpx; background: rgba(0,0,0,0.2); border-radius: 16rpx; border: 1rpx solid rgba(255,255,255,0.06); }
.style-section-title { font-size: 26rpx; font-weight: 600; color: #667eea; margin-bottom: 16rpx; display: block; }
.style-row { display: flex; align-items: center; margin-bottom: 12rpx; min-height: 60rpx; }
.style-row:last-child { margin-bottom: 0; }
.s-label { font-size: 24rpx; color: rgba(255,255,255,0.6); min-width: 80rpx; flex-shrink: 0; }
.style-slider { flex: 1; margin: 0; min-width: 0; }

.color-preview-area { display: flex; align-items: center; gap: 16rpx; flex: 1; min-width: 0; padding: 8rpx 16rpx; background: rgba(255,255,255,0.06); border-radius: 12rpx; border: 1rpx solid rgba(255,255,255,0.1); }
.color-swatch-lg { width: 48rpx; height: 48rpx; border-radius: 10rpx; border: 2rpx solid rgba(255,255,255,0.3); flex-shrink: 0; }
.color-hex-text { font-size: 24rpx; color: rgba(255,255,255,0.8); }

.font-picker { display: flex; align-items: center; justify-content: space-between; flex: 1; padding: 8rpx 16rpx; background: rgba(255,255,255,0.06); border-radius: 12rpx; border: 1rpx solid rgba(255,255,255,0.1); }
.font-picker-text { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.font-picker-arrow { font-size: 20rpx; color: rgba(255,255,255,0.4); }

.color-picker-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.color-picker-panel { width: 90%; max-width: 640rpx; background: rgba(30,30,60,0.98); border-radius: 24rpx; border: 1rpx solid rgba(102,126,234,0.3); padding: 32rpx; box-shadow: 0 16rpx 64rpx rgba(0,0,0,0.5); }
.picker-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.picker-title { font-size: 30rpx; font-weight: 600; color: #fff; }
.picker-close { font-size: 36rpx; color: rgba(255,255,255,0.5); padding: 8rpx 16rpx; }
.preset-colors { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 24rpx; }
.preset-color-item { width: 64rpx; height: 64rpx; border-radius: 12rpx; border: 3rpx solid rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; }
.preset-color-item.selected { border-color: #667eea; border-width: 4rpx; box-shadow: 0 0 12rpx rgba(102,126,234,0.5); }
.check-mark { font-size: 28rpx; color: #fff; text-shadow: 0 1rpx 4rpx rgba(0,0,0,0.5); }
.custom-color-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; padding: 16rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; }
.custom-swatch { width: 64rpx; height: 64rpx; border-radius: 12rpx; border: 2rpx solid rgba(255,255,255,0.2); flex-shrink: 0; }
.custom-color-input { flex: 1; height: 64rpx; background: rgba(255,255,255,0.08); border: 1rpx solid rgba(255,255,255,0.15); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: #fff; font-family: monospace; }
.picker-actions { display: flex; gap: 20rpx; }
.picker-btn { flex: 1; height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.picker-btn.cancel { background: rgba(255,255,255,0.08); border: 1rpx solid rgba(255,255,255,0.15); }
.picker-btn.confirm { background: linear-gradient(135deg,#667eea,#764ba2); }
.picker-btn-text { font-size: 28rpx; color: rgba(255,255,255,0.7); }
.confirm-text { color: #fff; font-weight: 600; }

.font-list { max-height: 480rpx; overflow-y: auto; }
.font-item { padding: 20rpx 24rpx; border-radius: 12rpx; margin-bottom: 8rpx; background: rgba(255,255,255,0.04); }
.font-item.selected { background: rgba(102,126,234,0.2); border: 1rpx solid rgba(102,126,234,0.4); }
.font-item-text { font-size: 28rpx; color: rgba(255,255,255,0.8); }

.bgm-section { margin-top: 20rpx; border: 1rpx solid rgba(255,255,255,0.08); border-radius: 16rpx; overflow: hidden; }
.bgm-header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; background: rgba(255,255,255,0.03); }
.bgm-header:active { background: rgba(102,126,234,0.08); }
.bgm-title { font-size: 26rpx; color: rgba(255,255,255,0.9); font-weight: 500; }
.bgm-arrow { font-size: 20rpx; color: rgba(255,255,255,0.4); transition: transform 0.25s ease; }
.bgm-arrow.expanded { transform: rotate(180deg); }
.bgm-body { padding: 20rpx 24rpx; border-top: 1rpx solid rgba(255,255,255,0.06); }
.bgm-picker { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 20rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.1); border-radius: 12rpx; }
.bgm-picker-text { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.bgm-picker-arrow { font-size: 20rpx; color: rgba(255,255,255,0.4); }

.result-section { margin-top: 24rpx; border: 2rpx solid rgba(103,194,58,0.3); border-radius: 16rpx; overflow: hidden; }
.result-header { padding: 16rpx 24rpx; background: rgba(103,194,58,0.08); }
.result-title { font-size: 26rpx; color: #67c23a; font-weight: 600; }
.result-player { width: 100%; display: block; }
.result-actions { padding: 16rpx 24rpx; display: flex; gap: 16rpx; }
.result-action-btn { padding: 16rpx 32rpx; background: linear-gradient(135deg,#667eea,#764ba2); border-radius: 12rpx; }
.result-action-text { font-size: 24rpx; color: #fff; font-weight: 500; }
</style>

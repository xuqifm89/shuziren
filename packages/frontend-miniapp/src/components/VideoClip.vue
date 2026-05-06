<template>
  <view class="video-clip">
    <view v-if="videoPath" class="video-info">
      <text class="video-info-text">已选择视频</text>
    </view>
    <view v-else class="empty-hint">
      <text class="empty-text">请先选择视频（使用上方本地上传或视频库按钮）</text>
    </view>
    <view class="clip-tabs">
      <view :class="['clip-tab', activeTab === 'subtitle' ? 'active' : '']" @tap="activeTab = 'subtitle'">
        <text class="clip-tab-text">字幕</text>
      </view>
      <view :class="['clip-tab', activeTab === 'cover' ? 'active' : '']" @tap="activeTab = 'cover'">
        <text class="clip-tab-text">封面</text>
      </view>
    </view>

    <view v-if="activeTab === 'subtitle'" class="tab-content">
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
          <view class="range-wrap">
            <input type="range" :value="subtitleStyle.fontSize" @input="subtitleStyle.fontSize = +$event.target.value" min="12" max="40" step="2" class="range-slider" />
          </view>
          <text class="s-val">{{ subtitleStyle.fontSize }}px</text>
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
          <view class="range-wrap">
            <input type="range" :value="subtitleStyle.outlineWidth" @input="subtitleStyle.outlineWidth = +$event.target.value" min="0" max="6" step="1" class="range-slider" />
          </view>
          <text class="s-val">{{ subtitleStyle.outlineWidth }}px</text>
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
          <view class="range-wrap">
            <input type="range" :value="subtitleStyle.backAlpha" @input="subtitleStyle.backAlpha = +$event.target.value" min="0" max="100" step="5" class="range-slider" />
          </view>
          <text class="s-val">{{ subtitleStyle.backAlpha }}%</text>
        </view>
      </view>

      <view class="style-section">
        <text class="style-section-title">位置</text>
        <view class="style-row">
          <text class="s-label">水平</text>
          <view class="range-wrap">
            <input type="range" :value="subtitleStyle.posX" @input="subtitleStyle.posX = +$event.target.value" min="0" max="100" step="1" class="range-slider" />
          </view>
          <text class="s-val">{{ subtitleStyle.posX }}%</text>
        </view>
        <view class="style-row">
          <text class="s-label">垂直</text>
          <view class="range-wrap">
            <input type="range" :value="subtitleStyle.posY" @input="subtitleStyle.posY = +$event.target.value" min="0" max="100" step="1" class="range-slider" />
          </view>
          <text class="s-val">{{ subtitleStyle.posY }}%</text>
        </view>
      </view>

      <view class="style-section" v-if="subtitleText">
        <text class="style-section-title">字幕预览</text>
        <view class="subtitle-preview-box">
          <view class="subtitle-preview-text" :style="previewStyle">
            {{ previewText }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="activeTab === 'cover'" class="tab-content">
      <view class="form-group">
        <text class="form-label">封面文字</text>
        <input v-model="coverText" class="form-input" placeholder="输入封面文字" />
      </view>
      <view class="style-section">
        <text class="style-section-title">封面样式</text>
        <view class="style-row">
          <text class="s-label">字号</text>
          <view class="range-wrap">
            <input type="range" :value="coverStyle.fontSize" @input="coverStyle.fontSize = +$event.target.value" min="12" max="60" step="2" class="range-slider" />
          </view>
          <text class="s-val">{{ coverStyle.fontSize }}px</text>
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
          <view class="range-wrap">
            <input type="range" :value="coverStyle.outlineWidth" @input="coverStyle.outlineWidth = +$event.target.value" min="0" max="6" step="1" class="range-slider" />
          </view>
          <text class="s-val">{{ coverStyle.outlineWidth }}px</text>
        </view>
      </view>
      <button class="action-btn secondary" @tap="handleGenerateCover" :disabled="!videoPath">
        生成封面
      </button>
    </view>

    <button class="action-btn" @tap="handleCompose" :disabled="!videoPath" style="margin-top: 20rpx;">
      剪辑生成
    </button>

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
          <input
            type="text"
            class="custom-color-input"
            v-model="currentPickerValue"
            placeholder="#FFFFFF"
            @input="onCustomColorInput"
          />
        </view>
        <view class="picker-actions">
          <view class="picker-btn cancel" @tap="closeColorPicker">
            <text class="picker-btn-text">取消</text>
          </view>
          <view class="picker-btn confirm" @tap="confirmColor">
            <text class="picker-btn-text confirm-text">确定</text>
          </view>
        </view>
      </view>
    </view>

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
import { ref, reactive, computed } from 'vue'
import api, { uploadFile } from '../api/index.js'

const props = defineProps({ videoPath: { type: String, default: '' } })
const emit = defineEmits(['video-composed', 'start-task'])

const activeTab = ref('subtitle')
const subtitleText = ref('')
const alignedSubtitles = ref([])
const coverText = ref('')
const showColorPickerPanel = ref(false)
const showFontPicker = ref(false)
const currentPickerTarget = ref('')
const currentPickerValue = ref('')

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
  fontColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 3
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

const currentFontLabel = computed(() => {
  const f = fontOptions.find(o => o.value === subtitleStyle.fontName)
  return f ? f.label : subtitleStyle.fontName
})

const previewText = computed(() => {
  if (!subtitleText.value) return ''
  const lines = subtitleText.value.split('\n').filter(l => l.trim())
  return lines[0] || ''
})

const previewStyle = computed(() => {
  const s = {
    fontSize: subtitleStyle.fontSize + 'px',
    fontFamily: subtitleStyle.fontName,
    color: subtitleStyle.fontColor,
    left: subtitleStyle.posX + '%',
    top: subtitleStyle.posY + '%',
    transform: 'translate(-50%, -50%)'
  }
  const ow = subtitleStyle.outlineWidth || 0
  if (ow > 0) {
    const shadows = []
    for (let dx = -ow; dx <= ow; dx++) {
      for (let dy = -ow; dy <= ow; dy++) {
        if (dx === 0 && dy === 0) continue
        shadows.push(`${dx}px ${dy}px 0 ${subtitleStyle.outlineColor}`)
      }
    }
    s.textShadow = shadows.join(', ')
  }
  if (subtitleStyle.backColor) {
    s.backgroundColor = subtitleStyle.backColor
    s.opacity = subtitleStyle.backAlpha / 100
    s.padding = '2px 8px'
    s.borderRadius = '4px'
  }
  return s
})

const presetColors = [
  '#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333', '#000000',
  '#FF0000', '#FF4444', '#FF6600', '#FF9900', '#FFCC00', '#FFFF00',
  '#00FF00', '#00CC00', '#009933', '#006633', '#003366', '#0000FF',
  '#3333FF', '#6600CC', '#9900CC', '#CC00CC', '#FF00FF', '#FF66CC',
  '#FFCCCC', '#FFE0CC', '#FFFFCC', '#CCFFCC', '#CCE5FF', '#E0CCFF'
]

function openColorPicker(target) {
  currentPickerTarget.value = target
  if (target === 'fontColor') currentPickerValue.value = subtitleStyle.fontColor
  else if (target === 'outlineColor') currentPickerValue.value = subtitleStyle.outlineColor
  else if (target === 'backColor') currentPickerValue.value = subtitleStyle.backColor
  else if (target === 'coverFontColor') currentPickerValue.value = coverStyle.fontColor
  else if (target === 'coverOutlineColor') currentPickerValue.value = coverStyle.outlineColor
  showColorPickerPanel.value = true
}

function closeColorPicker() {
  showColorPickerPanel.value = false
}

function selectPresetColor(c) {
  currentPickerValue.value = c
}

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

async function handleAISubtitle() {
  if (!props.videoPath) return
  emit('start-task', 'AI字幕生成', async () => {
    const user = getUserId()
    const result = await api.post('/clips/ai-generate-subtitle', { videoPath: props.videoPath, userId: user?.id })
    if (result.subtitles && Array.isArray(result.subtitles)) {
      alignedSubtitles.value = result.subtitles
      subtitleText.value = result.subtitles.map(s => s.text).join('\n')
    } else if (result.text) { subtitleText.value = result.text }
    return { success: true, message: '字幕生成成功' }
  })
}

async function handleGenerateCover() {
  if (!props.videoPath) return
  emit('start-task', '封面生成', async () => {
    await api.post('/clips/generate-cover', {
      framePath: props.videoPath,
      text: coverText.value,
      style: {
        fontSize: coverStyle.fontSize,
        fontColor: coverStyle.fontColor,
        outlineColor: coverStyle.outlineColor,
        outlineWidth: coverStyle.outlineWidth
      }
    })
    return { success: true, message: '封面生成成功' }
  })
}

async function handleCompose() {
  if (!props.videoPath) return
  emit('start-task', '剪辑合成', async () => {
    const user = getUserId()
    const result = await uploadFile('/clips/compose', props.videoPath, 'video', {
      videoPath: props.videoPath,
      subtitles: JSON.stringify(alignedSubtitles.value),
      subtitleStyle: JSON.stringify({
        fontSize: subtitleStyle.fontSize,
        fontName: subtitleStyle.fontName,
        fontColor: subtitleStyle.fontColor,
        outlineColor: subtitleStyle.outlineColor,
        outlineWidth: subtitleStyle.outlineWidth,
        backColor: subtitleStyle.backColor,
        backAlpha: subtitleStyle.backAlpha,
        posX: subtitleStyle.posX,
        posY: subtitleStyle.posY
      }),
      coverText: coverText.value,
      userId: user?.id
    })
    if (result.success || result.videoUrl) {
      emit('video-composed', result.videoUrl || props.videoPath)
      return { success: true, message: '剪辑合成完成' }
    }
    return { success: false, message: '剪辑合成失败' }
  })
}
</script>

<style scoped>
.video-clip { width: 100%; max-width: 100%; overflow: hidden; box-sizing: border-box; }
.video-info { padding: 16rpx 24rpx; background: rgba(102,126,234,0.1); border-radius: 12rpx; margin-bottom: 20rpx; }
.video-info-text { font-size: 24rpx; color: #667eea; }
.empty-hint { padding: 24rpx; text-align: center; margin-bottom: 20rpx; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.clip-tabs { display: flex; margin-bottom: 20rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; overflow: hidden; }
.clip-tab { flex: 1; text-align: center; padding: 16rpx 0; }
.clip-tab.active { background: rgba(102,126,234,0.2); }
.clip-tab-text { font-size: 26rpx; color: rgba(255,255,255,0.5); }
.clip-tab.active .clip-tab-text { color: #667eea; font-weight: 600; }
.tab-content { width: 100%; max-width: 100%; overflow: hidden; box-sizing: border-box; }
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
.style-row { display: flex; align-items: center; margin-bottom: 16rpx; min-height: 60rpx; }
.style-row:last-child { margin-bottom: 0; }
.s-label { font-size: 24rpx; color: rgba(255,255,255,0.6); min-width: 80rpx; flex-shrink: 0; }
.s-val { font-size: 22rpx; color: rgba(255,255,255,0.5); min-width: 72rpx; text-align: right; flex-shrink: 0; }
.range-wrap { flex: 1; margin: 0 12rpx; min-width: 0; }
.range-slider { width: 100%; height: 40rpx; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.1); border-radius: 20rpx; outline: none; }
.range-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 36rpx; height: 36rpx; border-radius: 50%; background: #667eea; cursor: pointer; border: 4rpx solid #fff; box-shadow: 0 2rpx 12rpx rgba(102,126,234,0.5); }

.color-preview-area { display: flex; align-items: center; gap: 16rpx; flex: 1; min-width: 0; padding: 8rpx 16rpx; background: rgba(255,255,255,0.06); border-radius: 12rpx; border: 1rpx solid rgba(255,255,255,0.1); }
.color-swatch-lg { width: 48rpx; height: 48rpx; border-radius: 10rpx; border: 2rpx solid rgba(255,255,255,0.3); flex-shrink: 0; }
.color-hex-text { font-size: 24rpx; color: rgba(255,255,255,0.8); }

.font-picker { display: flex; align-items: center; justify-content: space-between; flex: 1; padding: 8rpx 16rpx; background: rgba(255,255,255,0.06); border-radius: 12rpx; border: 1rpx solid rgba(255,255,255,0.1); }
.font-picker-text { font-size: 24rpx; color: rgba(255,255,255,0.8); }
.font-picker-arrow { font-size: 20rpx; color: rgba(255,255,255,0.4); }

.subtitle-preview-box { position: relative; width: 100%; height: 240rpx; background: #000; border-radius: 12rpx; overflow: hidden; }
.subtitle-preview-text { position: absolute; white-space: nowrap; font-weight: 500; }

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
</style>

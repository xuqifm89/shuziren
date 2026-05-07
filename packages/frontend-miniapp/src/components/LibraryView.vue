<template>
  <view class="library-view">
    <view class="lib-header">
      <text class="lib-back" @tap="emit('back')">← 返回</text>
      <text class="lib-title">{{ config.name }}</text>
      <view class="lib-add-btn" @tap="showAddForm = true">
        <text class="lib-add-text">添加</text>
      </view>
    </view>

    <view class="lib-search">
      <input v-model="searchKeyword" class="search-input" placeholder="搜索..." />
    </view>

    <scroll-view scroll-y class="lib-list">
      <view class="lib-item" v-for="item in filteredList" :key="item.id">
        <view class="item-main" @tap="handlePreview(item)">
          <view v-if="isAudioType" class="item-preview audio-preview" @tap.stop="toggleAudio(item)">
            <text class="preview-icon">{{ playingItemId === item.id ? '⏸' : '🔊' }}</text>
          </view>
          <view v-else-if="config.type === 'portraitLibrary'" class="item-preview">
            <image v-if="getPortraitImageUrl(item)" :src="getPortraitImageUrl(item)" class="preview-img" mode="aspectFill" />
            <text v-else class="preview-icon">👤</text>
          </view>
          <view v-else-if="config.type === 'workLibrary'" class="item-preview video-preview">
            <text class="preview-icon">🎬</text>
            <text class="play-badge">▶</text>
          </view>
          <view v-else class="item-preview text-preview" @tap.stop="previewText(item)">
            <text class="preview-icon">📄</text>
          </view>
          <view class="item-info">
            <text class="item-name">{{ item.fileName || item.title || item.name || '未命名' }}</text>
            <text class="item-meta">{{ getItemMeta(item) }}</text>
          </view>
        </view>
        <view class="item-actions">
          <text v-if="playingItemId === item.id" class="action-stop" @tap.stop="stopAudio">停止</text>
          <text class="action-edit" @tap.stop="editItem = item; showAddForm = true">编辑</text>
          <text class="action-delete" @tap.stop="handleDelete(item)">删除</text>
        </view>
      </view>
      <view v-if="filteredList.length === 0" class="empty-state">
        <text class="empty-text">暂无数据</text>
      </view>
    </scroll-view>

    <view v-if="showPreviewModal" class="modal-mask" @tap.self="closePreviewModal">
      <view class="preview-modal-content">
        <view class="preview-modal-header">
          <text class="preview-modal-title">{{ previewModalTitle }}</text>
          <text class="preview-modal-close" @tap="closePreviewModal">✕</text>
        </view>
        <scroll-view scroll-y class="preview-modal-body">
          <text class="preview-modal-text">{{ previewModalContent }}</text>
        </scroll-view>
      </view>
    </view>

    <view v-if="showVideoModal" class="modal-mask" @tap.self="closeVideoModal">
      <view class="video-modal-content">
        <view class="video-modal-header">
          <text class="video-modal-title">{{ videoModalTitle }}</text>
          <text class="video-modal-close" @tap="closeVideoModal">✕</text>
        </view>
        <video
          :src="videoModalUrl"
          class="video-modal-player"
          controls
          autoplay
          show-fullscreen-btn
          show-play-btn
          object-fit="contain"
        />
      </view>
    </view>

    <view v-if="showAddForm" class="modal-mask" @tap.self="closeForm">
      <view class="modal-content">
        <text class="modal-title">{{ editItem ? '编辑' : '添加' }}{{ config.name }}</text>
        <view v-for="field in config.formFields" :key="field.key" class="form-group">
          <text class="form-label">{{ field.label }}</text>
          <textarea v-if="field.type === 'textarea'" v-model="formData[field.key]" class="form-textarea" :placeholder="field.placeholder || ''" />
          <input v-else-if="field.type === 'text'" v-model="formData[field.key]" class="form-input" :placeholder="field.placeholder || ''" />
          <view v-else-if="field.type === 'select'" class="select-row">
            <view v-for="opt in field.options" :key="opt.value" :class="['select-option', formData[field.key] === opt.value ? 'active' : '']" @tap="formData[field.key] = opt.value">
              <text>{{ opt.label }}</text>
            </view>
          </view>
          <view v-else-if="field.type === 'switch'" class="switch-row" @tap="formData[field.key] = !formData[field.key]">
            <text :class="['switch-state', formData[field.key] ? 'on' : '']">{{ formData[field.key] ? '公开' : '私有' }}</text>
          </view>
          <view v-else-if="field.type === 'file'" class="file-upload" @tap="handleFileUpload(field)">
            <text class="upload-text">{{ formData[field.key] ? '已选择文件' : '选择文件' }}</text>
          </view>
        </view>
        <view class="modal-actions">
          <view class="modal-btn cancel" @tap="closeForm"><text class="btn-text">取消</text></view>
          <view class="modal-btn confirm" @tap="handleSave"><text class="btn-text">保存</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import api, { uploadFile } from '../api/index.js'
import { resolveMediaUrl } from '../utils/media.js'

const props = defineProps({ libraryKey: { type: String, required: true } })
const emit = defineEmits(['back'])

const LIBRARY_CONFIG = {
  voiceLibrary: { name: '音色库', apiPath: '/voice-library', type: 'voiceLibrary', formFields: [
    { key: 'fileName', label: '文件名', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'isPublic', label: '公开', type: 'switch' },
    { key: 'file', label: '音频文件', type: 'file', accept: 'audio' }
  ]},
  portraitLibrary: { name: '肖像库', apiPath: '/portrait-library', type: 'portraitLibrary', formFields: [
    { key: 'fileName', label: '文件名', type: 'text' },
    { key: 'type', label: '类型', type: 'select', options: [{ label: '图片', value: 'image' }, { label: '视频', value: 'video' }] },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'isPublic', label: '公开', type: 'switch' },
    { key: 'file', label: '文件', type: 'file', accept: 'image' }
  ]},
  promptLibrary: { name: '提示词库', apiPath: '/prompt-library', type: 'promptLibrary', formFields: [
    { key: 'prompt', label: '提示词', type: 'textarea' },
    { key: 'category', label: '分类', type: 'text' },
    { key: 'modelType', label: '模型类型', type: 'text' },
    { key: 'isPublic', label: '公开', type: 'switch' }
  ]},
  workLibrary: { name: '作品库', apiPath: '/work-library', type: 'workLibrary', formFields: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'category', label: '分类', type: 'text' },
    { key: 'isPublic', label: '公开', type: 'switch' }
  ]},
  musicLibrary: { name: '音乐库', apiPath: '/music-library', type: 'musicLibrary', formFields: [
    { key: 'fileName', label: '文件名', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'isPublic', label: '公开', type: 'switch' },
    { key: 'file', label: '音频文件', type: 'file', accept: 'audio' }
  ]},
  copyLibrary: { name: '文案库', apiPath: '/copy-library', type: 'copyLibrary', formFields: [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'content', label: '内容', type: 'textarea' },
    { key: 'category', label: '分类', type: 'text' },
    { key: 'isPublic', label: '公开', type: 'switch' }
  ]},
  dubbingLibrary: { name: '配音库', apiPath: '/dubbing-library', type: 'dubbingLibrary', formFields: [
    { key: 'fileName', label: '文件名', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'isPublic', label: '公开', type: 'switch' },
    { key: 'file', label: '音频文件', type: 'file', accept: 'audio' }
  ]}
}

const config = computed(() => LIBRARY_CONFIG[props.libraryKey] || {})
const items = ref([])
const searchKeyword = ref('')
const showAddForm = ref(false)
const editItem = ref(null)
const formData = ref({})
const tempFilePath = ref('')

const isAudioType = computed(() => {
  const t = config.value.type
  return t === 'voiceLibrary' || t === 'dubbingLibrary' || t === 'musicLibrary'
})

const playingItemId = ref(null)
let audioContext = null

const showPreviewModal = ref(false)
const previewModalTitle = ref('')
const previewModalContent = ref('')

const showVideoModal = ref(false)
const videoModalTitle = ref('')
const videoModalUrl = ref('')

const filteredList = computed(() => {
  if (!searchKeyword.value) return items.value
  const kw = searchKeyword.value.toLowerCase()
  return items.value.filter(item => {
    const name = (item.fileName || item.title || item.name || '').toLowerCase()
    return name?.includes(kw) ?? false
  })
})

function getUserId() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

function resolveUrl(path) { return resolveMediaUrl(path) }

function getPortraitImageUrl(item) {
  const filePath = item.filePath || item.fileUrl || item.imageUrl || ''
  if (!filePath) return ''
  if (/\.(mp4|mov|webm|avi)/i.test(filePath)) return ''
  return resolveUrl(filePath)
}

function getItemMeta(item) {
  const parts = []
  if (item.fileSize) parts.push(`${(item.fileSize / 1024).toFixed(0)}KB`)
  if (item.duration) parts.push(`${item.duration.toFixed(1)}s`)
  if (item.category) parts.push(item.category)
  if (item.isPublic) parts.push('公开')
  if (config.value.type === 'portraitLibrary' && (item.filePath || item.fileUrl)) {
    const fp = item.filePath || item.fileUrl || ''
    if (/\.(mp4|mov|webm)/i.test(fp)) parts.push('视频')
    else if (/\.(jpg|jpeg|png|gif|webp)/i.test(fp)) parts.push('图片')
  }
  return parts.join(' · ') || ''
}

async function fetchItems() {
  if (!config.value.apiPath) return
  try {
    const user = getUserId()
    const result = await api.get(config.value.apiPath, user?.id ? { userId: user.id } : {})
    items.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
  } catch (err) { items.value = [] }
}

function toggleAudio(item) {
  if (playingItemId.value === item.id) {
    stopAudio()
    return
  }
  stopAudio()
  const url = resolveUrl(item.filePath || item.fileUrl || item.audioUrl)
  if (!url) return
  audioContext = uni.createInnerAudioContext()
  audioContext.src = url
  audioContext.onPlay(() => { playingItemId.value = item.id })
  audioContext.onEnded(() => { playingItemId.value = null })
  audioContext.onError(() => { playingItemId.value = null; uni.showToast({ title: '播放失败', icon: 'none' }) })
  audioContext.onStop(() => { playingItemId.value = null })
  audioContext.play()
}

function stopAudio() {
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
  playingItemId.value = null
}

function handlePreview(item) {
  const t = config.value.type
  if (t === 'voiceLibrary' || t === 'dubbingLibrary' || t === 'musicLibrary') {
    toggleAudio(item)
    return
  }
  if (t === 'portraitLibrary') {
    const filePath = item.filePath || item.fileUrl || item.imageUrl || ''
    if (/\.(mp4|mov|webm)/i.test(filePath)) {
      videoModalTitle.value = item.fileName || item.title || item.name || '视频预览'
      videoModalUrl.value = resolveUrl(filePath)
      showVideoModal.value = true
      return
    }
    if (/\.(jpg|jpeg|png|gif|webp)/i.test(filePath)) {
      uni.previewImage({ urls: [resolveUrl(filePath)], current: resolveUrl(filePath) })
      return
    }
    return
  }
  if (t === 'workLibrary') {
    const filePath = item.filePath || item.fileUrl || item.videoPath || ''
    if (filePath) {
      videoModalTitle.value = item.title || item.fileName || item.name || '视频预览'
      videoModalUrl.value = resolveUrl(filePath)
      showVideoModal.value = true
    }
    return
  }
  if (t === 'copyLibrary' || t === 'promptLibrary') {
    previewText(item)
    return
  }
}

function previewText(item) {
  const title = item.title || item.fileName || item.name || '预览'
  const content = item.content || item.prompt || item.description || item.text || ''
  if (!content) {
    uni.showToast({ title: '暂无内容', icon: 'none' })
    return
  }
  previewModalTitle.value = title
  previewModalContent.value = content
  showPreviewModal.value = true
}

function closePreviewModal() {
  showPreviewModal.value = false
}

function closeVideoModal() {
  showVideoModal.value = false
}

async function handleFileUpload(field) {
  if (field.accept === 'audio') {
    uni.chooseMessageFile({
      count: 1, type: 'file',
      success: (res) => { tempFilePath.value = res.tempFiles[0].path; formData.value[field.key] = res.tempFiles[0].name }
    })
  } else {
    uni.chooseImage({
      count: 1, sizeType: ['compressed'],
      success: (res) => { tempFilePath.value = res.tempFilePaths[0]; formData.value[field.key] = '已选择图片' }
    })
  }
}

async function handleSave() {
  try {
    const user = getUserId()
    const data = { ...formData.value, userId: user?.id }
    if (editItem.value) {
      await api.put(`${config.value.apiPath}/${editItem.value.id}`, data)
    } else {
      if (tempFilePath.value) {
        const uploadResult = await uploadFile(`${config.value.apiPath}/upload`, tempFilePath.value, config.value.type === 'portraitLibrary' ? 'image' : 'audio', data)
        if (uploadResult) Object.assign(data, uploadResult)
      }
      await api.post(config.value.apiPath, data)
    }
    uni.showToast({ title: '保存成功', icon: 'success' })
    closeForm()
    await fetchItems()
  } catch (err) { uni.showToast({ title: err.message || '保存失败', icon: 'none' }) }
}

function handleDelete(item) {
  uni.showModal({
    title: '确认删除', content: `确定删除 "${item.fileName || item.title || item.name || '此项'}" 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try { await api.delete(`${config.value.apiPath}/${item.id}`); await fetchItems(); uni.showToast({ title: '已删除', icon: 'success' }) }
        catch (err) { uni.showToast({ title: '删除失败', icon: 'none' }) }
      }
    }
  })
}

function closeForm() {
  showAddForm.value = false; editItem.value = null; formData.value = {}; tempFilePath.value = ''
}

watch(showAddForm, (val) => {
  if (val && editItem.value) {
    const data = {}
    config.value.formFields?.forEach(f => { data[f.key] = editItem.value[f.key] || (f.type === 'switch' ? false : '') })
    formData.value = data
  } else if (val) {
    const data = {}
    config.value.formFields?.forEach(f => { data[f.key] = f.type === 'switch' ? false : '' })
    formData.value = data
  }
})

watch(() => props.libraryKey, () => { stopAudio(); fetchItems() }, { immediate: true })

onUnmounted(() => { stopAudio() })
</script>

<style scoped>
.library-view { width: 100%; display: flex; flex-direction: column; height: 100%; }
.lib-header { display: flex; align-items: center; gap: 16rpx; padding: 24rpx 32rpx; background: rgba(20,20,40,0.95); border-bottom: 1rpx solid rgba(255,255,255,0.1); }
.lib-back { font-size: 28rpx; color: #667eea; padding: 8rpx 16rpx; }
.lib-title { flex: 1; font-size: 32rpx; font-weight: 600; color: #fff; }
.lib-add-btn { padding: 12rpx 24rpx; background: linear-gradient(135deg,#667eea,#764ba2); border-radius: 12rpx; }
.lib-add-text { font-size: 26rpx; color: #fff; font-weight: 600; }
.lib-search { padding: 16rpx 32rpx; }
.search-input { width: 100%; height: 64rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.1); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.lib-list { flex: 1; padding: 0 32rpx; }
.lib-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; background: rgba(30,30,60,0.7); border: 1rpx solid rgba(102,126,234,0.2); border-radius: 16rpx; margin-bottom: 12rpx; }
.item-main { display: flex; align-items: center; gap: 16rpx; flex: 1; min-width: 0; }
.item-preview { width: 72rpx; height: 72rpx; border-radius: 12rpx; background: rgba(102,126,234,0.1); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.audio-preview { background: rgba(102,126,234,0.2); cursor: pointer; }
.video-preview { position: relative; background: rgba(0,0,0,0.3); }
.play-badge { position: absolute; bottom: 4rpx; right: 4rpx; font-size: 18rpx; color: #fff; background: rgba(102,126,234,0.8); border-radius: 50%; width: 28rpx; height: 28rpx; display: flex; align-items: center; justify-content: center; }
.text-preview { cursor: pointer; }
.preview-icon { font-size: 32rpx; }
.preview-img { width: 72rpx; height: 72rpx; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 26rpx; color: rgba(255,255,255,0.9); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-meta { font-size: 22rpx; color: rgba(255,255,255,0.4); display: block; margin-top: 4rpx; }
.item-actions { display: flex; gap: 16rpx; flex-shrink: 0; }
.action-stop { font-size: 24rpx; color: #e6a23c; padding: 8rpx 16rpx; background: rgba(230,162,60,0.1); border-radius: 8rpx; }
.action-edit { font-size: 24rpx; color: #667eea; padding: 8rpx 16rpx; }
.action-delete { font-size: 24rpx; color: #f56c6c; padding: 8rpx 16rpx; }
.empty-state { padding: 80rpx 0; text-align: center; }
.empty-text { font-size: 28rpx; color: rgba(255,255,255,0.3); }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 999; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 85%; max-width: 600rpx; background: rgba(26,26,46,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; padding: 40rpx; max-height: 80vh; overflow-y: auto; }
.modal-title { font-size: 32rpx; color: #fff; font-weight: 600; margin-bottom: 30rpx; text-align: center; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.form-textarea { width: 100%; height: 180rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.select-row { display: flex; gap: 12rpx; }
.select-option { padding: 12rpx 24rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.1); border-radius: 8rpx; font-size: 24rpx; color: rgba(255,255,255,0.7); }
.select-option.active { background: rgba(102,126,234,0.2); border-color: rgba(102,126,234,0.5); color: #667eea; }
.switch-row { padding: 16rpx 0; }
.switch-state { font-size: 26rpx; color: rgba(255,255,255,0.5); padding: 8rpx 20rpx; background: rgba(255,255,255,0.06); border-radius: 8rpx; }
.switch-state.on { color: #67c23a; background: rgba(103,194,58,0.15); }
.file-upload { padding: 20rpx; background: rgba(255,255,255,0.06); border: 1rpx dashed rgba(102,126,234,0.4); border-radius: 12rpx; text-align: center; }
.upload-text { font-size: 26rpx; color: rgba(255,255,255,0.6); }
.modal-actions { display: flex; gap: 20rpx; margin-top: 30rpx; }
.modal-btn { flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; }
.modal-btn.cancel { background: rgba(255,255,255,0.08); }
.modal-btn.confirm { background: linear-gradient(135deg,#667eea,#764ba2); }
.btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }
.preview-modal-content { width: 90%; max-width: 650rpx; background: rgba(26,26,46,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; padding: 0; max-height: 80vh; display: flex; flex-direction: column; }
.preview-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 30rpx 36rpx 20rpx; border-bottom: 1rpx solid rgba(255,255,255,0.08); }
.preview-modal-title { font-size: 30rpx; color: #fff; font-weight: 600; flex: 1; }
.preview-modal-close { font-size: 36rpx; color: rgba(255,255,255,0.5); padding: 8rpx 16rpx; }
.preview-modal-body { padding: 30rpx 36rpx; max-height: 60vh; }
.preview-modal-text { font-size: 28rpx; color: rgba(255,255,255,0.85); line-height: 1.8; white-space: pre-wrap; word-break: break-all; }
.video-modal-content { width: 92%; max-width: 700rpx; background: rgba(26,26,46,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; padding: 0; max-height: 85vh; display: flex; flex-direction: column; }
.video-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 30rpx 16rpx; }
.video-modal-title { font-size: 28rpx; color: #fff; font-weight: 600; flex: 1; }
.video-modal-close { font-size: 36rpx; color: rgba(255,255,255,0.5); padding: 8rpx 16rpx; }
.video-modal-player { width: 100%; height: 420rpx; border-radius: 0 0 24rpx 24rpx; }
</style>

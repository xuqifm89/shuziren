<template>
  <view class="audio-to-text">
    <view class="tab-bar">
      <view :class="['tab-item', activeTab === 'extract' ? 'active' : '']" @tap="activeTab = 'extract'">
        <text class="tab-text">提取</text>
      </view>
      <view :class="['tab-item', activeTab === 'creative' ? 'active' : '']" @tap="activeTab = 'creative'">
        <text class="tab-text">创意</text>
      </view>
      <view :class="['tab-item', activeTab === 'import' ? 'active' : '']" @tap="activeTab = 'import'">
        <text class="tab-text">导入</text>
      </view>
    </view>

    <view v-if="activeTab === 'extract'" class="tab-content">
      <view class="form-group">
        <text class="form-label">视频链接</text>
        <input v-model="extractUrl" class="form-input" placeholder="粘贴抖音/快手等视频链接" />
      </view>
      <button class="action-btn" @tap="handleExtract" :loading="isExtracting" :disabled="isExtracting">
        {{ isExtracting ? '提取中...' : '文案提取' }}
      </button>
    </view>

    <view v-if="activeTab === 'creative'" class="tab-content">
      <view class="form-group">
        <text class="form-label">创意提示词</text>
        <textarea v-model="creativePrompt" class="form-textarea" placeholder="输入创意提示词..." />
      </view>
      <button class="action-btn" @tap="handleGenerate" :loading="isGenerating" :disabled="isGenerating">
        {{ isGenerating ? '生成中...' : '确认' }}
      </button>
    </view>

    <view v-if="activeTab === 'import'" class="tab-content">
      <button class="action-btn" @tap="loadCopyLibrary">导入文案</button>
      <view v-if="showCopyLib" class="copy-lib-list">
        <view class="copy-lib-item" v-for="item in copyList" :key="item.id" @tap="selectCopy(item)">
          <text class="copy-lib-title">{{ item.title }}</text>
          <text class="copy-lib-content">{{ item.content }}</text>
        </view>
        <view v-if="copyList.length === 0" class="empty-hint">
          <text class="empty-text">暂无文案</text>
        </view>
      </view>
    </view>

    <view v-if="generatedText" class="result-section">
      <view class="result-header">
        <text class="result-label">原始文案</text>
        <view class="result-btns">
          <text class="result-btn" @tap="saveToLib(generatedText)">加到文案库</text>
          <text :class="['result-btn', selectedSource === 'generated' ? 'selected' : '']" @tap="toggleSource('generated')">使用此文案</text>
        </view>
      </view>
      <textarea v-model="generatedText" class="result-textarea" auto-height />
    </view>

    <view v-if="processedText" class="result-section">
      <view class="result-header">
        <text class="result-label">处理后文案</text>
        <view class="result-btns">
          <text class="result-btn" @tap="handleOptimize">文案优化</text>
          <text class="result-btn" @tap="handleCheckViolation">违禁检测</text>
          <text class="result-btn" @tap="saveToLib(processedText)">加到文案库</text>
          <text :class="['result-btn', selectedSource === 'processed' ? 'selected' : '']" @tap="toggleSource('processed')">使用此文案</text>
        </view>
      </view>
      <textarea v-model="processedText" class="result-textarea" auto-height />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api/index.js'

const emit = defineEmits(['text-generated', 'start-task'])

const activeTab = ref('extract')
const extractUrl = ref('')
const creativePrompt = ref('')
const generatedText = ref('')
const processedText = ref('')
const selectedSource = ref(null)
const isExtracting = ref(false)
const isGenerating = ref(false)
const showCopyLib = ref(false)
const copyList = ref([])

function getUserId() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) { try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {} }
  return null
}

async function handleExtract() {
  if (!extractUrl.value) { uni.showToast({ title: '请输入视频链接', icon: 'none' }); return }
  emit('start-task', '文案提取', async () => {
    const result = await api.post('/text/extract-from-video', { url: extractUrl.value, modelType: 'cloud', asrModel: 'qwen' })
    const text = result.text || result.content || result.data?.text || ''
    if (text) {
      generatedText.value = text; processedText.value = ''; selectedSource.value = 'generated'
      emit('text-generated', text)
      return { success: true, message: '文案提取成功' }
    }
    return { success: false, message: '未获取到文案' }
  })
}

async function handleGenerate() {
  if (!creativePrompt.value) { uni.showToast({ title: '请输入创意提示词', icon: 'none' }); return }
  emit('start-task', 'AI文案生成', async () => {
    const result = await api.post('/text/generate', {
      prompt: creativePrompt.value, systemPrompt: '你是一个专业的短视频文案创作者',
      model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
    })
    const text = result.text || result.content || result.data?.text || result.generatedText || ''
    if (text) {
      generatedText.value = text; processedText.value = ''; selectedSource.value = 'generated'
      emit('text-generated', text)
      return { success: true, message: '文案生成成功' }
    }
    return { success: false, message: '未获取到文案' }
  })
}

async function loadCopyLibrary() {
  showCopyLib.value = !showCopyLib.value
  if (showCopyLib.value) {
    try {
      const user = getUserId()
      const result = await api.get('/copy-library', user?.id ? { userId: user.id } : {})
      copyList.value = Array.isArray(result) ? result : (result?.list || result?.data || [])
    } catch (e) { copyList.value = [] }
  }
}

function selectCopy(item) {
  generatedText.value = item.content || ''; processedText.value = ''; selectedSource.value = 'generated'
  emit('text-generated', item.content || ''); showCopyLib.value = false
}

function toggleSource(source) {
  if (selectedSource.value === source) { selectedSource.value = null }
  else { selectedSource.value = source; emit('text-generated', source === 'generated' ? generatedText.value : processedText.value) }
}

async function handleOptimize() {
  if (!generatedText.value) return
  emit('start-task', '文案优化', async () => {
    const result = await api.post('/text/rewrite', { text: generatedText.value, prompt: '优化改写以下文案，使其更加生动吸引人', modelType: 'cloud' })
    processedText.value = result.text || result.content || result.data?.text || result.rewrittenText || ''
    return { success: true, message: '文案优化完成' }
  })
}

async function handleCheckViolation() {
  const checkText = processedText.value || generatedText.value
  if (!checkText) return
  emit('start-task', '违禁检测', async () => {
    const result = await api.post('/text/generate', {
      prompt: `请审核以下文案是否包含违禁内容：\n${checkText}`,
      systemPrompt: '你是一个内容审核员，负责检测文案中的违禁词和敏感内容',
      model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
    })
    const checkResult = result.text || result.content || '检测完成'
    return { success: true, message: `违禁检测结果：${checkResult}` }
  })
}

async function saveToLib(text) {
  if (!text) return
  try {
    const user = getUserId()
    await api.post('/copy-library', { title: text.substring(0, 20) + '...', content: text, category: '通用', isPublic: false, userId: user?.id })
    uni.showToast({ title: '已加入文案库', icon: 'success' })
  } catch (err) { uni.showToast({ title: '保存失败', icon: 'none' }) }
}
</script>

<style scoped>
.audio-to-text { width: 100%; }
.tab-bar { display: flex; margin-bottom: 24rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; overflow: hidden; }
.tab-item { flex: 1; text-align: center; padding: 16rpx 0; }
.tab-item.active { background: rgba(102,126,234,0.2); }
.tab-text { font-size: 26rpx; color: rgba(255,255,255,0.5); }
.tab-item.active .tab-text { color: #667eea; font-weight: 600; }
.tab-content { margin-bottom: 20rpx; }
.form-group { margin-bottom: 20rpx; }
.form-label { display: block; font-size: 24rpx; color: rgba(255,255,255,0.6); margin-bottom: 12rpx; }
.form-input { width: 100%; height: 72rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.form-textarea { width: 100%; height: 180rpx; background: rgba(255,255,255,0.06); border: 1rpx solid rgba(255,255,255,0.12); border-radius: 12rpx; padding: 20rpx; font-size: 26rpx; color: #fff; box-sizing: border-box; }
.action-btn { width: 100%; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.action-btn[disabled] { opacity: 0.5; }
.copy-lib-list { margin-top: 16rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; overflow: hidden; }
.copy-lib-item { padding: 20rpx; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.copy-lib-title { font-size: 26rpx; color: rgba(255,255,255,0.9); display: block; margin-bottom: 4rpx; }
.copy-lib-content { font-size: 22rpx; color: rgba(255,255,255,0.5); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-hint { padding: 24rpx; text-align: center; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.result-section { margin-top: 20rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; padding: 20rpx; border: 1rpx solid rgba(102,126,234,0.2); }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.result-label { font-size: 24rpx; color: #667eea; font-weight: 600; }
.result-btns { display: flex; gap: 16rpx; flex-wrap: wrap; }
.result-btn { font-size: 22rpx; color: rgba(255,255,255,0.6); padding: 4rpx 12rpx; background: rgba(255,255,255,0.06); border-radius: 6rpx; }
.result-btn.selected { color: #667eea; background: rgba(102,126,234,0.2); }
.result-textarea { width: 100%; min-height: 120rpx; background: rgba(255,255,255,0.04); border: 1rpx solid rgba(255,255,255,0.08); border-radius: 8rpx; padding: 16rpx; font-size: 24rpx; color: rgba(255,255,255,0.8); box-sizing: border-box; }
</style>

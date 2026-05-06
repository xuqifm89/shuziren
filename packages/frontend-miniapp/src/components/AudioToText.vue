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
      <view class="platform-row">
        <view class="platform-icons">
          <image class="platform-icon" src="/static/dy.png" mode="aspectFit" />
          <image class="platform-icon" src="/static/ks.png" mode="aspectFit" />
          <image class="platform-icon" src="/static/xhs.png" mode="aspectFit" />
          <image class="platform-icon" src="/static/bz.png" mode="aspectFit" />
        </view>
        <button class="action-btn" @tap="handleExtract" :loading="isExtracting" :disabled="isExtracting">
          {{ isExtracting ? '提取中...' : '文案提取' }}
        </button>
      </view>
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
          <text class="result-btn btn-optimize" @tap="handleOptimize">文案优化</text>
          <text class="result-btn btn-check" @tap="handleCheckViolation">违禁检测</text>
          <text class="result-btn" @tap="saveToLib(generatedText)">加到文案库</text>
          <text :class="['result-btn', selectedSource === 'generated' ? 'selected' : '']" @tap="toggleSource('generated')">使用此文案</text>
        </view>
      </view>
      <textarea v-model="generatedText" class="result-textarea" />
    </view>

    <view v-if="processedText" class="result-section">
      <view class="result-header">
        <text class="result-label">处理后文案</text>
        <view class="result-btns">
          <text class="result-btn" @tap="saveToLib(processedText)">加到文案库</text>
          <text :class="['result-btn', selectedSource === 'processed' ? 'selected' : '']" @tap="toggleSource('processed')">使用此文案</text>
        </view>
      </view>
      <textarea v-model="processedText" class="result-textarea" />
    </view>

    <view v-if="showForbiddenDialog" class="forbidden-overlay" @tap.self="showForbiddenDialog = false">
      <view class="forbidden-dialog">
        <view class="forbidden-dialog-header">
          <text class="forbidden-dialog-title">违禁检测结果</text>
          <text class="forbidden-close-btn" @tap="showForbiddenDialog = false">✕</text>
        </view>
        <view class="forbidden-dialog-body">
          <view v-if="forbiddenAnalysis.loading" class="forbidden-loading">
            <text class="forbidden-loading-text">正在分析中...</text>
          </view>
          <view v-else-if="forbiddenAnalysis.result" class="forbidden-result">
            <view :class="['judgment-bar', forbiddenAnalysis.result.judgmentClass]">
              <text class="judgment-icon">{{ forbiddenAnalysis.result.judgmentIcon }}</text>
              <text class="judgment-text">{{ forbiddenAnalysis.result.overallJudgment }}</text>
            </view>
            <view v-if="forbiddenAnalysis.result.issues && forbiddenAnalysis.result.issues.length > 0" class="issues-list">
              <view class="issues-title">问题列表</view>
              <view class="issue-item" v-for="(issue, index) in forbiddenAnalysis.result.issues" :key="index">
                <view class="issue-header">
                  <text class="issue-index">{{ index + 1 }}.</text>
                  <text :class="['risk-tag', issue.riskLevelType]">{{ issue.riskLevel }}</text>
                </view>
                <text class="issue-text">问题词句：{{ issue.text }}</text>
                <text v-if="issue.description" class="issue-desc">说明：{{ issue.description }}</text>
              </view>
            </view>
            <view v-else class="safe-message">
              <text class="safe-text">文案内容安全，未发现违规内容</text>
            </view>
          </view>
          <view v-else-if="forbiddenAnalysis.error" class="forbidden-error">
            <text class="forbidden-error-text">⚠️ {{ forbiddenAnalysis.error }}</text>
          </view>
        </view>
        <view class="forbidden-dialog-footer">
          <text class="forbidden-footer-btn" @tap="showForbiddenDialog = false">关闭</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '../api/index.js'

const emit = defineEmits(['text-generated', 'start-task'])

const activeTab = ref('extract')
const extractUrl = ref(uni.getStorageSync('audioToText_extractUrl') || '')
const creativePrompt = ref(uni.getStorageSync('audioToText_creativePrompt') || '')
const generatedText = ref(uni.getStorageSync('audioToText_generatedText') || '')
const processedText = ref(uni.getStorageSync('audioToText_processedText') || '')
const selectedSource = ref(null)
const isExtracting = ref(false)
const isGenerating = ref(false)
const showCopyLib = ref(false)
const copyList = ref([])
const showForbiddenDialog = ref(false)
const forbiddenAnalysis = ref({ loading: false, result: null, error: null })

watch(generatedText, (val) => { uni.setStorageSync('audioToText_generatedText', val) })
watch(processedText, (val) => { uni.setStorageSync('audioToText_processedText', val) })
watch(extractUrl, (val) => { uni.setStorageSync('audioToText_extractUrl', val) })
watch(creativePrompt, (val) => { uni.setStorageSync('audioToText_creativePrompt', val) })

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
  if (!generatedText.value) { uni.showToast({ title: '请先生成文案', icon: 'none' }); return }
  emit('start-task', '文案优化', async () => {
    const result = await api.post('/text/rewrite', {
      text: generatedText.value,
      prompt: '请将这段文案改写成更生动的口播稿：严格保留所有事实信息，但要删去冗余啰嗦的表达，让内容更紧凑有冲击力；用更接地气的口语化表达，像和朋友聊天一样自然；整体字数控制在原文的±10%范围内；只输出纯人声文字，不要任何脚本标记、镜头说明或格式要求。',
      modelType: 'cloud',
      model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
    })
    const text = result.rewrittenText || result.text || result.content || result.data?.text || ''
    if (text) {
      processedText.value = text
      selectedSource.value = 'processed'
      emit('text-generated', text)
      return { success: true, message: '文案优化完成' }
    }
    return { success: false, message: '文案优化失败' }
  })
}

async function handleCheckViolation() {
  const checkText = generatedText.value
  if (!checkText) { uni.showToast({ title: '请先生成文案', icon: 'none' }); return }

  showForbiddenDialog.value = true
  forbiddenAnalysis.value = { loading: true, result: null, error: null }

  try {
    const systemPrompt = '你是一级短视频审核员，审核下方文案，重点审核：广告法九大禁用词（国家级、最高级、最佳等）、平台社区规范（色情、暴力、政治、谣言）、行业专项限制（金融、医疗、教育）。输出格式要求：先总体判断（安全/轻度违规/严重违规），再列出问题词句、风险级别。请使用JSON格式输出，格式示例：{"overallJudgment":"安全","issues":[{"text":"问题词句","riskLevel":"轻度","description":"问题说明"}]}'

    const result = await api.post('/text/generate', {
      prompt: `请审核以下文案：\n\n${checkText}`,
      systemPrompt,
      model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
    })

    const text = result.text || result.content || ''

    if (text) {
      let parsedResult
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('无法解析结果')
        }
      } catch (parseErr) {
        parsedResult = {
          overallJudgment: '需要人工审核',
          issues: [{ text: 'AI分析结果无法自动解析', riskLevel: '轻度', description: text }]
        }
      }

      const analysisResult = {
        overallJudgment: parsedResult.overallJudgment || '安全',
        issues: (parsedResult.issues || []).map(issue => {
          let riskLevelType = 'info'
          if (issue.riskLevel && issue.riskLevel.includes('严重')) riskLevelType = 'danger'
          else if (issue.riskLevel && issue.riskLevel.includes('轻度')) riskLevelType = 'warning'
          return { ...issue, riskLevelType }
        })
      }

      if (analysisResult.overallJudgment.includes('严重')) {
        analysisResult.judgmentClass = 'severe'
        analysisResult.judgmentIcon = '🔴'
      } else if (analysisResult.overallJudgment.includes('轻度')) {
        analysisResult.judgmentClass = 'mild'
        analysisResult.judgmentIcon = '🟡'
      } else {
        analysisResult.judgmentClass = 'safe'
        analysisResult.judgmentIcon = '🟢'
      }

      forbiddenAnalysis.value = { loading: false, result: analysisResult, error: null }
    } else {
      forbiddenAnalysis.value = { loading: false, result: null, error: result.error || '检测失败' }
    }
  } catch (err) {
    forbiddenAnalysis.value = { loading: false, result: null, error: '网络错误，请重试' }
  }
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
.action-btn { flex: 1; height: 80rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-size: 28rpx; font-weight: 600; border-radius: 12rpx; border: none; }
.platform-row { display: flex; align-items: center; gap: 16rpx; }
.platform-icons { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.platform-icon { height: 80rpx; width: 80rpx; border-radius: 16rpx; }
.action-btn[disabled] { opacity: 0.5; }
.copy-lib-list { margin-top: 16rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; overflow: hidden; }
.copy-lib-item { padding: 20rpx; border-bottom: 1rpx solid rgba(255,255,255,0.05); }
.copy-lib-title { font-size: 26rpx; color: rgba(255,255,255,0.9); display: block; margin-bottom: 4rpx; }
.copy-lib-content { font-size: 22rpx; color: rgba(255,255,255,0.5); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-hint { padding: 24rpx; text-align: center; }
.empty-text { font-size: 24rpx; color: rgba(255,255,255,0.3); }
.result-section { margin-top: 20rpx; background: rgba(0,0,0,0.2); border-radius: 12rpx; padding: 20rpx; border: 1rpx solid rgba(102,126,234,0.2); }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.result-label { font-size: 24rpx; color: #667eea; font-weight: 600; min-width: 100rpx; }
.result-btns { display: flex; gap: 16rpx; flex-wrap: wrap; justify-content: flex-end; }
.result-btn { font-size: 24rpx; color: #fff; padding: 10rpx 20rpx; background: rgba(102,126,234,0.3); border-radius: 8rpx; text-align: center; min-width: calc(45% - 16rpx); }
.result-btn.selected { color: #667eea; background: rgba(102,126,234,0.2); }
.btn-optimize { background: rgba(46,204,113,0.3); }
.btn-check { background: rgba(241,196,15,0.3); }
.result-textarea { width: 100%; height: 320rpx; background: rgba(255,255,255,0.04); border: 1rpx solid rgba(255,255,255,0.08); border-radius: 8rpx; padding: 16rpx; font-size: 24rpx; color: rgba(255,255,255,0.8); box-sizing: border-box; overflow-y: auto; }
.forbidden-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.forbidden-dialog { width: 85%; max-width: 640rpx; background: rgba(20,20,40,0.98); border: 1rpx solid rgba(102,126,234,0.3); border-radius: 24rpx; overflow: hidden; }
.forbidden-dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 32rpx; background: rgba(0,0,0,0.3); border-bottom: 1rpx solid rgba(255,255,255,0.1); }
.forbidden-dialog-title { font-size: 30rpx; font-weight: 600; color: #fff; }
.forbidden-close-btn { font-size: 36rpx; color: rgba(255,255,255,0.6); padding: 8rpx 16rpx; }
.forbidden-dialog-body { padding: 32rpx; max-height: 60vh; overflow-y: auto; }
.forbidden-loading { text-align: center; padding: 48rpx 0; }
.forbidden-loading-text { font-size: 28rpx; color: rgba(255,255,255,0.6); }
.judgment-bar { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; border-radius: 16rpx; margin-bottom: 24rpx; }
.judgment-bar.safe { background: rgba(46,204,113,0.15); border: 1rpx solid rgba(46,204,113,0.3); }
.judgment-bar.mild { background: rgba(241,196,15,0.15); border: 1rpx solid rgba(241,196,15,0.3); }
.judgment-bar.severe { background: rgba(231,76,60,0.15); border: 1rpx solid rgba(231,76,60,0.3); }
.judgment-icon { font-size: 36rpx; }
.judgment-text { font-size: 28rpx; font-weight: 600; color: #fff; }
.issues-title { font-size: 26rpx; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 16rpx; }
.issue-item { background: rgba(0,0,0,0.2); border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.issue-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.issue-index { font-size: 26rpx; color: rgba(255,255,255,0.7); }
.risk-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; color: #fff; }
.risk-tag.danger { background: rgba(231,76,60,0.4); }
.risk-tag.warning { background: rgba(241,196,15,0.4); }
.risk-tag.info { background: rgba(102,126,234,0.4); }
.issue-text { font-size: 24rpx; color: rgba(255,255,255,0.7); display: block; margin-bottom: 4rpx; }
.issue-desc { font-size: 22rpx; color: rgba(255,255,255,0.5); display: block; }
.safe-message { text-align: center; padding: 32rpx 0; }
.safe-text { font-size: 28rpx; color: rgba(46,204,113,0.8); }
.forbidden-error { text-align: center; padding: 32rpx 0; }
.forbidden-error-text { font-size: 26rpx; color: rgba(231,76,60,0.8); }
.forbidden-dialog-footer { padding: 20rpx 32rpx; border-top: 1rpx solid rgba(255,255,255,0.1); display: flex; justify-content: flex-end; }
.forbidden-footer-btn { font-size: 28rpx; color: #667eea; padding: 12rpx 32rpx; background: rgba(102,126,234,0.15); border-radius: 12rpx; }
</style>

<template>
  <div class="audio-to-text">
    <div class="tabs-container">
      <div class="left-tabs">
        <div
          v-for="(tab, index) in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeTab === tab.value, first: index === 0, last: index === tabs.length - 1 }"
          @click="activeTab = tab.value"
        >
          <span class="tab-label">{{ tab.label }}</span>
        </div>
      </div>

      <div class="main-content">
        <div v-if="activeTab === 'extract'" class="content-panel">
          <el-input
            v-model="videoUrl"
            type="textarea"
            :rows="3"
            placeholder="输入参考视频链接"
            class="url-input"
          />

          <div class="extract-controls">
            <el-button
              @click="extractCopywriting"
              :loading="isExtracting"
              type="info"
            >
              文案提取
            </el-button>
          </div>
        </div>

        <div v-if="activeTab === 'creative'" class="content-panel">
          <el-input
            v-model="creativePrompt"
            type="textarea"
            :rows="5"
            placeholder="输入创意提示词"
            class="prompt-textarea"
          />
          <div class="creative-buttons">
            <el-button
              @click="openPromptLibrary"
              type="text"
            >
              提示词库
            </el-button>
            <div class="word-count-section">
              <span class="word-count-label">字数</span>
              <el-input
                v-model="wordCount"
                type="number"
                :maxlength="4"
                :min="1"
                class="word-count-input"
                placeholder="100"
              />
            </div>
            <el-button
              @click="generateCreative"
              :loading="isGenerating"
              type="primary"
            >
              确认
            </el-button>
          </div>
        </div>

        <div v-if="activeTab === 'import'" class="content-panel">
          <div class="import-panel">
            <p class="import-description">从文案库中选择已有文案导入使用</p>
            <el-button
              @click="openImportDialog"
              type="primary"
              size="large"
              class="import-button"
            >
              导入文案
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="result-section">
      <el-input
        v-model="generatedText"
        type="textarea"
        :rows="10"
        class="result-input"
        placeholder="生成的文案将显示在这里"
      />

      <div class="top-action-buttons">
        <el-button
          @click="addToCopyLibrary"
          :loading="isAddingToLibrary"
          :disabled="!generatedText"
          type="info"
        >
          加到文案库
        </el-button>
        <el-button
          @click="useThisCopy"
          :disabled="!generatedText"
          type="primary"
          :class="{ 'selected': selectedCopySource === 'generated' }"
        >
          <span v-if="selectedCopySource === 'generated'" class="check-icon">✓</span>
          {{ selectedCopySource === 'generated' ? '已选中' : '使用此文案' }}
        </el-button>
      </div>

      <div class="action-buttons">
        <el-button
          @click="optimizeCopywriting"
          :loading="isOptimizing"
          type="success"
        >
          文案优化
        </el-button>
        <el-button
          @click="checkForbidden"
          :loading="isChecking"
          type="warning"
        >
          违禁检测
        </el-button>
      </div>

      <el-input
        v-model="processedText"
        type="textarea"
        :rows="10"
        class="processed-input"
        :placeholder="processedPlaceholder"
      />

      <div class="final-buttons">
        <el-button
          @click="addProcessedToCopyLibrary"
          :loading="isAddingProcessedToLibrary"
          :disabled="!processedText"
          type="info"
        >
          加到文案库
        </el-button>
        <el-button
          @click="confirmText"
          type="primary"
          :class="{ 'selected': selectedCopySource === 'processed' }"
          :disabled="!processedText && !generatedText"
        >
          <span v-if="selectedCopySource === 'processed'" class="check-icon">✓</span>
          {{ selectedCopySource === 'processed' ? '已选中' : '使用此文案' }}
        </el-button>
      </div>
    </div>

    <div v-if="error" class="error-message" :class="{ 'warning': isWarning }">
      {{ error }}
    </div>

    <!-- 违禁检测结果弹窗 -->
    <div v-if="showForbiddenDialog" class="forbidden-dialog-overlay" @click.self="showForbiddenDialog = false">
      <div class="forbidden-dialog">
        <div class="forbidden-dialog-header">
          <h3>违禁检测结果</h3>
          <button @click="showForbiddenDialog = false" class="close-btn">×</button>
        </div>
        <div class="forbidden-dialog-content">
          <div v-if="forbiddenAnalysis.loading" class="loading-state">
            <div class="loading-spinner"></div> 正在分析中...
          </div>
          <div v-else-if="forbiddenAnalysis.result" class="result-content">
            <div class="overall-judgment" :class="forbiddenAnalysis.result.judgmentClass">
              <span class="judgment-icon">{{ forbiddenAnalysis.result.judgmentIcon }}</span>
              <span class="judgment-text">{{ forbiddenAnalysis.result.overallJudgment }}</span>
            </div>
            <div v-if="forbiddenAnalysis.result.issues && forbiddenAnalysis.result.issues.length > 0" class="issues-section">
              <div class="section-title">问题列表</div>
              <div class="issue-item" v-for="(issue, index) in forbiddenAnalysis.result.issues" :key="index">
                <div class="issue-header">
                  <span class="issue-index">{{ index + 1 }}.</span>
                  <span class="risk-tag" :class="issue.riskLevelType">{{ issue.riskLevel }}</span>
                </div>
                <div class="issue-text">问题词句：{{ issue.text }}</div>
                <div class="issue-desc" v-if="issue.description">说明：{{ issue.description }}</div>
              </div>
            </div>
            <div v-else class="safe-message">
              文案内容安全，未发现违规内容
            </div>
          </div>
          <div v-else-if="forbiddenAnalysis.error" class="error-state">
            ⚠️ {{ forbiddenAnalysis.error }}
          </div>
        </div>
        <div class="forbidden-dialog-footer">
          <button @click="showForbiddenDialog = false" class="close-button">关闭</button>
        </div>
      </div>
    </div>

    <!-- 成功提示 -->
    <div v-if="showSuccessToast" class="success-toast">
      <span class="success-icon">✅</span>
      <span class="success-text">文案已成功添加到文案库</span>
    </div>

    <!-- 导入文案弹窗 -->
    <div v-if="showImportDialog" class="import-dialog-overlay" @click.self="showImportDialog = false">
      <div class="import-dialog">
        <div class="import-dialog-header">
          <h3>选择文案导入</h3>
          <button @click="showImportDialog = false" class="close-btn">×</button>
        </div>
        <div class="import-dialog-content">
          <div v-if="isLoadingCopyLibrary" class="loading-state">
            <div class="loading-spinner"></div> 加载中...
          </div>
          <div v-else-if="copyLibraryList.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <p>文案库为空，请先添加文案</p>
          </div>
          <div v-else class="copy-list">
            <div
              v-for="(copy, index) in copyLibraryList"
              :key="copy.id || index"
              class="copy-item"
              :class="{ 'my-copy': copy.userId === currentUser?.id }"
              @click="selectCopy(copy)"
            >
              <div class="copy-header">
                <span v-if="copy.userId === currentUser?.id" class="copy-tag my-tag">我的文案</span>
                <span v-else-if="copy.isPublic" class="copy-tag public-tag">公共文案</span>
                <span v-else class="copy-tag">其他</span>
              </div>
              <div class="copy-content">{{ copy.content }}</div>
            </div>
          </div>
        </div>
        <div class="import-dialog-footer">
          <button @click="showImportDialog = false" class="cancel-button">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useTaskManager } from '../composables/useTaskManager'
import { getAuthHeaders } from '../utils/api.js'

const emit = defineEmits(['text-generated'])
const taskManager = useTaskManager()

// 获取当前用户
const getCurrentUser = () => {
  try {
    const userInfo = localStorage.getItem('userInfo')
    if (userInfo) {
      return JSON.parse(userInfo)
    }
  } catch (err) {
    console.error('Failed to parse user info:', err)
  }
  return null
}

// 缓存键名
const CACHE_KEYS = {
  VIDEO_URL: 'audio_to_text_video_url',
  CREATIVE_PROMPT: 'audio_to_text_creative_prompt',
  GENERATED_TEXT: 'audio_to_text_generated_text',
  PROCESSED_TEXT: 'audio_to_text_processed_text',
  PROCESSED_PLACEHOLDER: 'audio_to_text_processed_placeholder',
  PENDING_TASK: 'audio_to_text_pending_task'  // 新增：待完成任务信息
}

// 轮询相关常量
const POLLING_CONFIG = {
  interval: 3000,        // 轮询间隔（毫秒）
  maxAttempts: 200,      // 最大轮询次数（10分钟）
  checkInterval: 5000    // 后台检查间隔（毫秒）
}

const activeTab = ref('extract')
const tabs = [
  { label: '提取', value: 'extract' },
  { label: '创意', value: 'creative' },
  { label: '导入', value: 'import' }
]

const promptLibrary = [
  '写一个产品推广文案，突出产品特点和优势',
  '创作一段情感共鸣的文案，引发用户共鸣',
  '写一段幽默搞笑的文案，适合短视频',
  '创作一段励志正能量的文案',
  '写一个节日祝福文案',
  '创作一段品牌故事文案'
]

const videoUrl = ref('')
const creativePrompt = ref('')
const wordCount = ref('')
const generatedText = ref('')
const processedText = ref('')
const processedPlaceholder = ref('优化后的文案或违禁检测结果将显示在这里')
const isTextSelected = ref(false)
const selectedCopySource = ref(null) // 'generated' | 'processed' | null
const isExtracting = ref(false)
const isGenerating = ref(false)
const isOptimizing = ref(false)
const isChecking = ref(false)
const isFixing = ref(false)
const isAddingToLibrary = ref(false)
const isAddingProcessedToLibrary = ref(false)
const error = ref('')
const isWarning = ref(false)
const forbiddenResult = ref(null)
const showForbiddenDialog = ref(false)
const forbiddenAnalysis = ref({
  loading: false,
  result: null,
  error: null
})
const showSuccessToast = ref(false)
let successToastTimer = null

// 轮询保底相关变量
let pollingTimer = null
let backgroundCheckTimer = null
let pollingAttempts = 0
const currentTaskType = ref('')  // 当前任务类型：'extract' | 'creative' | null
const lastGeneratedTextLength = ref(0)  // 用于检测新生成的文案

// 导入相关
const showImportDialog = ref(false)
const copyLibraryList = ref([])
const isLoadingCopyLibrary = ref(false)
const currentUser = ref(null)

const openImportDialog = async () => {
  showImportDialog.value = true
  currentUser.value = getCurrentUser()
  await loadCopyLibrary()
}

const loadCopyLibrary = async () => {
  isLoadingCopyLibrary.value = true
  console.log('=== 开始加载文案库 ===')
  console.log('当前用户:', currentUser.value)
  
  try {
    let url = '/api/copy-library'
    console.log('请求URL:', url)
    
    // 先获取所有文案，然后在前端过滤
    const response = await fetch(url, { headers: getAuthHeaders() })
    console.log('响应状态:', response.status)
    
    const data = await response.json()
    console.log('原始返回数据:', data)
    
    let allCopies = []
    if (Array.isArray(data)) {
      allCopies = data
      console.log('数据是数组类型')
    } else if (data.data && Array.isArray(data.data)) {
      allCopies = data.data
      console.log('数据在data字段中')
    } else {
      console.log('无法识别的数据格式')
    }
    
    console.log('所有文案数量:', allCopies.length)
    console.log('所有文案:', allCopies)
    
    // 过滤：只显示自己的文案和公共文案
    if (currentUser.value?.id) {
      const filtered = allCopies.filter(copy => 
        copy.userId === currentUser.value.id || copy.isPublic === true
      )
      console.log('过滤后文案数量:', filtered.length)
      console.log('过滤后文案:', filtered)
      
      // 排序：我的文案在前，公共文案在后
      copyLibraryList.value = filtered.sort((a, b) => {
        if (a.userId === currentUser.value.id && b.userId !== currentUser.value.id) return -1
        if (a.userId !== currentUser.value.id && b.userId === currentUser.value.id) return 1
        return 0
      })
    } else {
      // 如果没有用户id，只显示公共文案
      copyLibraryList.value = allCopies.filter(copy => 
        copy.isPublic === true
      )
    }
    console.log('最终显示文案:', copyLibraryList.value)
  } catch (err) {
    console.error('加载文案库失败:', err)
    copyLibraryList.value = []
  } finally {
    isLoadingCopyLibrary.value = false
    console.log('=== 加载完成 ===')
  }
}

const selectCopy = (copy) => {
  if (copy && copy.content) {
    generatedText.value = copy.content
    showImportDialog.value = false
  }
}

// 初始化加载缓存
onMounted(() => {
  videoUrl.value = localStorage.getItem(CACHE_KEYS.VIDEO_URL) || ''
  creativePrompt.value = localStorage.getItem(CACHE_KEYS.CREATIVE_PROMPT) || ''
  generatedText.value = localStorage.getItem(CACHE_KEYS.GENERATED_TEXT) || ''
  processedText.value = localStorage.getItem(CACHE_KEYS.PROCESSED_TEXT) || ''
  const cachedPlaceholder = localStorage.getItem(CACHE_KEYS.PROCESSED_PLACEHOLDER)
  if (cachedPlaceholder) {
    processedPlaceholder.value = cachedPlaceholder
  }

  // 初始化时记录当前文案长度
  lastGeneratedTextLength.value = generatedText.value.length

  // 检查是否有未完成的任务需要恢复
  checkAndRestorePendingTask()

  // 后台定期检查已禁用（避免不必要的日志和请求）
  // startBackgroundCheck()
})

// 组件卸载时清理定时器
onUnmounted(() => {
  stopPolling()
  stopBackgroundCheck()
})

/**
 * 保存待完成任务信息到localStorage
 */
const savePendingTask = (taskType, inputData) => {
  const taskInfo = {
    taskType,
    inputData,
    startTime: Date.now(),
    userId: getCurrentUser()?.id
  }
  localStorage.setItem(CACHE_KEYS.PENDING_TASK, JSON.stringify(taskInfo))
  console.log('💾 已保存待完成任务信息:', taskInfo)
}

/**
 * 清除待完成任务信息
 */
const clearPendingTask = () => {
  localStorage.removeItem(CACHE_KEYS.PENDING_TASK)
  currentTaskType.value = ''
  console.log('🗑️ 已清除待完成任务信息')
}

/**
 * 检查并恢复未完成的任务
 */
const checkAndRestorePendingTask = async () => {
  try {
    const pendingTaskStr = localStorage.getItem(CACHE_KEYS.PENDING_TASK)
    if (!pendingTaskStr) return

    const pendingTask = JSON.parse(pendingTaskStr)
    console.log('🔄 发现未完成任务:', pendingTask)

    // 检查任务是否超时（超过30分钟则清除）
    const elapsed = Date.now() - pendingTask.startTime
    if (elapsed > 30 * 60 * 1000) {
      console.log('⏰ 任务已超时，清除')
      clearPendingTask()
      return
    }

    // 立即执行一次检查
    await checkForNewResult(pendingTask.taskType)

    // 如果仍然没有结果，启动轮询
    if (!generatedText.value || generatedText.value.length <= lastGeneratedTextLength.value) {
      console.log('🔄 启动轮询恢复任务...')
      currentTaskType.value = pendingTask.taskType
      startPolling(pendingTask.taskType)
    } else {
      // 已经有新结果了，清除任务
      clearPendingTask()
    }
  } catch (err) {
    console.error('❌ 恢复任务失败:', err)
    clearPendingTask()
  }
}

/**
 * 开始轮询检查任务结果
 */
const startPolling = (taskType) => {
  stopPolling()  // 先停止之前的轮询

  console.log(`🔄 开始轮询任务: ${taskType}`)
  pollingAttempts = 0
  currentTaskType.value = taskType

  pollingTimer = setInterval(async () => {
    pollingAttempts++
    console.log(`📊 轮询检查 [${pollingAttempts}/${POLLING_CONFIG.maxAttempts}]`)

    await checkForNewResult(taskType)

    // 超过最大次数则停止
    if (pollingAttempts >= POLLING_CONFIG.maxAttempts) {
      console.log('⏰ 轮询达到最大次数，停止')
      stopPolling()
      clearPendingTask()
    }
  }, POLLING_CONFIG.interval)
}

/**
 * 停止轮询
 */
const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
    console.log('⏹️ 已停止轮询')
  }
}

/**
 * 启动后台定期检查（即使没有活跃任务也运行）
 */
const startBackgroundCheck = () => {
  if (backgroundCheckTimer) return

  backgroundCheckTimer = setInterval(async () => {
    // 只在没有活跃轮询且当前没有生成中的任务时才检查
    if (!pollingTimer && !isExtracting.value && !isGenerating.value) {
      await checkForLatestCopy()
    }
  }, POLLING_CONFIG.checkInterval)

  console.log('✅ 后台检查已启动')
}

/**
 * 停止后台检查
 */
const stopBackgroundCheck = () => {
  if (backgroundCheckTimer) {
    clearInterval(backgroundCheckTimer)
    backgroundCheckTimer = null
  }
}

/**
 * 检查是否有新的任务结果（根据任务类型）
 */
const checkForNewResult = async (taskType) => {
  try {
    const user = getCurrentUser()
    let url = '/api/copy-library'
    if (user?.id) {
      url += `?userId=${user.id}`
    }

    const response = await fetch(url, { headers: getAuthHeaders() })
    const data = await response.json()

    let allCopies = []
    if (Array.isArray(data)) {
      allCopies = data
    } else if (data?.data && Array.isArray(data.data)) {
      allCopies = data.data
    }

    if (allCopies.length === 0) return false

    // 找到最新的文案记录
    const latestCopy = allCopies[0]
    if (latestCopy?.content && latestCopy.content.length > lastGeneratedTextLength.value) {
      console.log('✅ 发现新生成的文案!')

      // 更新UI
      generatedText.value = latestCopy.content
      lastGeneratedTextLength.value = latestCopy.content.length

      // 停止轮询并清除任务
      stopPolling()
      clearPendingTask()

      // 显示提示
      error.value = '✅ 文案生成完成（自动恢复）'
      isWarning.value = false
      setTimeout(() => { error.value = '' }, 3000)

      return true
    }

    return false
  } catch (err) {
    console.error('❌ 检查任务结果失败:', err)
    return false
  }
}

/**
 * 定期检查最新的文案库记录（后台检查用）
 */
const checkForLatestCopy = async () => {
  try {
    // 如果已经有内容且长度没变化，就不更新
    if (!generatedText.value) return

    const user = getCurrentUser()
    let url = '/api/copy-library'
    if (user?.id) {
      url += `?userId=${user.id}&limit=1`
    }

    const response = await fetch(url, { headers: getAuthHeaders() })
    const data = await response.json()

    let allCopies = []
    if (Array.isArray(data)) {
      allCopies = data
    } else if (data?.data && Array.isArray(data.data)) {
      allCopies = data.data
    }

    if (allCopies.length > 0) {
      const latestCopy = allCopies[0]
      // 只有当新文案比当前文案更长时才更新（避免覆盖用户正在编辑的内容）
      if (latestCopy?.content && latestCopy.content.length > generatedText.value.length) {
        console.log('🔄 后台检查发现更新的文案')
        generatedText.value = latestCopy.content
        lastGeneratedTextLength.value = latestCopy.content.length
      }
    }
  } catch (err) {
    // 静默失败，不影响用户体验
  }
}

// 显示成功提示
const displaySuccessToast = () => {
  if (successToastTimer) {
    clearTimeout(successToastTimer)
  }
  showSuccessToast.value = true
  successToastTimer = setTimeout(() => {
    showSuccessToast.value = false
  }, 1000)
}

// 监听变化并保存缓存
watch(videoUrl, (newVal) => {
  localStorage.setItem(CACHE_KEYS.VIDEO_URL, newVal)
})

watch(creativePrompt, (newVal) => {
  localStorage.setItem(CACHE_KEYS.CREATIVE_PROMPT, newVal)
})

watch(generatedText, (newVal) => {
  localStorage.setItem(CACHE_KEYS.GENERATED_TEXT, newVal)
})

watch(processedText, (newVal) => {
  localStorage.setItem(CACHE_KEYS.PROCESSED_TEXT, newVal)
})

watch(processedPlaceholder, (newVal) => {
  localStorage.setItem(CACHE_KEYS.PROCESSED_PLACEHOLDER, newVal)
})

const extractCopywriting = async () => {
  if (!videoUrl.value) {
    error.value = '请输入视频链接'
    isWarning.value = false
    return
  }

  const urlMatch = videoUrl.value.match(/(https?:\/\/[^\s]+)/);
  const cleanUrl = urlMatch ? urlMatch[1] : videoUrl.value;

  taskManager.startTask('extract', '文案提取', { url: cleanUrl })

  console.log('🎬 [AudioToText] 准备调用 executeAfterConfirm...')

  taskManager.executeAfterConfirm(async () => {
    console.log('🚀 [AudioToText] 任务函数开始执行！API 调用即将开始...')
    try {
      console.log('🛑 [AudioToText] 停止所有现有轮询...')
      stopPolling()
      stopBackgroundCheck()

      isExtracting.value = true
      error.value = ''
      isWarning.value = false
      forbiddenResult.value = null

      lastGeneratedTextLength.value = generatedText.value.length
      console.log('💾 [AudioToText] 准备调用 API...')

      const response = await fetch('/api/text/extract-from-video', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          url: cleanUrl,
          modelType: 'cloud',
          asrModel: 'qwen'
        })
      })

      console.log('📨 [AudioToText] API 响应收到, status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [AudioToText] API 返回错误:', response.status, errorData)
        throw new Error(errorData.error || `请求失败 (${response.status})`)
      }

      const data = await response.json()
      if (data.success && data.text) {
        generatedText.value = data.text
        lastGeneratedTextLength.value = data.text.length
        clearPendingTask()
        stopPolling()
        stopBackgroundCheck()

        console.log('✅ [AudioToText] 文案提取成功，已停止所有后台任务')

        if (data.usingMock) {
          error.value = '⚠️ 文案提取完成（当前使用模拟数据，请检查RunningHub配置）'
          isWarning.value = true
          setTimeout(() => { error.value = ''; isWarning.value = false }, 5000)
          return { success: true, message: '文案提取完成（当前使用模拟数据）' }
        }
        return { success: true, message: '文案提取完成' }
      } else {
        throw new Error(data.error || '提取失败')
      }
    } catch (err) {
      console.error('提取文案失败:', err)
      error.value = `文案提取失败: ${err.message}`
      isWarning.value = false
    } finally {
      isExtracting.value = false
    }
  })
}

const openPromptLibrary = () => {
  const selected = prompt('请选择一个提示词：\n\n' + promptLibrary.map((p, i) => `${i + 1}. ${p}`).join('\n'))
  if (selected) {
    const index = parseInt(selected) - 1
    if (index >= 0 && index < promptLibrary.length) {
      creativePrompt.value = promptLibrary[index]
    }
  }
}

const generateCreative = async () => {
  if (!creativePrompt.value) {
    error.value = '请输入创意提示词'
    isWarning.value = false
    return
  }

  taskManager.startTask('creative', '创意文案生成', {
    prompt: creativePrompt.value,
    wordCount: wordCount.value
  })

  taskManager.executeAfterConfirm(async () => {
    try {
      console.log('🛑 [AudioToText] 停止所有现有轮询...')
      stopPolling()
      stopBackgroundCheck()

      isGenerating.value = true
      error.value = ''
      isWarning.value = false
      forbiddenResult.value = null

      lastGeneratedTextLength.value = generatedText.value.length
      console.log('💾 [AudioToText] 准备调用创意生成 API...')

      let systemPrompt = '你是一个专业的文案创作助手，擅长根据用户提示生成高质量的口播文案。'
      let userPrompt = creativePrompt.value

      if (wordCount.value) {
        userPrompt = `${creativePrompt.value}\n\n请生成约${wordCount.value}字的文案。`
      }

      const response = await fetch('/api/text/generate', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          prompt: userPrompt,
          systemPrompt: systemPrompt,
          model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
        })
      })

      const data = await response.json()
      if (data.success && data.text) {
        generatedText.value = data.text
        lastGeneratedTextLength.value = data.text.length
        clearPendingTask()
        stopPolling()
        stopBackgroundCheck()

        console.log('✅ [AudioToText] 创意生成成功，已停止所有后台任务')
        return { success: true, message: '创意文案生成完成' }
      } else {
        startPolling('creative')
        throw new Error(data.error || '生成失败')
      }
    } catch (err) {
      console.error('创意生成失败:', err)
      startPolling('creative')
    } finally {
      isGenerating.value = false
    }
  })
}

const optimizeCopywriting = async () => {
  if (!generatedText.value) {
    error.value = '请先生成文案'
    isWarning.value = false
    return
  }

  isOptimizing.value = true
  error.value = ''
  isWarning.value = false
  forbiddenResult.value = null

  try {
    const response = await fetch('/api/text/rewrite', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        text: generatedText.value,
        prompt: '请将这段文案改写成更生动的口播稿：严格保留所有事实信息，但要删去冗余啰嗦的表达，让内容更紧凑有冲击力；用更接地气的口语化表达，像和朋友聊天一样自然；整体字数控制在原文的±10%范围内；只输出纯人声文字，不要任何脚本标记、镜头说明或格式要求。',
        modelType: 'cloud',
        model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
      })
    })

    const data = await response.json()
    if (data.rewrittenText) {
      processedText.value = data.rewrittenText
      processedPlaceholder.value = '优化后的文案'
    } else {
      error.value = data.error || '优化失败'
      isWarning.value = false
    }
  } catch (err) {
    error.value = '网络错误，请重试'
    isWarning.value = false
  } finally {
    isOptimizing.value = false
  }
}

const checkForbidden = async () => {
  if (!generatedText.value) {
    error.value = '请先生成文案'
    isWarning.value = false
    return
  }

  showForbiddenDialog.value = true
  forbiddenAnalysis.value = {
    loading: true,
    result: null,
    error: null
  }
  isChecking.value = true
  error.value = ''
  isWarning.value = false

  try {
    const systemPrompt = '你是一级短视频审核员，审核下方文案，重点审核：广告法九大禁用词（国家级、最高级、最佳等）、平台社区规范（色情、暴力、政治、谣言）、行业专项限制（金融、医疗、教育）。输出格式要求：先总体判断（安全/轻度违规/严重违规），再列出问题词句、风险级别。请使用JSON格式输出，格式示例：{"overallJudgment":"安全","issues":[{"text":"问题词句","riskLevel":"轻度","description":"问题说明"}]}'
    
    const userPrompt = `请审核以下文案：\n\n${generatedText.value}`

    const response = await fetch('/api/text/generate', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        prompt: userPrompt,
        systemPrompt: systemPrompt,
        model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
      })
    })

    const data = await response.json()
    
    if (data.success && data.text) {
      // 尝试解析JSON
      let parsedResult
      try {
        // 提取JSON部分
        const jsonMatch = data.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('无法解析结果')
        }
      } catch (parseErr) {
        // 如果解析失败，创建一个默认的结果
        parsedResult = {
          overallJudgment: '需要人工审核',
          issues: [{
            text: 'AI分析结果无法自动解析',
            riskLevel: '轻度',
            description: data.text
          }]
        }
      }

      // 处理结果
      const result = {
        overallJudgment: parsedResult.overallJudgment || '安全',
        issues: parsedResult.issues || []
      }

      // 添加样式类名
      if (result.overallJudgment.includes('严重')) {
        result.judgmentClass = 'severe'
        result.judgmentIcon = '🔴'
      } else if (result.overallJudgment.includes('轻度')) {
        result.judgmentClass = 'mild'
        result.judgmentIcon = '🟡'
      } else {
        result.judgmentClass = 'safe'
        result.judgmentIcon = '🟢'
      }

      // 处理问题的风险级别样式
      result.issues = result.issues.map(issue => {
        let riskLevelType
        if (issue.riskLevel && issue.riskLevel.includes('严重')) {
          riskLevelType = 'danger'
        } else if (issue.riskLevel && issue.riskLevel.includes('轻度')) {
          riskLevelType = 'warning'
        } else {
          riskLevelType = 'info'
        }
        return {
          ...issue,
          riskLevelType: riskLevelType
        }
      })

      forbiddenAnalysis.value = {
        loading: false,
        result: result,
        error: null
      }
    } else {
      forbiddenAnalysis.value = {
        loading: false,
        result: null,
        error: data.error || '检测失败'
      }
    }
  } catch (err) {
    forbiddenAnalysis.value = {
      loading: false,
      result: null,
      error: '网络错误，请重试'
    }
  } finally {
    isChecking.value = false
  }
}

const fixForbidden = async () => {
  if (!generatedText.value) {
    error.value = '请先生成文案'
    isWarning.value = false
    return
  }

  isFixing.value = true
  error.value = ''
  isWarning.value = false

  try {
    const response = await fetch('/api/text/rewrite', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        text: generatedText.value,
        prompt: '修改文案中的违禁内容，使其符合规范',
        modelType: 'local'
      })
    })

    const data = await response.json()
    if (data.rewrittenText) {
      processedText.value = data.rewrittenText
      processedPlaceholder.value = '已修改违禁内容的文案'
    } else {
      error.value = data.error || '修改失败'
      isWarning.value = false
    }
  } catch (err) {
    error.value = '网络错误，请重试'
    isWarning.value = false
  } finally {
    isFixing.value = false
  }
}

const confirmText = () => {
  const finalText = processedText.value || generatedText.value
  
  // 互斥选择：取消选中或将来源设为 processed
  if (selectedCopySource.value === 'processed') {
    selectedCopySource.value = null
    isTextSelected.value = false
  } else {
    selectedCopySource.value = 'processed'
    isTextSelected.value = true
    emit('text-generated', finalText)
  }
}

const addToCopyLibrary = async () => {
  if (!generatedText.value) {
    error.value = '请先生成文案'
    isWarning.value = false
    return
  }

  isAddingToLibrary.value = true
  error.value = ''
  isWarning.value = false

  try {
    const user = getCurrentUser()
    const response = await fetch('/api/copy-library', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: '用户文案',
        content: generatedText.value,
        category: 'default',
        isPublic: false,
        userId: user?.id || null
      })
    })

    const data = await response.json()
    if (data.id) {
      displaySuccessToast()
    } else {
      error.value = data.error || '添加失败'
      isWarning.value = false
    }
  } catch (err) {
    error.value = '网络错误，请重试: ' + (err.message || '')
    isWarning.value = false
  } finally {
    isAddingToLibrary.value = false
  }
}

const useThisCopy = () => {
  if (!generatedText.value) {
    error.value = '请先生成文案'
    isWarning.value = false
    return
  }
  
  // 互斥选择：取消选中或将来源设为 generated
  if (selectedCopySource.value === 'generated') {
    selectedCopySource.value = null
    isTextSelected.value = false
  } else {
    selectedCopySource.value = 'generated'
    isTextSelected.value = true
    emit('text-generated', generatedText.value)
  }
}

const addProcessedToCopyLibrary = async () => {
  if (!processedText.value) {
    error.value = '请先处理文案'
    isWarning.value = false
    return
  }

  isAddingProcessedToLibrary.value = true
  error.value = ''
  isWarning.value = false

  try {
    const user = getCurrentUser()
    const response = await fetch('/api/copy-library', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: '用户文案',
        content: processedText.value,
        category: 'default',
        isPublic: false,
        userId: user?.id || null
      })
    })

    const data = await response.json()
    if (data.id) {
      displaySuccessToast()
    } else {
      error.value = data.error || '添加失败'
      isWarning.value = false
    }
  } catch (err) {
    error.value = '网络错误，请重试: ' + (err.message || '')
    isWarning.value = false
  } finally {
    isAddingProcessedToLibrary.value = false
  }
}
</script>

<style scoped>
.audio-to-text {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.section-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
}

.tabs-container {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  overflow: hidden;
  min-height: 180px;
}

.left-tabs {
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.3);
  width: 50px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 15px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 12px;
  border-left: 3px solid transparent;
}

.tab-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
  color: #fff;
  border-left-color: #667eea;
  box-shadow: inset 0 0 20px rgba(102, 126, 234, 0.2);
}

.tab-item:hover {
  background: rgba(102, 126, 234, 0.15);
  color: #fff;
}

.tab-label {
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 1px;
  line-height: 1.8;
}

.main-content {
  flex: 1;
  padding: 20px;
  display: flex;
  align-items: flex-start;
}

.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.extract-controls {
  display: flex;
  justify-content: flex-end;
}

.creative-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

/* ========== 移动端响应式样式 ========== */
@media (max-width: 768px) {
  .audio-to-text {
    padding: 12px;
    gap: 12px;
  }

  .tabs-container {
    flex-direction: column;
    min-height: auto;
  }

  .left-tabs {
    flex-direction: row;
    width: 100%;
    height: 44px;
    margin-right: 0;
    margin-bottom: 0;
    border-radius: 8px 8px 0 0;
  }

  .tab-item {
    flex: 1;
    border-left: none;
    border-bottom: 2px solid transparent;
    font-size: 13px;
  }

  .tab-item.active {
    border-left: none;
    border-bottom-color: #667eea;
  }

  .tab-label {
    writing-mode: horizontal-tb;
    text-orientation: mixed;
    letter-spacing: normal;
    line-height: 1.5;
  }

  .main-content {
    padding: 15px;
  }

  .content-panel {
    gap: 15px;
  }

  .creative-buttons {
    flex-wrap: wrap;
    gap: 10px;
  }

  .word-count-section {
    flex: 1;
    min-width: 120px;
    justify-content: flex-start;
  }

  .creative-buttons .el-button {
    flex-shrink: 0;
  }
}

.word-count-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.word-count-label {
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
}

.word-count-input {
  width: 80px;
}

.word-count-input :deep(.el-input__inner) {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: #000;
}

.check-icon {
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.selected {
  background: rgba(102, 126, 234, 0.3) !important;
  border-color: #667eea !important;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-action-buttons {
  display: flex;
  gap: 10px;
}

.top-action-buttons .el-button {
  flex: 1;
}

.result-input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.processed-input {
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.3);
  color: #fff;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.action-buttons .el-button {
  flex: 1;
}

.final-buttons {
  display: flex;
  gap: 10px;
}

.final-buttons .el-button {
  flex: 1;
}

.forbidden-result {
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.forbidden-result .section-title {
  font-size: 14px;
  margin-bottom: 10px;
}

.passed {
  color: #52c41a;
  font-size: 14px;
}

.failed {
  color: #ff4d4f;
  font-size: 14px;
}

.issues {
  margin-top: 8px;
  padding-left: 15px;
}

.error-message {
  color: #ff4d4f;
  font-size: 14px;
  padding: 10px;
  background: rgba(255, 77, 79, 0.1);
  border-radius: 6px;
}

.error-message.warning {
  color: #faad14;
  background: rgba(250, 173, 20, 0.1);
  border: 1px solid rgba(250, 173, 20, 0.3);
}

/* 违禁检测弹窗样式 */
.forbidden-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.forbidden-dialog {
  background: #1e1e3c;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(102, 126, 234, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.forbidden-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
}

.forbidden-dialog-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.forbidden-dialog-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  font-size: 16px;
  color: #ff6b6b;
}

.result-content {
  padding: 0;
}

.overall-judgment {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  font-size: 18px;
  font-weight: 600;
}

.overall-judgment.safe {
  background: rgba(103, 194, 58, 0.15);
  color: #67c23a;
  border: 1px solid rgba(103, 194, 58, 0.3);
}

.overall-judgment.mild {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
  border: 1px solid rgba(230, 162, 60, 0.3);
}

.overall-judgment.severe {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
  border: 1px solid rgba(245, 108, 108, 0.3);
}

.judgment-icon {
  font-size: 28px;
  margin-right: 12px;
}

.issues-section {
  margin-top: 0;
}

.issues-section .section-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.issue-item {
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.issue-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.issue-index {
  font-weight: 600;
  color: #fff;
  margin-right: 10px;
}

.risk-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.risk-tag.danger {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
}

.risk-tag.warning {
  background: rgba(230, 162, 60, 0.2);
  color: #e6a23c;
}

.risk-tag.info {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.issue-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin-bottom: 8px;
}

.issue-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.safe-message {
  text-align: center;
  padding: 40px 0;
  color: #67c23a;
  font-size: 15px;
}

.forbidden-dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

.close-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: #fff;
  padding: 10px 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.close-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.success-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(103, 194, 58, 0.95);
  color: #fff;
  padding: 16px 32px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 8px 30px rgba(103, 194, 58, 0.4);
  z-index: 10000;
  animation: toastFadeIn 0.3s ease-out;
}

.success-icon {
  font-size: 20px;
}

@keyframes toastFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* 导入面板样式 */
.import-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  gap: 20px;
}

.import-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin: 0;
}

.import-button {
  min-width: 180px;
}

/* 导入弹窗样式 */
.import-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.import-dialog {
  background: #1e1e3c;
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(102, 126, 234, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.import-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
}

.import-dialog-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.import-dialog-content {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  max-height: 60vh;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 15px;
}

.copy-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.copy-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.copy-item:hover {
  background: rgba(102, 126, 234, 0.15);
  border-color: rgba(102, 126, 234, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
}

.copy-item.my-copy {
  border-left: 3px solid #667eea;
}

.copy-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.copy-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.my-tag {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.public-tag {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
  border: 1px solid rgba(103, 194, 58, 0.3);
}

.copy-content {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.import-dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

.cancel-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 10px 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}
</style>

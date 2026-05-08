import { ref, reactive, computed } from 'vue'
import { getTaskWebSocket } from '../utils/websocket'
import { getAuthHeaders } from '../utils/api.js'

const TASK_STORAGE_KEY = 'ai_task_state'
const TASK_TIMEOUT = 30 * 60 * 1000
const POLL_INTERVAL = 5000

const state = reactive({
  isActive: false,
  taskType: '',
  taskName: '',
  status: 'pending',
  taskId: null,
  serverTaskId: null,
  startTime: null,
  inputData: {},
  errorMessage: '',
  successMessage: '',
  isCancelling: false,
  progress: 0,
  progressMessage: '',
  outputUrl: ''
})

const listeners = ref([])
let pendingTaskFunction = null
const visibleState = ref(false)
let wsInitialized = false
let wsUnsubscribe = null
let pollTimer = null

function startPolling() {
  stopPolling()
  if (!state.serverTaskId) return

  pollTimer = setInterval(async () => {
    if (!state.serverTaskId || state.status === 'success' || state.status === 'error') {
      stopPolling()
      return
    }

    try {
      const response = await fetch(`/api/tasks/${state.serverTaskId}?_t=${Date.now()}`, {
        headers: {
          ...getAuthHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (response.status === 304 || !response.ok) {
        return
      }

      const task = await response.json()

      if (task.status === 'success') {
        state.progress = 100
        state.progressMessage = '任务完成'
        if (task.outputUrl) {
          state.outputUrl = task.outputUrl
        }
        completeTask('任务完成')
        stopPolling()
      } else if (task.status === 'error') {
        failTask(task.errorMessage || '任务执行失败')
        stopPolling()
      } else if (task.status === 'processing' && task.progress) {
        state.progress = task.progress
        if (task.progressMessage) {
          state.progressMessage = task.progressMessage
        }
        notifyListeners()
      } else if (task.status === 'timeout') {
        state.progressMessage = 'AI处理时间较长，任务转入后台执行'
        state.errorMessage = 'AI处理时间较长，任务转入后台执行'
        state.status = 'timeout'
        saveState()
        notifyListeners()
        stopPolling()
      }
    } catch (err) {
      console.error('[TaskManager] 轮询失败:', err)
    }
  }, POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function initWebSocket() {
  if (wsInitialized) return
  wsInitialized = true

  const ws = getTaskWebSocket()

  const userInfo = localStorage.getItem('userInfo')
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo)
      if (user?.id) {
        ws.authenticate(user.id)
      }
    } catch (e) {
      console.error('[TaskManager] 解析用户信息失败:', e)
    }
  }

  ws.on('task_update', (data) => {
    if (state.serverTaskId && data.taskId === state.serverTaskId) {
      if (data.progress !== undefined) {
        state.progress = data.progress
      }
      if (data.message) {
        state.progressMessage = data.message
      }
      if (data.status === 'processing' && state.status !== 'processing') {
        state.status = 'processing'
      }
      if (data.status === 'success') {
        state.progress = 100
        state.progressMessage = data.message || '任务完成'
        if (data.outputUrl) {
          state.outputUrl = data.outputUrl
        }
        completeTask(data.message || `${state.taskName}已完成`)
        stopPolling()
      }
      if (data.status === 'timeout') {
        state.progressMessage = data.message || 'AI处理时间较长，任务转入后台执行'
        state.errorMessage = data.message || 'AI处理时间较长，任务转入后台执行'
        state.status = 'timeout'
        saveState()
        notifyListeners()
      }
      if (data.status === 'error') {
        failTask(data.errorMessage || data.message || '任务执行失败')
        stopPolling()
      }
      if (data.status === 'cancelled') {
        clearState()
      }
      notifyListeners()
    }
  })

  ws.on('connected', () => {
    const userInfo = localStorage.getItem('userInfo')
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        if (user?.id) {
          ws.authenticate(user.id)
        }
      } catch (e) {}
    }
    if (state.serverTaskId) {
      ws.subscribeTask(state.serverTaskId)
    }
  })
}

function saveState() {
  try {
    const stateToSave = {
      ...state,
      listeners: []
    }
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(stateToSave))
  } catch (err) {
    console.error('❌ 保存任务状态失败:', err)
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(TASK_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)

      if (parsed.isActive && parsed.startTime) {
        const elapsed = Date.now() - parsed.startTime
        if (elapsed > TASK_TIMEOUT) {
          console.log('⏰ 已保存的任务已超时，清除')
          clearState()
          return false
        }

        Object.assign(state, parsed)
        visibleState.value = parsed.isActive
        console.log('🔄 从localStorage恢复任务状态:', state.taskType)
        return true
      }
    }
    return false
  } catch (err) {
    console.error('❌ 加载任务状态失败:', err)
    clearState()
    return false
  }
}

function clearState() {
  const ws = getTaskWebSocket()

  if (state.serverTaskId) {
    ws.unsubscribeTask(state.serverTaskId)
  }

  stopPolling()

  state.isActive = false
  visibleState.value = false
  state.taskType = ''
  state.taskName = ''
  state.status = 'pending'
  state.taskId = null
  state.serverTaskId = null
  state.startTime = null
  state.inputData = {}
  state.errorMessage = ''
  state.successMessage = ''
  state.isCancelling = false
  state.progress = 0
  state.progressMessage = ''
  state.outputUrl = ''

  try {
    localStorage.removeItem(TASK_STORAGE_KEY)
  } catch (err) {
    console.error('❌ 清除任务状态失败:', err)
  }

  notifyListeners()
}

function notifyListeners() {
  listeners.value.forEach((listener) => {
    try {
      listener({ ...state })
    } catch (err) {
      console.error('❌ 通知监听器失败:', err)
    }
  })
}

export function useTaskManager() {
  initWebSocket()

  const isVisible = computed(() => state.isActive)

  function subscribe(callback) {
    if (typeof callback === 'function' && !listeners.value.includes(callback)) {
      listeners.value.push(callback)
    }

    return () => {
      const index = listeners.value.indexOf(callback)
      if (index > -1) {
        listeners.value.splice(index, 1)
      }
    }
  }

  function startTask(taskType, taskName, inputData = {}) {
    console.log(`\n🚀 开始新任务: ${taskType} - ${taskName}`)

    state.isActive = true
    visibleState.value = true
    state.taskType = taskType
    state.taskName = taskName
    state.status = 'pending'
    state.taskId = `task_${Date.now()}`
    state.startTime = Date.now()
    state.inputData = inputData
    state.errorMessage = ''
    state.successMessage = ''
    state.isCancelling = false
    state.progress = 0
    state.progressMessage = '准备中...'

    saveState()
    notifyListeners()

    return state.taskId
  }

  function setServerTaskId(serverTaskId) {
    state.serverTaskId = serverTaskId
    const ws = getTaskWebSocket()

    if (!ws.isConnected) {
      ws.connect()
    }

    const userInfo = localStorage.getItem('userInfo')
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo)
        if (user?.id && !ws.userId) {
          ws.authenticate(user.id)
        }
      } catch (e) {}
    }

    ws.subscribeTask(serverTaskId)

    startPolling()

    saveState()
    notifyListeners()
  }

  function updateProgress(progress, message) {
    state.progress = Math.min(progress, 100)
    if (message) {
      state.progressMessage = message
    }
    notifyListeners()
  }

  function confirmTask() {
    console.log(`✅ 用户确认任务: ${state.taskType}`)

    state.status = 'processing'
    state.progress = 0
    state.progressMessage = '正在处理...'
    saveState()
    notifyListeners()

    if (pendingTaskFunction) {
      const taskFn = pendingTaskFunction
      pendingTaskFunction = null

      setTimeout(async () => {
        try {
          const result = await executeTask(taskFn)
          console.log('✅ 任务函数执行完成, 结果:', result)
        } catch (err) {
          console.error('❌ 任务执行出错:', err)
        }
      }, 100)
    }

    return true
  }

  function executeAfterConfirm(asyncFunction) {
    if (typeof asyncFunction !== 'function') {
      console.error('❌ executeAfterConfirm 需要传入一个函数, 实际收到:', typeof asyncFunction)
      return false
    }

    pendingTaskFunction = asyncFunction
    return true
  }

  async function executeTask(asyncFunction) {
    if (state.status !== 'processing') {
      console.warn('⚠️ 任务未处于processing状态，无法执行')
      return { success: false, error: '任务状态错误' }
    }

    try {
      console.log(`🎯 开始执行任务: ${state.taskType}`)
      const result = await asyncFunction()

      if (result && result.success !== false) {
        if (result.taskId) {
          setServerTaskId(result.taskId)
          state.status = 'processing'
          state.progressMessage = '任务已提交，等待处理...'
          saveState()
          notifyListeners()
        } else if (!state.serverTaskId) {
          completeTask(result.message || `${state.taskName}已完成`)
        }
      } else {
        failTask(result?.error || '任务执行失败')
      }

      return result
    } catch (err) {
      console.error(`❌ 任务执行异常: ${state.taskType}`, err)
      failTask(err.message || '任务执行出错')
      throw err
    }
  }

  function completeTask(message = '') {
    console.log(`🎉 任务完成: ${state.taskType}`)

    state.status = 'success'
    state.progress = 100
    state.progressMessage = message || '完成'
    state.successMessage = message || `${state.taskName}已完成`
    state.isCancelling = false

    stopPolling()
    saveState()

    setTimeout(() => {
      clearState()
    }, 3000)

    notifyListeners()
  }

  function failTask(errorMsg = '') {
    console.error(`💥 任务失败: ${state.taskType} - ${errorMsg}`)

    state.status = 'error'
    state.errorMessage = errorMsg || `${state.taskName}失败`
    state.isCancelling = false

    stopPolling()
    saveState()
    notifyListeners()
  }

  async function cancelTask() {
    if (!state.isActive || state.isCancelling) {
      console.warn('⚠️ 无法取消任务：任务不活跃或正在取消中')
      return false
    }

    console.log(`🛑 开始取消任务: ${state.taskType}`)
    state.isCancelling = true
    notifyListeners()

    try {
      const taskId = state.serverTaskId || state.taskId
      const response = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' })
      })

      const data = await response.json()
      console.log('📨 后端取消响应:', data)

      clearState()
      return true
    } catch (err) {
      console.error('❌ 取消任务请求失败（后端不可达）:', err)
      clearState()
      return true
    }
  }

  function closeDialog() {
    if (state.status === 'success' || state.status === 'error') {
      clearState()
    }
  }

  function restoreTask() {
    return loadState()
  }

  function getTaskInfo() {
    return { ...state }
  }

  function isTaskActive() {
    return state.isActive && state.status === 'processing'
  }

  function connectWebSocket() {
    const ws = getTaskWebSocket()
    if (!ws.isConnected) {
      ws.connect()
    }
  }

  return {
    state,
    visibleState,
    isVisible,
    startTask,
    setServerTaskId,
    updateProgress,
    confirmTask,
    executeTask,
    executeAfterConfirm,
    completeTask,
    failTask,
    cancelTask,
    closeDialog,
    restoreTask,
    getTaskInfo,
    isTaskActive,
    subscribe,
    connectWebSocket
  }
}

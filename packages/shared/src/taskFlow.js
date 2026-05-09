const TASK_STORAGE_KEY = 'ai_task_state'
const TASK_TIMEOUT = 30 * 60 * 1000
const DEFAULT_POLL_INTERVAL = 3000
const DEFAULT_WS_TIMEOUT = 30 * 60 * 1000

export function createTaskFlow(adapter) {
  const state = {
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
  }

  const listeners = []
  let wsInstance = null
  let wsInitialized = false
  let pollTimer = null
  let pendingTaskFunction = null

  function notifyListeners() {
    listeners.forEach(fn => {
      try { fn({ ...state }) } catch (e) {}
    })
  }

  function subscribe(fn) {
    if (typeof fn === 'function' && !listeners.includes(fn)) {
      listeners.push(fn)
    }
    return () => {
      const idx = listeners.indexOf(fn)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }

  function saveState() {
    try {
      adapter.setStorage(TASK_STORAGE_KEY, JSON.stringify({ ...state }))
    } catch (e) {}
  }

  function loadState() {
    try {
      const saved = adapter.getStorage(TASK_STORAGE_KEY)
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved
        if (parsed.isActive && parsed.startTime) {
          if (Date.now() - parsed.startTime > TASK_TIMEOUT) {
            clearState()
            return false
          }
          Object.assign(state, parsed)
          return true
        }
      }
    } catch (e) {}
    return false
  }

  function clearState() {
    if (state.serverTaskId && wsInstance) {
      try { wsInstance.unsubscribeTask(state.serverTaskId) } catch (e) {}
    }
    stopPolling()
    Object.assign(state, {
      isActive: false, taskType: '', taskName: '', status: 'pending',
      taskId: null, serverTaskId: null, startTime: null, inputData: {},
      errorMessage: '', successMessage: '', isCancelling: false,
      progress: 0, progressMessage: '', outputUrl: ''
    })
    try { adapter.removeStorage(TASK_STORAGE_KEY) } catch (e) {}
    notifyListeners()
  }

  function startTask(taskType, taskName, inputData = {}) {
    Object.assign(state, {
      isActive: true, taskType, taskName, status: 'pending',
      taskId: `task_${Date.now()}`, startTime: Date.now(),
      inputData, errorMessage: '', successMessage: '',
      isCancelling: false, progress: 0, progressMessage: '准备中...', outputUrl: ''
    })
    saveState()
    notifyListeners()
    return state.taskId
  }

  function setServerTaskId(serverTaskId) {
    state.serverTaskId = serverTaskId
    initWebSocket()
    if (wsInstance) {
      if (!wsInstance.isConnected) wsInstance.connect()
      const user = adapter.getUserInfo()
      if (user?.id && !wsInstance.userId) wsInstance.authenticate(user.id)
      wsInstance.subscribeTask(serverTaskId)
    }
    startPolling()
    saveState()
    notifyListeners()
  }

  function updateProgress(progress, message) {
    state.progress = Math.min(progress, 100)
    if (message) state.progressMessage = message
    notifyListeners()
  }

  function completeTask(message = '') {
    state.status = 'success'
    state.progress = 100
    state.progressMessage = message || '完成'
    state.successMessage = message || `${state.taskName}已完成`
    state.isCancelling = false
    stopPolling()
    saveState()
    const savedOutputUrl = state.outputUrl
    const savedTaskType = state.taskType
    notifyListeners()
    setTimeout(() => {
      Object.assign(state, {
        isActive: false, taskType: '', taskName: '', status: 'pending',
        taskId: null, serverTaskId: null, startTime: null, inputData: {},
        errorMessage: '', successMessage: '', isCancelling: false,
        progress: 0, progressMessage: ''
      })
      try { adapter.removeStorage(TASK_STORAGE_KEY) } catch (e) {}
      notifyListeners()
    }, 3000)
  }

  function failTask(errorMsg = '') {
    state.status = 'error'
    state.errorMessage = errorMsg || `${state.taskName}失败`
    state.isCancelling = false
    stopPolling()
    saveState()
    notifyListeners()
  }

  async function cancelTask() {
    if (!state.isActive || state.isCancelling) return false
    state.isCancelling = true
    notifyListeners()
    try {
      const taskId = state.serverTaskId || state.taskId
      await adapter.post(`/api/tasks/${taskId}/cancel`, {})
    } catch (e) {}
    clearState()
    return true
  }

  function initWebSocket() {
    if (wsInitialized) return
    wsInitialized = true
    wsInstance = adapter.createWebSocket()

    if (!wsInstance) return

    wsInstance.on('task_update', (data) => {
      if (state.serverTaskId && data.taskId === state.serverTaskId) {
        if (data.progress !== undefined) state.progress = data.progress
        if (data.message) state.progressMessage = data.message
        if (data.taskType) state.taskType = data.taskType
        if (data.status === 'processing' && state.status !== 'processing') state.status = 'processing'
        if (data.status === 'success') {
          state.progress = 100
          state.progressMessage = data.message || '任务完成'
          if (data.outputUrl) state.outputUrl = data.outputUrl
          completeTask(data.message || `${state.taskName}已完成`)
          stopPolling()
        }
        if (data.status === 'timeout') {
          state.progressMessage = data.message || 'AI处理时间较长，任务转入后台执行'
          state.errorMessage = state.progressMessage
          state.status = 'timeout'
          saveState()
          notifyListeners()
        }
        if (data.status === 'error') {
          failTask(data.errorMessage || data.message || '任务执行失败')
          stopPolling()
        }
        if (data.status === 'cancelled') clearState()
        notifyListeners()
      }
    })

    wsInstance.on('connected', () => {
      const user = adapter.getUserInfo()
      if (user?.id) wsInstance.authenticate(user.id)
      if (state.serverTaskId) wsInstance.subscribeTask(state.serverTaskId)
    })
  }

  function startPolling() {
    stopPolling()
    if (!state.serverTaskId) return
    pollTimer = adapter.setInterval(async () => {
      if (!state.serverTaskId || state.status === 'success' || state.status === 'error') {
        stopPolling()
        return
      }
      try {
        const task = await adapter.get(`/api/tasks/${state.serverTaskId}`, { _t: Date.now() })
        if (task.status === 'success' || (task.outputUrl && task.status !== 'error')) {
          state.progress = 100
          state.progressMessage = '任务完成'
          if (task.outputUrl) state.outputUrl = task.outputUrl
          completeTask('任务完成')
          stopPolling()
        } else if (task.status === 'error') {
          failTask(task.errorMessage || '任务执行失败')
          stopPolling()
        } else if (task.status === 'processing' && task.progress) {
          state.progress = task.progress
          if (task.progressMessage) state.progressMessage = task.progressMessage
          notifyListeners()
        } else if (task.status === 'timeout') {
          state.progressMessage = 'AI处理时间较长，任务转入后台执行'
          state.errorMessage = state.progressMessage
          state.status = 'timeout'
          saveState()
          notifyListeners()
          stopPolling()
        }
      } catch (e) {}
    }, DEFAULT_POLL_INTERVAL)
  }

  function stopPolling() {
    if (pollTimer) {
      adapter.clearInterval(pollTimer)
      pollTimer = null
    }
  }

  async function submitTask(endpoint, payload, options = {}) {
    const taskType = options.taskType || 'unknown'
    const taskName = options.taskName || 'AI任务'

    if (state.isActive && state.status === 'processing') {
      return { success: false, error: '当前有任务正在执行' }
    }

    startTask(taskType, taskName, payload)
    state.status = 'processing'
    state.progressMessage = '正在提交任务...'
    saveState()
    notifyListeners()

    try {
      const response = await adapter.post(endpoint, payload)

      const directUrl = response.outputUrl || response.audioUrl || response.videoUrl || response.url || response.fileUrl
      if (directUrl && response.success !== false) {
        state.outputUrl = directUrl
        completeTask(taskName + '完成')
        return { success: true, outputUrl: directUrl, data: response }
      }

      if (response.taskId) {
        setServerTaskId(response.taskId)
        state.status = 'processing'
        state.progressMessage = '任务已提交，等待处理...'
        saveState()
        notifyListeners()
        return { success: true, taskId: response.taskId, data: response }
      }

      const errorMsg = response.error || response.message || '提交任务失败'
      failTask(errorMsg)
      return { success: false, error: errorMsg, data: response }
    } catch (err) {
      const errorMsg = err.message || '网络错误'
      failTask(errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  async function waitForTask(taskId, options = {}) {
    const timeout = options.timeout || DEFAULT_WS_TIMEOUT
    const pollInterval = options.pollInterval || DEFAULT_POLL_INTERVAL

    return new Promise((resolve) => {
      let resolved = false

      if (wsInstance) {
        if (!wsInstance.isConnected) wsInstance.connect()
        const user = adapter.getUserInfo()
        if (user?.id && !wsInstance.userId) wsInstance.authenticate(user.id)
        wsInstance.subscribeTask(taskId)

        const handler = (data) => {
          if (data.taskId !== taskId || resolved) return
          if (data.progress !== undefined && options.onProgress) {
            options.onProgress(data.progress, data.message)
          }
          if (data.status === 'success') {
            resolved = true
            wsInstance.off('task_update', handler)
            stopPollingInternal()
            resolve({ success: true, outputUrl: data.outputUrl, data })
          } else if (data.status === 'error') {
            resolved = true
            wsInstance.off('task_update', handler)
            stopPollingInternal()
            resolve({ success: false, error: data.errorMessage || '任务执行失败', data })
          } else if (data.status === 'timeout') {
            resolved = true
            wsInstance.off('task_update', handler)
            stopPollingInternal()
            resolve({ success: false, error: 'AI处理时间较长，任务已转入后台执行', data, isTimeout: true })
          }
        }
        wsInstance.on('task_update', handler)
      }

      let internalTimer = null
      const startTime = Date.now()

      function startPollingInternal() {
        internalTimer = adapter.setInterval(async () => {
          if (resolved) return
          try {
            const task = await adapter.get(`/api/tasks/${taskId}`, { _t: Date.now() })
            if (task.status === 'success' || (task.outputUrl && task.status !== 'error')) {
              resolved = true
              stopPollingInternal()
              resolve({ success: true, outputUrl: task.outputUrl, data: task })
            } else if (task.status === 'error') {
              resolved = true
              stopPollingInternal()
              resolve({ success: false, error: task.errorMessage || '任务执行失败', data: task })
            } else if (task.status === 'timeout') {
              resolved = true
              stopPollingInternal()
              resolve({ success: false, error: 'AI处理时间较长，任务已转入后台执行', data: task, isTimeout: true })
            } else if (task.progress !== undefined && options.onProgress) {
              options.onProgress(task.progress, task.progressMessage)
            }
          } catch (e) {}
          if (!resolved && Date.now() - startTime > timeout) {
            resolved = true
            stopPollingInternal()
            resolve({ success: false, error: '等待任务结果超时' })
          }
        }, pollInterval)
      }

      function stopPollingInternal() {
        if (internalTimer) {
          adapter.clearInterval(internalTimer)
          internalTimer = null
        }
      }

      startPollingInternal()

      setTimeout(() => {
        if (!resolved) {
          resolved = true
          stopPollingInternal()
          resolve({ success: false, error: '等待任务结果超时' })
        }
      }, timeout)
    })
  }

  async function executeTask(asyncFunction) {
    if (state.status !== 'processing') {
      return { success: false, error: '任务状态错误' }
    }
    try {
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
      failTask(err.message || '任务执行出错')
      throw err
    }
  }

  function executeAfterConfirm(asyncFunction) {
    if (typeof asyncFunction !== 'function') return false
    pendingTaskFunction = asyncFunction
    return true
  }

  function confirmTask() {
    if (state.status !== 'pending') return
    state.status = 'processing'
    state.progress = 0
    state.progressMessage = '正在处理...'
    saveState()
    notifyListeners()
    if (pendingTaskFunction) {
      const taskFn = pendingTaskFunction
      pendingTaskFunction = null
      setTimeout(async () => {
        try { await executeTask(taskFn) } catch (e) {}
      }, 100)
    }
    return true
  }

  function restoreTask() {
    return loadState()
  }

  function getState() {
    return { ...state }
  }

  function isTaskActive() {
    return state.isActive && state.status === 'processing'
  }

  function connectWebSocket() {
    initWebSocket()
    if (wsInstance && !wsInstance.isConnected) wsInstance.connect()
  }

  return {
    state,
    subscribe,
    startTask,
    setServerTaskId,
    updateProgress,
    executeTask,
    executeAfterConfirm,
    confirmTask,
    completeTask,
    failTask,
    cancelTask,
    clearState,
    restoreTask,
    getState,
    isTaskActive,
    connectWebSocket,
    submitTask,
    waitForTask,
    notifyListeners
  }
}

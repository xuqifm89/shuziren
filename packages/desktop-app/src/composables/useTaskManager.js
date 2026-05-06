import { ref, reactive, computed } from 'vue'

const TASK_STORAGE_KEY = 'ai_task_state'
const TASK_TIMEOUT = 30 * 60 * 1000

const state = reactive({
  isActive: false,
  taskType: '',
  taskName: '',
  status: 'pending',
  taskId: null,
  startTime: null,
  inputData: {},
  errorMessage: '',
  successMessage: '',
  isCancelling: false
})

const listeners = ref([])
let pendingTaskFunction = null
const visibleState = ref(false)

function saveState() {
  try {
    const stateToSave = {
      ...state,
      listeners: []
    }
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(stateToSave))
    console.log('💾 任务状态已保存到localStorage')
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
        visibleState.value = parsed.isActive  // ✅ 恢复可见状态
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
  state.isActive = false
  visibleState.value = false  // ✅ 更新可见状态
  state.taskType = ''
  state.taskName = ''
  state.status = 'pending'
  state.taskId = null
  state.startTime = null
  state.inputData = {}
  state.errorMessage = ''
  state.successMessage = ''
  state.isCancelling = false

  try {
    localStorage.removeItem(TASK_STORAGE_KEY)
    console.log('🗑️ 任务状态已清除')
  } catch (err) {
    console.error('❌ 清除任务状态失败:', err)
  }

  notifyListeners()
}

function notifyListeners() {
  console.log('🔔 notifyListeners 被调用，监听器数量:', listeners.value.length)
  console.log('📋 当前状态快照:', { ...state })

  listeners.value.forEach((listener, index) => {
    try {
      const stateSnapshot = { ...state }
      console.log(`📤 通知监听器 #${index}:`, stateSnapshot)
      listener(stateSnapshot)
    } catch (err) {
      console.error(`❌ 通知监听器 #${index} 失败:`, err)
    }
  })
}

export function useTaskManager() {
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
    visibleState.value = true  // ✅ 更新可见状态
    state.taskType = taskType
    state.taskName = taskName
    state.status = 'pending'
    state.taskId = `task_${Date.now()}`
    state.startTime = Date.now()
    state.inputData = inputData
    state.errorMessage = ''
    state.successMessage = ''
    state.isCancelling = false

    console.log('✅ 任务状态已设置:', {
      isActive: state.isActive,
      visibleState: visibleState.value,  // 添加日志
      taskType: state.taskType,
      status: state.status
    })

    saveState()
    notifyListeners()

    console.log('📢 已通知监听器，当前监听器数量:', listeners.value.length)

    return state.taskId
  }

  function confirmTask() {
    console.log(`✅ 用户确认任务: ${state.taskType}`)
    console.log('📋 [confirmTask] 当前 pendingTaskFunction:', pendingTaskFunction ? '存在' : '不存在')

    state.status = 'processing'
    saveState()
    notifyListeners()

    if (pendingTaskFunction) {
      console.log('🎯 [confirmTask] 准备执行待注册的任务函数...')
      const taskFn = pendingTaskFunction
      pendingTaskFunction = null

      setTimeout(async () => {
        console.log('⏰ [setTimeout] 开始执行任务函数...')
        console.log('📊 [setTimeout] 当前状态:', state.status)
        try {
          const result = await executeTask(taskFn)
          console.log('✅ [setTimeout] 任务函数执行完成, 结果:', result)
        } catch (err) {
          console.error('❌ [setTimeout] 任务执行出错:', err)
        }
      }, 100)
    } else {
      console.warn('⚠️ [confirmTask] 没有待执行的任务函数！')
    }

    return true
  }

  function executeAfterConfirm(asyncFunction) {
    console.log('🔍 [executeAfterConfirm] 接收到参数:', typeof asyncFunction, asyncFunction ? '非空' : '空')
    
    if (typeof asyncFunction !== 'function') {
      console.error('❌ executeAfterConfirm 需要传入一个函数, 实际收到:', typeof asyncFunction)
      return false
    }

    pendingTaskFunction = asyncFunction
    console.log(`📝 [executeAfterConfirm] 已注册待执行任务函数: ${state.taskType}`)
    console.log('💾 [executeAfterConfirm] pendingTaskFunction 已保存:', pendingTaskFunction ? '成功' : '失败')
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
        completeTask(result.message || `${state.taskName}已完成`)
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
    state.successMessage = message || `${state.taskName}已完成`
    state.isCancelling = false

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
      const token = localStorage.getItem('token')
      const taskId = state.serverTaskId || state.taskId
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      })

      const data = await response.json()
      console.log('📨 后端取消响应:', data)

      console.log(`✅ 任务已成功取消（前端）: ${state.taskType}`)
      clearState()
      return true
    } catch (err) {
      console.error('❌ 取消任务请求失败（后端不可达）:', err)
      console.log('✅ 但仍然在前端清除任务状态')
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

  return {
    state,
    visibleState,  // ✅ 导出可见状态
    isVisible,
    startTask,
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
    subscribe
  }
}

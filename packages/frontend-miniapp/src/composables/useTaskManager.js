import { createTaskFlow } from '../../../shared/src/taskFlow.js'
import { createMiniappAdapter } from '../../../shared/src/adapters/miniapp.js'

const adapter = createMiniappAdapter()
const taskFlow = createTaskFlow(adapter)

class TaskManager {
  constructor() {
    this._state = {
      isActive: false, taskType: '', taskName: '', status: 'pending',
      progress: 0, errorMessage: '', successMessage: '', isCancelling: false,
      progressMessage: '', taskData: null, outputUrl: ''
    }
    this._listeners = []
    this._confirmCallback = null
    this._progressInterval = null
    this._hintInterval = null
    this._hintIndex = 0
    this._hasRealProgress = false
    this._hints = [
      '正在连接服务器...', '任务已加入队列...', 'AI模型准备中...',
      '内容生成中...', '请耐心等待...', '即将完成...'
    ]

    taskFlow.subscribe((newState) => {
      if (newState.serverTaskId && newState.status === 'processing') {
        this._hasRealProgress = true
      }
      this._setState({
        isActive: newState.isActive,
        taskType: newState.taskType,
        taskName: newState.taskName,
        status: newState.status,
        progress: newState.progress,
        errorMessage: newState.errorMessage,
        successMessage: newState.successMessage,
        isCancelling: newState.isCancelling,
        progressMessage: newState.progressMessage,
        outputUrl: newState.outputUrl
      })
      if (this._hasRealProgress && (this._progressInterval || this._hintInterval)) {
        this._stopProgressAnimation()
      }
    })
  }

  subscribe(listener) { this._listeners.push(listener) }
  unsubscribe(listener) { this._listeners = this._listeners.filter(l => l !== listener) }
  _notify() { this._listeners.forEach(l => l({ ...this._state })) }
  _setState(partial) { Object.assign(this._state, partial); this._notify() }

  startTask(taskType, taskName, data) {
    this._stopProgressAnimation()
    this._confirmCallback = null
    this._hintIndex = 0
    this._hasRealProgress = false
    taskFlow.startTask(taskType, taskName, data)
    this._startProgressAnimation()
  }

  executeAfterConfirm(fn) { this._confirmCallback = fn }

  confirmTask() {
    if (this._state.status !== 'pending') return
    this._setState({ status: 'processing', progress: 0, progressMessage: this._hints[0] })
    taskFlow.confirmTask()
    if (this._confirmCallback) {
      Promise.resolve(this._confirmCallback()).then((result) => {
        if (result && result.success) {
          this.succeed(result.message || '处理完成')
        } else if (result && !result.success) {
          this.fail(result.message || '处理失败')
        }
      }).catch((err) => {
        this.fail(err.message || '处理失败')
      })
    }
  }

  updateProgress(progress, message) { taskFlow.updateProgress(progress, message) }

  succeed(message) {
    this._stopProgressAnimation()
    this._setState({ status: 'success', successMessage: message || '处理完成', progress: 100, progressMessage: '' })
  }

  fail(message) {
    this._stopProgressAnimation()
    this._setState({ status: 'error', errorMessage: message || '处理失败', progressMessage: '' })
  }

  async cancelTask() { return taskFlow.cancelTask() }

  closeDialog() {
    this._stopProgressAnimation()
    if (this._state.status === 'timeout') {
      taskFlow.dismissTimeoutTask()
    } else {
      taskFlow.clearState()
    }
  }

  _startProgressAnimation() {
    this._progressInterval = setInterval(() => {
      if (this._hasRealProgress) return
      if (this._state.progress < 85) {
        const increment = Math.random() * 2
        const newProgress = Math.min(this._state.progress + increment, 85)
        this._setState({ progress: newProgress })
      }
    }, 800)
    this._hintInterval = setInterval(() => {
      if (this._hasRealProgress) return
      this._hintIndex = (this._hintIndex + 1) % this._hints.length
      this._setState({ progressMessage: this._hints[this._hintIndex] })
    }, 3000)
  }

  _stopProgressAnimation() {
    if (this._progressInterval) { clearInterval(this._progressInterval); this._progressInterval = null }
    if (this._hintInterval) { clearInterval(this._hintInterval); this._hintInterval = null }
  }

  _saveState() {
    try { uni.setStorageSync('ai_task_state', JSON.stringify(this._state)) } catch (e) {}
  }

  restoreTask() {
    const restored = taskFlow.restoreTask()
    if (restored) {
      const flowState = taskFlow.getState()
      this._hasRealProgress = !!flowState.serverTaskId
      this._setState({
        isActive: flowState.isActive,
        taskType: flowState.taskType,
        taskName: flowState.taskName,
        status: flowState.status,
        progress: flowState.progress,
        errorMessage: flowState.errorMessage,
        successMessage: flowState.successMessage,
        isCancelling: flowState.isCancelling,
        progressMessage: flowState.progressMessage,
        outputUrl: flowState.outputUrl
      })
      if (flowState.isActive && flowState.status === 'processing' && !this._hasRealProgress) {
        this._startProgressAnimation()
      }
    }
    return restored
  }

  submitTask(endpoint, payload, options = {}) {
    return taskFlow.submitTask(endpoint, payload, options)
  }

  waitForTask(taskId, options = {}) {
    return taskFlow.waitForTask(taskId, options)
  }
}

let instance = null

export function useTaskManager() {
  if (!instance) instance = new TaskManager()
  return instance
}

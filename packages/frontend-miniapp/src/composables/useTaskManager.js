const TASK_STATE_KEY = 'ai_task_state'

class TaskManager {
  constructor() {
    this._state = {
      isActive: false, taskType: '', taskName: '', status: 'pending',
      progress: 0, errorMessage: '', successMessage: '', isCancelling: false,
      progressMessage: '', taskData: null
    }
    this._listeners = []
    this._confirmCallback = null
    this._progressInterval = null
    this._hintInterval = null
    this._hintIndex = 0
    this._hints = [
      '正在连接服务器...', '任务已加入队列...', 'AI模型准备中...',
      '内容生成中...', '请耐心等待...', '即将完成...'
    ]
  }

  subscribe(listener) { this._listeners.push(listener) }
  unsubscribe(listener) { this._listeners = this._listeners.filter(l => l !== listener) }
  _notify() { this._listeners.forEach(l => l({ ...this._state })) }
  _setState(partial) { Object.assign(this._state, partial); this._notify() }

  startTask(taskType, taskName, data) {
    this._stopProgressAnimation()
    this._confirmCallback = null
    this._hintIndex = 0
    this._setState({
      isActive: true, taskType, taskName, status: 'pending', progress: 0,
      errorMessage: '', successMessage: '', isCancelling: false,
      progressMessage: '', taskData: data || null
    })
    this._saveState()
  }

  executeAfterConfirm(fn) {
    this._confirmCallback = fn
  }

  confirmTask() {
    if (this._state.status !== 'pending') return
    this._setState({ status: 'processing', progress: 0, progressMessage: this._hints[0] })
    this._startProgressAnimation()
    this._saveState()
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

  updateProgress(progress, message) {
    const update = { progress }
    if (message) update.progressMessage = message
    this._setState(update)
    this._saveState()
  }

  succeed(message) {
    this._stopProgressAnimation()
    this._setState({ status: 'success', successMessage: message || '处理完成', progress: 100, progressMessage: '' })
    this._saveState()
  }

  fail(message) {
    this._stopProgressAnimation()
    this._setState({ status: 'error', errorMessage: message || '处理失败', progressMessage: '' })
    this._saveState()
  }

  async cancelTask() {
    this._stopProgressAnimation()
    this._setState({ status: 'error', errorMessage: '任务已取消', isCancelling: false, isActive: false })
    uni.removeStorageSync(TASK_STATE_KEY)
  }

  closeDialog() {
    this._stopProgressAnimation()
    this._setState({ isActive: false })
    uni.removeStorageSync(TASK_STATE_KEY)
  }

  _startProgressAnimation() {
    this._progressInterval = setInterval(() => {
      if (this._state.progress < 90) {
        const increment = Math.random() * 3
        const newProgress = Math.min(this._state.progress + increment, 90)
        this._setState({ progress: newProgress })
      }
    }, 800)

    this._hintInterval = setInterval(() => {
      this._hintIndex = (this._hintIndex + 1) % this._hints.length
      this._setState({ progressMessage: this._hints[this._hintIndex] })
    }, 3000)
  }

  _stopProgressAnimation() {
    if (this._progressInterval) { clearInterval(this._progressInterval); this._progressInterval = null }
    if (this._hintInterval) { clearInterval(this._hintInterval); this._hintInterval = null }
  }

  _saveState() {
    try { uni.setStorageSync(TASK_STATE_KEY, JSON.stringify(this._state)) } catch (e) {}
  }

  restoreTask() {
    try {
      const saved = uni.getStorageSync(TASK_STATE_KEY)
      if (saved) {
        const state = typeof saved === 'string' ? JSON.parse(saved) : saved
        if (state.isActive) {
          if (state.status === 'processing') {
            this._setState(state)
            this._startProgressAnimation()
            return true
          }
          if (state.status === 'success' || state.status === 'error') {
            this._setState(state)
            return true
          }
          if (state.status === 'pending') {
            this._setState({ isActive: false })
            uni.removeStorageSync(TASK_STATE_KEY)
            return false
          }
        }
      }
    } catch (e) {}
    return false
  }
}

export function useTaskManager() {
  return new TaskManager()
}

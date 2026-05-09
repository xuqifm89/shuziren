import { ref, reactive, computed } from 'vue'
import { createTaskFlow } from '../../../shared/src/taskFlow.js'
import { createWebAdapter } from '../../../shared/src/adapters/web.js'

const adapter = createWebAdapter({
  apiBase: 'http://localhost:3001',
  getAuthHeaders: () => {
    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || '') : ''
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }
})
const taskFlow = createTaskFlow(adapter)

const visibleState = ref(taskFlow.state.isActive)

taskFlow.subscribe((newState) => {
  visibleState.value = newState.isActive
})

export function useTaskManager() {
  const state = reactive(taskFlow.state)
  const isVisible = computed(() => state.isActive)

  function subscribe(callback) {
    return taskFlow.subscribe(callback)
  }

  return {
    state,
    visibleState,
    isVisible,
    subscribe,
    startTask: taskFlow.startTask,
    setServerTaskId: taskFlow.setServerTaskId,
    updateProgress: taskFlow.updateProgress,
    executeTask: taskFlow.executeTask,
    executeAfterConfirm: taskFlow.executeAfterConfirm,
    confirmTask: taskFlow.confirmTask,
    completeTask: taskFlow.completeTask,
    failTask: taskFlow.failTask,
    cancelTask: taskFlow.cancelTask,
    clearState: taskFlow.clearState,
    restoreTask: taskFlow.restoreTask,
    getTaskInfo: taskFlow.getState,
    isTaskActive: taskFlow.isTaskActive,
    connectWebSocket: taskFlow.connectWebSocket,
    submitTask: taskFlow.submitTask,
    waitForTask: taskFlow.waitForTask
  }
}

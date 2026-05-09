const Task = require('../models/Task');
const wsManager = require('../websocket/WebSocketManager');
const RunningHubAI = require('./runningHubAI');
const { getDynamicConfig } = require('../config/apiConfig');

class TaskService {
  async createTask(data) {
    const task = await Task.create({
      taskType: data.taskType,
      status: 'pending',
      inputData: data.inputData || {},
      progress: 0
    });

    this.broadcastUpdate(task.id, {
      status: 'pending',
      progress: 0,
      taskType: task.taskType
    });

    return task;
  }

  async updateProgress(taskId, progress, message) {
    const task = await Task.findByPk(taskId);
    if (!task) return null;

    await task.update({
      status: 'processing',
      progress: Math.min(progress, 99)
    });

    this.broadcastUpdate(taskId, {
      status: 'processing',
      progress: task.progress,
      taskType: task.taskType,
      message: message || this.getProgressMessage(task.taskType, progress)
    });

    return task;
  }

  async completeTask(taskId, outputUrl) {
    const task = await Task.findByPk(taskId);
    if (!task) return null;

    if (task.status === 'cancelled') {
      return task;
    }

    await task.update({
      status: 'success',
      progress: 100,
      outputUrl: outputUrl || task.outputUrl
    });

    this.broadcastUpdate(taskId, {
      status: 'success',
      progress: 100,
      outputUrl: task.outputUrl,
      taskType: task.taskType,
      message: this.getCompletionMessage(task.taskType)
    });

    return task;
  }

  async failTask(taskId, errorMessage) {
    const task = await Task.findByPk(taskId);
    if (!task) return null;

    if (task.status === 'cancelled' || task.status === 'success') {
      return task;
    }

    await task.update({
      status: 'error',
      errorMessage: errorMessage || '任务执行失败'
    });

    this.broadcastUpdate(taskId, {
      status: 'error',
      taskType: task.taskType,
      errorMessage: task.errorMessage,
      message: '任务执行失败'
    });

    return task;
  }

  async cancelTask(taskId) {
    const task = await Task.findByPk(taskId);
    if (!task) return null;

    if (task.status === 'cancelled' || task.status === 'success') {
      return task;
    }

    if (task.runningHubTaskId) {
      try {
        const config = await getDynamicConfig();
        const runningHubAI = new RunningHubAI(config.runningHub.apiKey);
        const cancelResult = await runningHubAI.cancelTask(task.runningHubTaskId);
        console.log(`📡 RunningHub 取消结果:`, cancelResult.success ? '成功' : cancelResult.error);
      } catch (err) {
        console.error(`⚠️ 取消 RunningHub 任务异常（非致命）:`, err.message);
      }
    }

    await task.update({
      status: 'cancelled',
      errorMessage: '用户取消任务'
    });

    this.broadcastUpdate(taskId, {
      status: 'cancelled',
      message: '任务已取消'
    });

    return task;
  }

  async getTask(taskId) {
    return await Task.findByPk(taskId);
  }

  async updateRunningHubTaskId(taskId, runningHubTaskId) {
    const task = await Task.findByPk(taskId);
    if (!task) return null;

    await task.update({ runningHubTaskId });
    return task;
  }

  async getTasksByStatus(status) {
    return await Task.findAll({
      where: { status },
      order: [['createdAt', 'DESC']]
    });
  }

  async getTasksByType(taskType) {
    return await Task.findAll({
      where: { taskType },
      order: [['createdAt', 'DESC']]
    });
  }

  broadcastUpdate(taskId, data) {
    wsManager.broadcastTaskUpdate(taskId, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  getProgressMessage(taskType, progress) {
    const messages = {
      'video_generation': {
        10: '正在准备视频素材...',
        30: 'AI模型加载中...',
        50: '视频生成中...',
        70: '视频渲染中...',
        90: '视频即将完成...'
      },
      'audio_generation': {
        10: '正在准备音频素材...',
        30: 'AI语音合成中...',
        50: '音频生成中...',
        70: '音频处理中...',
        90: '音频即将完成...'
      },
      'text_generation': {
        10: '正在分析需求...',
        30: 'AI文本生成中...',
        50: '内容创作中...',
        70: '文本优化中...',
        90: '即将完成...'
      },
      'image_generation': {
        10: '正在准备图片素材...',
        30: 'AI图片生成中...',
        50: '图片渲染中...',
        70: '图片处理中...',
        90: '图片即将完成...'
      }
    };

    const typeMessages = messages[taskType] || messages['video_generation'];
    let message = '处理中...';

    const thresholds = Object.keys(typeMessages).map(Number).sort((a, b) => a - b);
    for (const threshold of thresholds) {
      if (progress >= threshold) {
        message = typeMessages[threshold];
      }
    }

    return message;
  }

  getCompletionMessage(taskType) {
    const messages = {
      'video_generation': '视频生成完成！',
      'audio_generation': '音频生成完成！',
      'text_generation': '文本生成完成！',
      'image_generation': '图片生成完成！'
    };
    return messages[taskType] || '任务完成！';
  }
}

module.exports = new TaskService();

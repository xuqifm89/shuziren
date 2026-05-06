const axios = require('axios');
const { getDynamicConfig } = require('../config/apiConfig');

class RunningHubAPI {
  constructor(apiKey, baseUrl = 'https://www.runninghub.cn/api') {
    this._apiKey = apiKey;
    this._baseUrl = baseUrl;
    this._configPromise = null;
    this.client = null;
  }

  async _getConfig() {
    if (!this._configPromise) {
      this._configPromise = getDynamicConfig();
    }
    return this._configPromise;
  }

  async getApiKey() {
    if (this._apiKey) return this._apiKey;
    
    const config = await this._getConfig();
    return config.runningHub.apiKey || '';
  }

  async getBaseUrl() {
    if (this._baseUrl && this._baseUrl !== 'https://www.runninghub.cn/api') return this._baseUrl;
    
    const config = await this._getConfig();
    return (config.runningHub.baseUrl || 'https://www.runninghub.cn') + '/api';
  }

  async getClient() {
    if (!this.client) {
      const apiKey = await this.getApiKey();
      const baseUrl = await this.getBaseUrl();
      
      this.client = axios.create({
        baseURL: baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 300000
      });
    }
    return this.client;
  }

  async executeWorkflow(workflowId, params = {}, outputFiles = false) {
    try {
      const client = await this.getClient();
      const response = await client.post('/v1/workflow/execute', {
        workflow_id: workflowId,
        inputs: params,
        output_files
      });
      return {
        success: true,
        taskId: response.data.task_id,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getTaskStatus(taskId) {
    try {
      const client = await this.getClient();
      const response = await client.get(`/v1/workflow/task/${taskId}`);
      const status = response.data;
      
      const statusMap = {
        'pending': '等待中',
        'running': '运行中',
        'completed': '已完成',
        'failed': '失败'
      };
      
      return {
        success: true,
        status: status.status,
        statusText: statusMap[status.status] || status.status,
        result: status.result,
        error: status.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async waitForCompletion(taskId, maxWaitMs = 600000, checkIntervalMs = 2000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.getTaskStatus(taskId);
      
      if (result.status === 'completed') {
        return result;
      }
      if (result.status === 'failed') {
        return result;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
    
    return {
      success: false,
      error: '任务超时'
    };
  }

  async generateText(prompt, workflowId, options = {}) {
    const params = {
      prompt: prompt,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      ...options
    };
    return await this.executeWorkflow(workflowId, params, true);
  }

  async generateAudio(text, voiceId, workflowId, options = {}) {
    const params = {
      text: text,
      voice_id: voiceId,
      ...options
    };
    return await this.executeWorkflow(workflowId, params, true);
  }

  async generateVideo(audioPath, avatarId, workflowId, options = {}) {
    const params = {
      audio_path: audioPath,
      avatar_id: avatarId,
      ...options
    };
    return await this.executeWorkflow(workflowId, params, true);
  }
}

module.exports = RunningHubAPI;

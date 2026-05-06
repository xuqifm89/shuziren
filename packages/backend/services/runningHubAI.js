const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const WebSocket = require('ws');
const { getDynamicConfig } = require('../config/apiConfig');

class RunningHubAI {
  constructor(apiKey) {
    this._apiKey = apiKey;
    this._configPromise = null;
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
    return config.runningHub.apiKey;
  }

  async getBaseUrl() {
    const config = await this._getConfig();
    return config.runningHub.baseUrl || 'https://www.runninghub.cn';
  }

  async uploadFile(filePath) {
    console.log(`📤 开始上传文件: ${filePath}`);
    
    try {
      const apiKey = await this.getApiKey();
      const baseUrl = await this.getBaseUrl();
      
      const absolutePath = path.resolve(filePath);
      const fileName = path.basename(filePath);
      const fileStats = fs.statSync(absolutePath);
      
      console.log(`   绝对路径: ${absolutePath}`);
      console.log(`   文件名: ${fileName}`);
      console.log(`   文件大小: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

      const curlCommand = `curl -X POST '${baseUrl}/task/openapi/upload' ` +
        `-H 'Authorization: Bearer ${apiKey}' ` +
        `-H 'Host: www.runninghub.cn' ` +
        `-F 'apiKey=${apiKey}' ` +
        `-F 'fileType=input' ` +
        `-F 'file=@${absolutePath}'`;

      console.log(`   执行 curl 上传...`);
      
      const result = execSync(curlCommand, {
        encoding: 'utf-8',
        timeout: 120000
      });

      const response = JSON.parse(result);
      
      if (response.code === 0 && response.data) {
        console.log(`✅ 文件上传成功!`);
        console.log(`   fileName: ${response.data.fileName}`);
        return {
          success: true,
          fileName: response.data.fileName,
          downloadUrl: response.data.download_url
        };
      } else {
        console.log(`❌ 文件上传失败: ${response.msg}`);
        return { success: false, error: response.msg };
      }
    } catch (error) {
      console.log(`❌ 文件上传失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async runAIApp(webappId, nodeInfoList, options = {}) {
    const maxRetries = options.maxRetries || 3;
    let lastError;
    let lastResponse = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const apiKey = await this.getApiKey();
        const baseUrl = await this.getBaseUrl();
        
        const requestData = {
          apiKey: apiKey,
          webappId: String(webappId),
          nodeInfoList: nodeInfoList,
          instanceType: options.instanceType || 'default'
        };

        if (options.usePersonalQueue !== undefined) {
          requestData.usePersonalQueue = options.usePersonalQueue;
        }

        console.log('📤 发送到 RunningHub 的完整请求:', JSON.stringify(requestData, null, 2));

        const response = await axios.post(`${baseUrl}/task/openapi/ai-app/run`, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        });

        console.log('📥 RunningHub 完整响应:', JSON.stringify(response.data, null, 2));

        if (response.data.code === 0 && response.data.data) {
          console.log(`✅ 任务发起成功 (第 ${attempt} 次尝试)`);
          return {
            success: true,
            taskId: response.data.data.taskId,
            clientId: response.data.data.clientId,
            netWssUrl: response.data.data.netWssUrl,
            taskStatus: response.data.data.taskStatus
          };
        } else {
          const errorMsg = response.data.msg;
          console.log(`⚠️ 任务发起失败 (第 ${attempt} 次尝试): ${errorMsg}`);
          lastError = errorMsg;
          lastResponse = response.data;

          if (errorMsg === 'TASK_QUEUE_MAXED' && attempt < maxRetries) {
            const waitTime = attempt * 3000;
            console.log(`⏳ 等待 ${waitTime / 1000} 秒后重试...`);
            await this.sleep(waitTime);
          } else {
            break;
          }
        }
      } catch (error) {
        console.log(`⚠️ 请求异常 (第 ${attempt} 次尝试): ${error.message}`);
        lastError = error.message;
        lastResponse = error.response?.data;
        if (attempt < maxRetries) {
          await this.sleep(attempt * 2000);
        }
      }
    }

    return { success: false, error: lastError, fullResponse: lastResponse };
  }

  async runAIAppRaw(webappId, nodeInfoList, options = {}) {
    console.log('📤 runAIAppRaw 开始...');
    console.log('   webappId:', webappId);
    console.log('   nodeInfoList:', JSON.stringify(nodeInfoList, null, 2));
    console.log('   options:', JSON.stringify(options, null, 2));

    const apiKey = await this.getApiKey();
    const baseUrl = await this.getBaseUrl();
    
    const requestData = {
      apiKey: apiKey,
      webappId: String(webappId),
      nodeInfoList: nodeInfoList,
      instanceType: options.instanceType || 'default'
    };

    if (options.usePersonalQueue !== undefined) {
      requestData.usePersonalQueue = options.usePersonalQueue;
    }

    console.log('📤 发送到 RunningHub 的完整请求:', JSON.stringify(requestData, null, 2));

    try {
      const response = await axios.post(`${baseUrl}/task/openapi/ai-app/run`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      console.log('📥 RunningHub 完整响应:', JSON.stringify(response.data, null, 2));

      if (response.data.code === 0 && response.data.data) {
        return {
          success: true,
          taskId: response.data.data.taskId,
          clientId: response.data.data.clientId,
          netWssUrl: response.data.data.netWssUrl,
          taskStatus: response.data.data.taskStatus,
          fullResponse: response.data
        };
      } else {
        return {
          success: false,
          error: response.data.msg,
          code: response.data.code,
          fullResponse: response.data
        };
      }
    } catch (error) {
      console.log('⚠️ 请求异常:', error.message);
      console.log('⚠️ 错误响应:', JSON.stringify(error.response?.data, null, 2));
      return {
        success: false,
        error: error.message,
        fullResponse: error.response?.data
      };
    }
  }

  async waitForCompletion(taskId, maxWaitMs = 600000) {
    console.log(`⏳ waitForCompletion: 等待任务 ${taskId} 完成（最长 ${(maxWaitMs/1000).toFixed(0)}秒）`);
    
    const result = await this.waitForTaskResult(taskId, maxWaitMs, 3000);
    
    if (result.success && result.status === 'SUCCESS') {
      return {
        success: true,
        status: 'SUCCESS',
        taskId: taskId,
        outputs: (result.outputs || []).map(url => ({ type: 'file', url })),
        error: null
      };
    }
    
    return {
      success: false,
      status: result.status || 'FAILED',
      taskId: taskId,
      error: result.error || '任务执行失败',
      outputs: []
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getAIAppInfo(webappId) {
    try {
      const apiKey = await this.getApiKey();
      const baseUrl = await this.getBaseUrl();
      
      console.log('📡 调用 RunningHub API 获取 APP 信息...');
      console.log('   URL:', `${baseUrl}/task/openapi/ai-app/info`);
      console.log('   webappId:', webappId);

      const response = await axios.get(`${baseUrl}/task/openapi/ai-app/info`, {
        params: {
          apiKey: apiKey,
          webappId: String(webappId)
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      console.log('📥 获取 APP 信息响应:', JSON.stringify(response.data, null, 2));

      if (response.data.code === 0 && response.data.data) {
        return {
          success: true,
          webappName: response.data.data.webappName,
          nodeInfoList: response.data.data.nodeInfoList,
          accessEncrypted: response.data.data.accessEncrypted,
          rawData: response.data.data
        };
      } else {
        return { success: false, error: response.data.msg };
      }
    } catch (error) {
      console.log('⚠️ 获取 APP 信息异常:', error.message);
      console.log('⚠️ 错误响应:', JSON.stringify(error.response?.data, null, 2));
      return { success: false, error: error.message };
    }
  }

  async waitForCompletionWithWebSocket(taskId, netWssUrl, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 600000;
      const onProgress = options.onProgress || null;
      let ws = null;
      let completed = false;
      let textResult = null;
      let outputFiles = [];
      let lastProgress = 0;
      let progressInterval = null;
      let timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          if (progressInterval) clearInterval(progressInterval);
          if (ws) ws.close();
          resolve({ success: false, status: 'TIMEOUT', error: '任务执行超时' });
        }
      }, timeout);

      if (onProgress) {
        progressInterval = setInterval(() => {
          if (!completed && lastProgress < 90) {
            lastProgress += Math.random() * 5;
            if (lastProgress > 90) lastProgress = 90;
            onProgress(lastProgress, 'AI模型处理中...');
          }
        }, 5000);
      }

      try {
        ws = new WebSocket(netWssUrl);

        ws.on('open', () => console.log('✅ WebSocket 连接成功'));

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log(`📨 收到消息: ${message.type}`);

            if (message.type === 'executed' || message.type === 'execution_success') {
              console.log('📋 消息数据:', JSON.stringify(message.data));
              if (onProgress && message.type === 'executed') {
                lastProgress = Math.min(lastProgress + 15, 85);
                onProgress(lastProgress, '节点执行完成，继续处理...');
              }
            }

            if (message.type === 'executed' && message.data?.output) {
              const output = message.data.output;
              if (typeof output === 'string' && output.startsWith('http')) {
                outputFiles.push(output);
                console.log(`✅ 获取到输出URL: ${output}`);
              } else if (Array.isArray(output)) {
                outputFiles.push(...output);
                console.log(`✅ 获取到输出数组: ${output.length} 个`);
              } else if (output.file && Array.isArray(output.file)) {
                outputFiles.push(...output.file);
                console.log(`✅ 获取到输出文件数组: ${output.file.length} 个`);
              } else if (output.file && typeof output.file === 'string') {
                outputFiles.push(output.file);
                console.log(`✅ 获取到输出文件: ${output.file}`);
              } else if (output.text && Array.isArray(output.text)) {
                for (const item of output.text) {
                  if (typeof item === 'string') {
                    if (item.startsWith('http')) {
                      outputFiles.push(item);
                      console.log(`✅ 获取到文本输出URL: ${item}`);
                    } else {
                      textResult = (textResult || '') + item + '\n';
                      console.log(`✅ 获取到文本内容: ${item.substring(0, 50)}...`);
                    }
                  } else if (item && typeof item === 'object') {
                    const url = item.cos_url || item.url;
                    if (url) {
                      outputFiles.push(url);
                      console.log(`✅ 获取到文本文件URL: ${url}`);
                    }
                  }
                }
              } else if (output.audio && Array.isArray(output.audio)) {
                const audioUrls = output.audio.map(a => a.cos_url || a.url).filter(Boolean);
                outputFiles.push(...audioUrls);
                console.log(`✅ 获取到音频输出: ${audioUrls.length} 个`);
              } else if (output.gifs && Array.isArray(output.gifs)) {
                const gifsUrls = output.gifs.map(g => g.cos_url || g.url).filter(Boolean);
                outputFiles.push(...gifsUrls);
                console.log(`✅ 获取到视频(gifs)输出: ${gifsUrls.length} 个`);
              } else if (output.video && Array.isArray(output.video)) {
                const videoUrls = output.video.map(v => v.cos_url || v.url).filter(Boolean);
                outputFiles.push(...videoUrls);
                console.log(`✅ 获取到视频输出: ${videoUrls.length} 个`);
              } else if (output.images && Array.isArray(output.images)) {
                const imageUrls = output.images.map(i => i.cos_url || i.url).filter(Boolean);
                outputFiles.push(...imageUrls);
                console.log(`✅ 获取到图片输出: ${imageUrls.length} 个`);
              }
            }

            if (message.type === 'execution_success') {
              completed = true;
              clearTimeout(timeoutId);
              if (progressInterval) clearInterval(progressInterval);
              ws.close();
              console.log('✅ 任务执行成功！');
              console.log('📁 最终输出文件:', JSON.stringify(outputFiles));
              if (onProgress) onProgress(100, '任务执行完成');
              resolve({ success: true, status: 'SUCCESS', text: textResult, outputs: outputFiles, taskId });
            } else if (message.type === 'execution_error' || message.status === 'FAILED') {
              completed = true;
              clearTimeout(timeoutId);
              if (progressInterval) clearInterval(progressInterval);
              ws.close();
              console.log('❌ 任务执行失败');
              resolve({ success: false, status: 'FAILED', error: message.error, taskId });
            }
          } catch (e) {
            console.log(`⚠️ 解析消息失败: ${e.message}`);
          }
        });

        ws.on('error', (error) => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            if (progressInterval) clearInterval(progressInterval);
            resolve({ success: false, status: 'ERROR', error: error.message, taskId });
          }
        });

        ws.on('close', () => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            if (progressInterval) clearInterval(progressInterval);
            console.log('⚠️ WebSocket 连接意外关闭，将回退到REST API查询结果');
            resolve({ success: false, status: 'WS_CLOSED', error: 'WebSocket连接关闭', taskId });
          }
        });

      } catch (error) {
        clearTimeout(timeoutId);
        if (progressInterval) clearInterval(progressInterval);
        resolve({ success: false, status: 'ERROR', error: error.message });
      }
    });
  }

  async getTaskResult(taskId) {
    try {
      const apiKey = await this.getApiKey();
      const baseUrl = await this.getBaseUrl();
      
      const response = await axios.get(`${baseUrl}/task/openapi/task-result-v2`, {
        params: {
          apiKey: apiKey,
          taskId: String(taskId)
        },
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.data.code === 0 && response.data.data) {
        const results = response.data.data.results || [];
        const urls = results.map(r => r.url).filter(Boolean);
        return {
          success: true,
          status: response.data.data.status,
          outputs: urls,
          results: results
        };
      } else {
        return { success: false, error: response.data.msg };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async waitForTaskResult(taskId, maxWaitMs = 600000, checkIntervalMs = 3000) {
    const startTime = Date.now();
    console.log(`⏳ 等待任务结果: ${taskId}`);

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.getTaskResult(taskId);

      if (!result.success) {
        console.log(`⚠️ 查询任务结果失败: ${result.error}，继续等待...`);
        await this.sleep(checkIntervalMs);
        continue;
      }

      if (result.status === 'SUCCESS' && result.outputs && result.outputs.length > 0) {
        console.log(`✅ 任务结果已就绪，获取到 ${result.outputs.length} 个输出`);
        return result;
      }

      if (result.status === 'FAILED') {
        console.log(`❌ 任务执行失败`);
        return { ...result, success: false, error: '任务执行失败' };
      }

      console.log(`⏳ 任务状态: ${result.status}，${Math.round((maxWaitMs - (Date.now() - startTime)) / 1000)}秒后超时`);
      await this.sleep(checkIntervalMs);
    }

    return { success: false, error: '等待任务结果超时' };
  }

  async downloadFile(url, savePath) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      fs.writeFileSync(savePath, response.data);
      return { success: true, savePath };
    } catch (error) {
      console.error(`❌ 下载文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = RunningHubAI;

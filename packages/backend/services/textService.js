const axios = require('axios');
const fs = require('fs');
const path = require('path');
const RunningHubAI = require('./runningHubAI');
const SiliconFlowAI = require('./siliconFlowAI');
const { getDynamicConfig } = require('../config/apiConfig');
const { getMockTranscription } = require('./mockASR');
const apiLogService = require('./apiLogService');
const taskService = require('./taskService');

let cachedRunningHubAI = null;
let cachedSiliconFlowAI = null;
let configCacheTimestamp = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

async function getRunningHubAI() {
  const now = Date.now();
  
  if (cachedRunningHubAI && (now - configCacheTimestamp) < CONFIG_CACHE_TTL) {
    return cachedRunningHubAI;
  }
  
  try {
    const config = await getDynamicConfig();
    
    if (!config.runningHub.apiKey) {
      console.warn('⚠️ [textService] RunningHub API Key 未配置');
      return null;
    }
    
    cachedRunningHubAI = new RunningHubAI(config.runningHub.apiKey);
    configCacheTimestamp = now;
    
    console.log('✅ [textService] 已从云端加载 RunningHub 配置（带缓存）');
    return cachedRunningHubAI;
  } catch (error) {
    console.error('❌ [textService] 加载 RunningHub 动态配置失败:', error.message);
    return null;
  }
}

async function getSiliconFlowAI() {
  const now = Date.now();
  
  if (cachedSiliconFlowAI && (now - configCacheTimestamp) < CONFIG_CACHE_TTL) {
    return cachedSiliconFlowAI;
  }
  
  try {
    const config = await getDynamicConfig();
    
    if (!config.siliconFlow.apiKey) {
      console.warn('⚠️ [textService] SiliconFlow API Key 未配置');
      return null;
    }
    
    cachedSiliconFlowAI = new SiliconFlowAI(config.siliconFlow.apiKey, config.siliconFlow.baseUrl);
    configCacheTimestamp = now;
    
    console.log('✅ [textService] 已从云端加载 SiliconFlow 配置（带缓存）');
    return cachedSiliconFlowAI;
  } catch (error) {
    console.error('❌ [textService] 加载 SiliconFlow 动态配置失败:', error.message);
    return null;
  }
}

const forbiddenKeywords = [
  '违禁词1', '违禁词2', '敏感词1', '敏感词2'
];

async function transcribeAudio(audioPath, modelType = 'cloud', asrModel = 'qwen', roleSplit = false, userId = null, existingTaskId = null) {
  const startTime = new Date();
  let apiLog = null;

  console.log('🔍 调试信息:');
  console.log('  音频路径:', audioPath);
  console.log('  音频文件存在:', fs.existsSync(audioPath));
  if (fs.existsSync(audioPath)) {
    const stats = fs.statSync(audioPath);
    console.log('  文件大小:', stats.size, 'bytes');
  }
  console.log();

  let task = null;
  if (existingTaskId) {
    task = await taskService.getTask(existingTaskId);
  }
  if (!task) {
    try {
      task = await taskService.createTask({
        taskType: 'text_generation',
        inputData: { audioPath: audioPath ? audioPath.substring(0, 50) : '', asrModel }
      });
    } catch (e) {
      console.log('⚠️ 创建任务记录失败（非致命）:', e.message);
    }
  }

  try {
    // 创建日志
    apiLog = await apiLogService.createApiLog({
      userId: userId || '00000000-0000-0000-0000-000000000000',
      platform: 'runninghub',
      functionType: 'asr',
      requestParams: { audioPath, asrModel, roleSplit },
      inputSize: audioPath && fs.existsSync(audioPath) ? fs.statSync(audioPath).size : null,
      startTime
    });

    const runningHubAI = await getRunningHubAI();
    const config = await getDynamicConfig();

    console.log('  RunningHub API Key 已配置:', !!runningHubAI);
    console.log('  应用 ID:', config.runningHub.apps.asr || config.runningHub.aiApps.textGeneration);

    if (!runningHubAI) {
      throw new Error('RunningHub API Key 未配置，请在管理后台配置');
    }

    if (!config.runningHub.apps.asr && !config.runningHub.aiApps.textGeneration) {
      throw new Error('ASR 应用未配置，请在管理后台配置应用 ID');
    }

    const appId = config.runningHub.apps.asr || config.runningHub.aiApps.textGeneration;
    console.log(`📝 开始处理音频: ${audioPath}`);

    console.log(`📤 上传音频文件...`);
    const uploadResult = await runningHubAI.uploadFile(audioPath);

    if (!uploadResult.success) {
      console.warn('⚠️ 文件上传失败:', uploadResult.error);
      throw new Error('文件上传失败: ' + uploadResult.error);
    }

    const uploadedFileName = uploadResult.fileName;
    console.log(`✅ 上传成功: ${uploadedFileName}`);

    const nodeInfoList = [
      {
        nodeId: '12',
        fieldName: 'audio',
        fieldValue: uploadedFileName,
        description: 'audio'
      }
    ];

    console.log(`🚀 发起 AI 应用任务...`);
    const result = await runningHubAI.runAIApp(appId, nodeInfoList);

    if (!result.success) {
      console.warn('⚠️ 任务发起失败:', result.error);
      throw new Error('任务发起失败: ' + result.error);
    }

    console.log(`✅ 任务已创建: ${result.taskId}`);
    if (task) await taskService.updateRunningHubTaskId(task.id, result.taskId);

    console.log(`🔌 开始 WebSocket 连接...`);
    const taskResult = await runningHubAI.waitForCompletionWithWebSocket(result.taskId, result.netWssUrl);

    if (!taskResult.success || taskResult.status === 'FAILED') {
      console.warn('⚠️ 任务执行失败:', taskResult.error);
      throw new Error('任务执行失败: ' + (taskResult.error || '未知错误'));
    }

    console.log(`✅ 任务完成`);

    let textResult = taskResult.text;

    if (!textResult || textResult.trim().length === 0) {
      throw new Error('转写结果为空，请检查音频内容');
    }

    console.log(`✅ 转写完成，文本长度: ${textResult.length}`);
    console.log(`   内容预览: ${textResult.substring(0, 100)}...`);
    
    // 更新日志 - 成功
    if (apiLog) {
      await apiLogService.updateApiLog(apiLog.id, {
        isSuccess: true,
        startTime,
        taskId: result.taskId,
        rhTaskId: result.taskId,
        consumeCoins: taskResult.consumeCoins,
        taskCostTimeMs: taskResult.taskCostTimeMs,
        responseData: { textLength: textResult.length },
      });
    }
    
    return { text: textResult, segments: [] };
  } catch (error) {
    console.error('❌ RunningHub 处理失败:', error.message);
    
    // 更新日志 - 失败
    if (apiLog) {
      await apiLogService.updateApiLog(apiLog.id, {
        isSuccess: false,
        startTime,
        errorMessage: error.message,
        errorCode: 'ASR_ERROR'
      });
    }
    
    throw error;
  }
}

async function rewriteText(text, modelType = 'cloud', prompt = '', isCreative = false, model = null) {
  const siliconFlowAI = await getSiliconFlowAI();
  
  if (siliconFlowAI) {
    console.log('🤖 使用硅基流动改写文案');
    const config = await getDynamicConfig();
    const result = await siliconFlowAI.rewriteText(text, {
      prompt,
      style: isCreative ? '创意独特' : '自然流畅',
      model: model || config.siliconFlow.defaultModel
    });

    if (result.success) {
      return {
        originalText: text,
        rewrittenText: result.rewrittenText,
        usage: result.usage
      };
    }

    console.warn('⚠️ 硅基流动改写失败:', result.error);
  }

  return {
    originalText: text,
    rewrittenText: text
  };
}

async function checkForbidden(text, modelType = 'cloud') {
  const siliconFlowAI = await getSiliconFlowAI();
  
  if (siliconFlowAI) {
    console.log('🛡️ 使用硅基流动审核文案');
    const config = await getDynamicConfig();
    const result = await siliconFlowAI.checkForbidden(text, {
      model: config.siliconFlow.defaultModel
    });

    if (result.success) {
      return {
        passed: result.passed,
        issues: result.issues,
        suggestion: result.suggestion || ''
      };
    }

    console.warn('⚠️ 硅基流动审核失败:', result.error);
  }

  const issues = [];
  for (const keyword of forbiddenKeywords) {
    if (text.includes(keyword)) {
      issues.push(`包含违禁词: ${keyword}`);
    }
  }

  return {
    passed: issues.length === 0,
    issues: issues
  };
}

async function generateText(prompt, options = {}) {
  const siliconFlowAI = await getSiliconFlowAI();
  
  if (siliconFlowAI) {
    console.log('🤖 使用硅基流动生成文案');
    const config = await getDynamicConfig();
    const result = await siliconFlowAI.generateText(prompt, {
      systemPrompt: options.systemPrompt || '你是一个专业的文案助手，擅长创作各种类型的文案。',
      model: options.model || config.siliconFlow.defaultModel,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens || 2048
    });

    if (result.success) {
      return {
        success: true,
        text: result.text,
        usage: result.usage
      };
    }

    console.warn('⚠️ 硅基流动生成失败:', result.error);
    return { success: false, error: result.error };
  }

  return { success: false, error: '硅基流动 API 未配置' };
}

async function extractTopics(text, options = {}) {
  const siliconFlowAI = await getSiliconFlowAI();
  
  if (siliconFlowAI) {
    console.log('🏷️ 使用硅基流动提取主题');
    const config = await getDynamicConfig();
    const result = await siliconFlowAI.extractTopics(text, {
      model: options.model || config.siliconFlow.defaultModel
    });

    if (result.success) {
      return {
        success: true,
        topics: result.topics,
        tags: result.tags,
        summary: result.summary,
        usage: result.usage
      };
    }

    console.warn('⚠️ 硅基流动主题提取失败:', result.error);
    return { success: false, error: result.error };
  }

  return { success: false, error: '硅基流动 API 未配置' };
}

function clearCache() {
  cachedRunningHubAI = null;
  cachedSiliconFlowAI = null;
  configCacheTimestamp = 0;
}

module.exports = { transcribeAudio, rewriteText, checkForbidden, generateText, extractTopics, clearCache };
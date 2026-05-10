const axios = require('axios');
const fs = require('fs');
const path = require('path');
const avatarRepository = require('../repositories/AvatarRepository');
const RunningHubAI = require('./runningHubAI');
const { getDynamicConfig } = require('../config/apiConfig');
const apiLogService = require('./apiLogService');
const taskService = require('./taskService');

let cachedRunningHubAI = null;
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
      throw new Error('RunningHub API Key 未配置（请在管理后台或 .env 文件中配置）');
    }
    
    cachedRunningHubAI = new RunningHubAI(config.runningHub.apiKey);
    configCacheTimestamp = now;
    
    console.log('✅ [videoService] 已从云端加载 RunningHub 配置（带缓存）');
    return cachedRunningHubAI;
  } catch (error) {
    console.error('❌ [videoService] 加载动态配置失败:', error.message);
    throw error;
  }
}

async function generateVideo(audioPath, avatarId, modelType = 'cloud', userId = null, existingTaskId = null) {
  const startTime = new Date();
  let apiLog = null;

  let task = null;
  if (existingTaskId) {
    task = await taskService.getTask(existingTaskId);
  }
  if (!task) {
    try {
      task = await taskService.createTask({
        taskType: 'video_generation',
        inputData: { audioPath: audioPath ? audioPath.substring(0, 50) : '', avatarId }
      });
    } catch (e) {
      console.log('⚠️ 创建任务记录失败（非致命）:', e.message);
    }
  }

  try {
    apiLog = await apiLogService.createApiLog({
      userId: userId || '00000000-0000-0000-0000-000000000000',
      platform: 'runninghub',
      functionType: 'image_to_video',
      requestParams: { audioPath, avatarId },
      inputSize: audioPath ? (fs.existsSync(audioPath) ? fs.statSync(audioPath).size : null) : null,
      startTime
    });

    const runningHubAI = await getRunningHubAI();
    const config = await getDynamicConfig();

    const appId = config.runningHub.apps.videoToVideo || config.runningHub.aiApps.videoGeneration;
    if (!appId) {
      throw new Error('视频生成 AI 应用 ID 未配置');
    }

    let avatarFilePath = avatarId;
    if (!avatarId.startsWith('/') && !avatarId.startsWith('http')) {
      avatarFilePath = `/assets/avatars/${avatarId}.png`;
    }

    const nodeInfoList = [
      {
        nodeId: 'input',
        fieldName: 'audio_path',
        fieldValue: audioPath,
        description: '音频文件路径'
      },
      {
        nodeId: 'input',
        fieldName: 'avatar',
        fieldValue: avatarFilePath,
        description: '肖像文件路径'
      }
    ];

    const result = await runningHubAI.runAIApp(appId, nodeInfoList, {
      instanceType: 'plus' 
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    if (task) await taskService.updateRunningHubTaskId(task.id, result.taskId);
    if (task) await taskService.updateProgress(task.id, 40, 'AI模型处理中...');

    const taskResult = await runningHubAI.waitForCompletionWithWebSocket(result.taskId, result.netWssUrl, {
      timeout: 1800000,
      onProgress: async (progress, message) => {
        if (task) await taskService.updateProgress(task.id, 40 + Math.round(progress * 0.4), message);
      }
    });

    console.log('✅ WebSocket阶段结束, success:', taskResult.success, 'status:', taskResult.status);

    if (!taskResult.success && taskResult.status !== 'TIMEOUT' && taskResult.status !== 'WS_CLOSED') {
      const errorMsg = taskResult.error || 'AI任务执行失败';
      console.log('❌ 视频任务执行失败:', errorMsg);
      if (task) await taskService.failTask(task.id, errorMsg);
      throw new Error(errorMsg);
    }

    let videoUrl = '';

    if (taskResult.success && taskResult.outputs && taskResult.outputs.length > 0) {
      for (const output of taskResult.outputs) {
        const url = typeof output === 'string' ? output : (output?.url || output?.cos_url || output?.file_url || '');
        if (url) {
          videoUrl = url;
          console.log('✅ 从WebSocket找到输出视频 URL:', videoUrl);
          break;
        }
      }
    }

    if (!videoUrl) {
      console.log('📡 WebSocket未获取到视频URL，通过REST API查询任务结果...');
      if (task) await taskService.updateProgress(task.id, 70, '正在获取生成结果...');
      const taskResultData = await runningHubAI.waitForTaskResult(result.taskId);
      if (taskResultData.success && taskResultData.outputs && taskResultData.outputs.length > 0) {
        for (const output of taskResultData.outputs) {
          const url = typeof output === 'string' ? output : (output?.url || output?.cos_url || output?.file_url || '');
          if (url) {
            videoUrl = url;
            console.log('✅ 从REST API找到输出视频 URL:', videoUrl);
            break;
          }
        }
      }
    }

    if (!videoUrl) {
      if (task) await taskService.failTask(task.id, '视频生成未获取到输出结果');
      throw new Error('视频生成未获取到输出结果');
    }

    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let videoPath = '';
    if (task) await taskService.updateProgress(task.id, 85, '正在下载视频文件...');
    videoPath = `${outputDir}/video_${Date.now()}.mp4`;
    await runningHubAI.downloadFile(videoUrl, videoPath);

    // 更新日志 - 成功
    if (apiLog) {
      await apiLogService.updateApiLog(apiLog.id, {
        isSuccess: true,
        startTime,
        taskId: result.taskId,
        rhTaskId: result.taskId,
        consumeCoins: taskResult.consumeCoins,
        taskCostTimeMs: taskResult.taskCostTimeMs,
        responseData: { videoPath, outputsCount: taskResult.outputs?.length },
        outputFilePath: videoPath,
        outputFileSize: videoPath ? fs.statSync(videoPath).size : null
      });
    }

    return { videoPath, success: videoPath !== '' };
  } catch (error) {
    // 更新日志 - 失败
    if (apiLog) {
      await apiLogService.updateApiLog(apiLog.id, {
        isSuccess: false,
        startTime,
        errorMessage: error.message,
        errorCode: error.code || 'VIDEO_GENERATION_ERROR'
      });
    }
    throw error;
  }
}

async function listAvatars() {
  return await avatarRepository.findAll();
}

async function uploadAvatar(avatarData, name, type = 'image') {
  const avatarDir = './assets/avatars';
  if (!fs.existsSync(avatarDir)) {
    fs.mkdirSync(avatarDir, { recursive: true });
  }

  const thumbnailUrl = `/assets/avatars/${Date.now()}.png`;

  const avatar = await avatarRepository.create({
    name,
    thumbnailUrl,
    type,
    metadata: {}
  });

  fs.writeFileSync(`./assets/avatars/${avatar.id}.png`, avatarData, 'base64');

  return { avatarId: avatar.id, success: true };
}

async function listSounds() {
  const soundsDir = './assets/sounds';
  const sounds = [];

  if (fs.existsSync(soundsDir)) {
    const files = fs.readdirSync(soundsDir);
    files.forEach(file => {
      if (file.endsWith('.wav') || file.endsWith('.mp3')) {
        sounds.push({
          id: file.replace(/\.[^/.]+$/, ''),
          name: file,
          path: `/assets/sounds/${file}`
        });
      }
    });
  }

  return sounds;
}

module.exports = { generateVideo, listAvatars, uploadAvatar, listSounds };

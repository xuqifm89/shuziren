const axios = require('axios');
const fs = require('fs');
const path = require('path');
const avatarRepository = require('../repositories/AvatarRepository');
const RunningHubAI = require('./runningHubAI');
const { getDynamicConfig } = require('../config/apiConfig');
const apiLogService = require('./apiLogService');

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

async function generateVideo(audioPath, avatarId, modelType = 'cloud', userId = null) {
  const startTime = new Date();
  let apiLog = null;

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

    const taskResult = await runningHubAI.waitForCompletion(result.taskId, 300000);
    if (!taskResult.success || taskResult.status === 'FAILED') {
      throw new Error(taskResult.error || '任务执行失败');
    }

    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let videoPath = '';
    if (taskResult.outputs && taskResult.outputs.length > 0) {
      for (const output of taskResult.outputs) {
        if (output.type === 'file' && output.url) {
          videoPath = `${outputDir}/video_${Date.now()}.mp4`;
          await runningHubAI.downloadFile(output.url, videoPath);
          break;
        }
      }
    }

    // 更新日志 - 成功
    if (apiLog) {
      await apiLogService.updateApiLog(apiLog.id, {
        isSuccess: true,
        startTime,
        taskId: result.taskId,
        rhTaskId: result.taskId,
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

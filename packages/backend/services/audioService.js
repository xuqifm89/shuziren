const axios = require('axios');
const fs = require('fs');
const path = require('path');
const voiceRepository = require('../repositories/VoiceRepository');
const dubbingLibraryRepository = require('../repositories/DubbingLibraryRepository');
const workLibraryRepository = require('../repositories/WorkLibraryRepository');
const RunningHubAI = require('./runningHubAI');
const { getDynamicConfig } = require('../config/apiConfig');
const apiLogService = require('./apiLogService');
const taskService = require('./taskService');
const fileService = require('./fileService');

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
    
    console.log('✅ [audioService] 已从云端加载 RunningHub 配置（带缓存）');
    return cachedRunningHubAI;
  } catch (error) {
    console.error('❌ [audioService] 加载动态配置失败:', error.message);
    throw error;
  }
}

function isVideoUrl(url) {
  if (typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.avi') || lower.includes('.webm');
}

function isAudioUrl(url) {
  if (typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return lower.includes('.flac') || lower.includes('.wav') || lower.includes('.mp3') || lower.includes('.ogg') || lower.includes('.aac');
}

/**
 * 生成音频（TTS / 文字转音频）
 * ⚠️ [重要] 本项目中 TTS（文字转音频）和配音（Voice Cloning）是同一功能
 * - 函数名: generateAudio
 * - 用途: 将文本转换为语音音频（等同于配音生成）
 * - 配置项: runninghub_app_tts (或 runninghub_app_dubbing，两者应保持一致)
 * - 对应环境变量: AUDIO_GENERATION_APP_ID / DUBBING_APP_ID
 *
 * @param {string} text - 待合成的文本内容
 * @param {string} voiceId - 音色 ID（可选，用于指定声音风格）
 * @param {string} modelType - 模型类型（默认 'cloud'）
 * @returns {object} 包含音频文件路径的结果对象
 */
async function generateAudio(text, voiceId, modelType = 'cloud', userId = null) {
  const startTime = new Date();
  let apiLog = null;

  try {
    // 创建日志记录
    apiLog = await apiLogService.createApiLog({
      userId: userId || '00000000-0000-0000-0000-000000000000',
      platform: 'runninghub',
      functionType: 'tts',
      requestParams: { text: text?.substring(0, 100), voiceId },
      inputSize: text?.length,
      startTime
    });

    const runningHubAI = await getRunningHubAI();
    const config = await getDynamicConfig();

    // ⚠️ 使用 audioGeneration 配置项（与 dubbing 为同一功能）
    const appId = config.runningHub.apps.tts || config.runningHub.aiApps.audioGeneration;
    if (!appId) {
      throw new Error('TTS/配音 AI 应用 ID 未配置（请检查 runninghub_app_tts 或 runninghub_app_dubbing）');
    }

    const nodeInfoList = [
      {
        nodeId: 'input',
        fieldName: 'text',
        fieldValue: text,
        description: '待合成文本'
      },
      {
        nodeId: 'settings',
        fieldName: 'voice_id',
        fieldValue: voiceId,
        description: '音色ID'
      }
    ];

    const result = await runningHubAI.runAIApp(appId, nodeInfoList);

    if (!result.success) {
      throw new Error(result.error);
    }

    const taskResult = await runningHubAI.waitForCompletion(result.taskId);
    if (!taskResult.success || taskResult.status === 'FAILED') {
      throw new Error(taskResult.error || '任务执行失败');
    }

    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let audioPath = '';
    if (taskResult.outputs && taskResult.outputs.length > 0) {
      for (const output of taskResult.outputs) {
        if (output.type === 'file' && output.url) {
          audioPath = `${outputDir}/audio_${Date.now()}.wav`;
          await runningHubAI.downloadFile(output.url, audioPath);
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
        consumeCoins: taskResult.consumeCoins,
        taskCostTimeMs: taskResult.taskCostTimeMs,
        responseData: { audioPath, outputsCount: taskResult.outputs?.length },
        outputFilePath: audioPath,
        outputFileSize: audioPath ? fs.statSync(audioPath).size : null
      });
    }

    return { audioPath, success: audioPath !== '' };
  } catch (error) {
    // 更新日志 - 失败
    if (apiLog) {
      await apiLogService.updateApiLog(apiLog.id, {
        isSuccess: false,
        startTime,
        errorMessage: error.message,
        errorCode: error.code || 'TTS_ERROR'
      });
    }
    throw error;
  }
}

/**
 * 生成配音（Voice Cloning / TTS）
 * ⚠️ [重要] 本项目中配音（Voice Cloning）和 TTS（文字转音频）是同一功能
 * - 函数名: generateDubbing
 * - 用途: 基于音色样本生成带情感的语音（等同于 TTS）
 * - 配置项: runninghub_app_dubbing (或 runninghub_app_tts，两者应保持一致)
 * - 对应环境变量: DUBBING_APP_ID / AUDIO_GENERATION_APP_ID
 *
 * @param {string} voiceFilePath - 音色样本文件路径（可选，用于克隆特定声音）
 * @param {string} text - 待合成的文本内容
 * @param {string} emotionDescription - 情感描述（如：'开心'、'悲伤'等）
 * @param {string|null} userId - 用户 ID（用于记录）
 * @returns {object} 包含音频文件路径的结果对象
 */
async function generateDubbing(voiceFilePath, text, emotionDescription = '', userId = null, existingTaskId = null) {
  console.log('🎤 开始配音合成（等同于 TTS 文字转音频）');
  console.log('   声音文件:', voiceFilePath);
  console.log('   文本:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
  console.log('   情感描述:', emotionDescription);
  console.log('   用户ID:', userId);

  let task = null;
  if (existingTaskId) {
    task = await taskService.getTask(existingTaskId);
  }
  if (!task) {
    try {
      task = await taskService.createTask({
        taskType: 'audio_generation',
        inputData: { text: text.substring(0, 100), emotionDescription }
      });
    } catch (e) {
      console.log('⚠️ 创建任务记录失败（非致命）:', e.message);
    }
  }

  const runningHubAI = await getRunningHubAI();
  const config = await getDynamicConfig();

  const appId = config.runningHub.apps.dubbing || config.runningHub.aiApps.dubbing;
  if (!appId) {
    if (task) await taskService.failTask(task.id, 'TTS/配音 AI 应用 ID 未配置');
    throw new Error('TTS/配音 AI 应用 ID 未配置（请检查 runninghub_app_dubbing 或 runninghub_app_tts）');
  }

  const nodeInfoList = [
    {
      nodeId: '17',
      fieldName: 'audio',
      fieldValue: voiceFilePath,
      description: '声音样本'
    },
    {
      nodeId: '20',
      fieldName: 'prompt',
      fieldValue: text,
      description: '需配音的文字'
    }
  ];

  if (emotionDescription) {
    nodeInfoList.push({
      nodeId: '27',
      fieldName: 'prompt',
      fieldValue: emotionDescription,
      description: '声音或情感描述'
    });
  }

  console.log('📤 上传声音文件...');
  if (task) await taskService.updateProgress(task.id, 10, '正在上传声音文件...');
  const uploadResult = await runningHubAI.uploadFile(voiceFilePath);
  if (!uploadResult.success) {
    if (task) await taskService.failTask(task.id, '声音文件上传失败: ' + uploadResult.error);
    throw new Error('声音文件上传失败: ' + uploadResult.error);
  }

  console.log('✅ 文件上传成功:', uploadResult.fileName);

  const updatedNodeInfoList = nodeInfoList.map(node => {
    if (node.fieldName === 'audio') {
      return {
        ...node,
        fieldValue: uploadResult.fileName
      };
    }
    return node;
  });

  console.log('🚀 发起配音任务...');
  if (task) await taskService.updateProgress(task.id, 25, '正在提交AI配音任务...');
  const result = await runningHubAI.runAIApp(appId, updatedNodeInfoList, {
    maxRetries: 5,
    usePersonalQueue: true
  });
  if (!result.success) {
    if (task) await taskService.failTask(task.id, '配音任务发起失败: ' + result.error);
    throw new Error('配音任务发起失败: ' + result.error);
  }

  console.log('✅ 任务已创建:', result.taskId);
  if (task) await taskService.updateRunningHubTaskId(task.id, result.taskId);
  console.log('🔌 等待任务完成...');
  if (task) await taskService.updateProgress(task.id, 40, 'AI模型处理中...');

  const taskResult = await runningHubAI.waitForCompletionWithWebSocket(result.taskId, result.netWssUrl, {
    onProgress: async (progress, message) => {
      if (task) await taskService.updateProgress(task.id, 40 + Math.round(progress * 0.4), message);
    }
  });

  console.log('✅ WebSocket阶段结束, success:', taskResult.success, 'status:', taskResult.status);

  let audioUrl = '';

  if (taskResult.success && taskResult.outputs && taskResult.outputs.length > 0) {
    for (const output of taskResult.outputs) {
      if (typeof output === 'string' && isAudioUrl(output)) {
        audioUrl = output;
        console.log('✅ 从WebSocket找到输出音频 URL:', audioUrl);
        break;
      }
    }
  }

  if (!audioUrl) {
    console.log('📡 WebSocket未获取到音频URL，通过REST API轮询等待任务结果...');
    if (task) await taskService.updateProgress(task.id, 70, '正在获取生成结果...');
    const taskResultData = await runningHubAI.waitForTaskResult(result.taskId);
    if (taskResultData.success && taskResultData.outputs && taskResultData.outputs.length > 0) {
      for (const url of taskResultData.outputs) {
        if (isAudioUrl(url)) {
          audioUrl = url;
          console.log('✅ 从REST API找到输出音频 URL:', audioUrl);
          break;
        }
      }
      if (!audioUrl && taskResultData.outputs.length > 0) {
        audioUrl = taskResultData.outputs[0];
        console.log('⚠️ 未找到明确音频格式URL，使用第一个结果:', audioUrl);
      }
    }
  }

  if (!audioUrl) {
    if (task) await taskService.failTask(task.id, '未找到输出音频文件');
    throw new Error('未找到输出音频文件');
  }

  console.log('📥 下载音频文件到本地...');
  if (task) await taskService.updateProgress(task.id, 85, '正在下载音频文件...');

  const fileExt = audioUrl.includes('.flac') ? '.flac' : (audioUrl.includes('.mp3') ? '.mp3' : '.wav');
  const fileName = `dubbing_${Date.now()}${fileExt}`;

  const downloadResult = await runningHubAI.downloadFile(audioUrl, fileService.getFilePath('dubbings', fileName));
  if (!downloadResult.success) {
    if (task) await taskService.failTask(task.id, '音频文件下载失败: ' + downloadResult.error);
    throw new Error('音频文件下载失败: ' + downloadResult.error);
  }

  console.log('✅ 音频文件已保存');
  const fileUrl = fileService.getUrl('dubbings', fileName);
  const fileSize = fs.statSync(fileService.getFilePath('dubbings', fileName)).size;

  const dubbing = await dubbingLibraryRepository.create({
    userId: userId || '00000000-0000-0000-0000-000000000000',
    fileName: `配音_${Date.now()}`,
    fileUrl: fileUrl,
    fileSize: fileSize,
    duration: 0,
    description: `文本: ${text.substring(0, 100)}... | 音色: ${emotionDescription || '未指定'}`,
    tags: 'AI配音',
    isPublic: false
  });

  console.log('✅ 配音记录已保存到数据库:', dubbing.id);

  if (task) await taskService.completeTask(task.id, fileUrl);

  return { audioUrl: fileUrl, success: true, dubbing, taskId: task ? task.id : null };
}

async function generateImageToVideo(imageFileUrl, audioFileUrl, userId = null, existingTaskId = null) {
  console.log('🎬 开始图片生成视频');
  console.log('   图片文件:', imageFileUrl);
  console.log('   音频文件:', audioFileUrl);
  console.log('   用户ID:', userId);

  let task = null;
  if (existingTaskId) {
    task = await taskService.getTask(existingTaskId);
  }
  if (!task) {
    try {
      task = await taskService.createTask({
        taskType: 'video_generation',
        inputData: { imageFileUrl, audioFileUrl }
      });
    } catch (e) {
      console.log('⚠️ 创建任务记录失败（非致命）:', e.message);
    }
  }

  const runningHubAI = await getRunningHubAI();
  const config = await getDynamicConfig();

  const appId = config.runningHub.apps.imageToVideo || config.runningHub.aiApps.imageToVideo;
  console.log('📋 使用的 APP ID:', appId);
  if (!appId) {
    if (task) await taskService.failTask(task.id, '图片生成视频 AI 应用 ID 未配置');
    throw new Error('图片生成视频 AI 应用 ID 未配置');
  }

  console.log('📡 获取 AI App 节点信息...');
  const appInfo = await runningHubAI.getAIAppInfo(appId);
  if (!appInfo.success) {
    console.log('⚠️ 获取 APP 信息失败:', appInfo.error, '- 将使用默认节点配置');
    console.log('⚠️ 请检查 RunningHub 后台获取正确的 nodeId 和 fieldName');
  } else {
    console.log('📋 AI App 节点信息:', JSON.stringify(appInfo, null, 2));
  }

  let imageFilePath = imageFileUrl;
  let audioFilePath = audioFileUrl;

  if (imageFileUrl.startsWith('http')) {
    console.log('📡 下载图片文件...');
    if (task) await taskService.updateProgress(task.id, 5, '正在下载图片文件...');
    const fileName = imageFileUrl.split('/').pop();
    const tempPath = fileService.getFilePath('temp', fileName);
    const axios = require('axios');
    const response = await axios.get(imageFileUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(tempPath, response.data);
    imageFilePath = tempPath;
    console.log('✅ 图片已下载到:', imageFilePath);
  }

  if (audioFileUrl.startsWith('http')) {
    console.log('📡 下载音频文件...');
    if (task) await taskService.updateProgress(task.id, 8, '正在下载音频文件...');
    const fileName = audioFileUrl.split('/').pop();
    const tempPath = fileService.getFilePath('temp', fileName);
    const axios = require('axios');
    const response = await axios.get(audioFileUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(tempPath, response.data);
    audioFilePath = tempPath;
    console.log('✅ 音频已下载到:', audioFilePath);
  }

  console.log('📤 上传图片文件到 RunningHub...');
  if (task) await taskService.updateProgress(task.id, 10, '正在上传图片文件...');
  const imageUploadResult = await runningHubAI.uploadFile(imageFilePath);
  if (!imageUploadResult.success) {
    if (task) await taskService.failTask(task.id, '图片文件上传失败: ' + imageUploadResult.error);
    throw new Error('图片文件上传失败: ' + imageUploadResult.error);
  }
  console.log('✅ 图片上传成功:', imageUploadResult.fileName);

  console.log('📤 上传音频文件到 RunningHub...');
  if (task) await taskService.updateProgress(task.id, 20, '正在上传音频文件...');
  const audioUploadResult = await runningHubAI.uploadFile(audioFilePath);
  if (!audioUploadResult.success) {
    if (task) await taskService.failTask(task.id, '音频文件上传失败: ' + audioUploadResult.error);
    throw new Error('音频文件上传失败: ' + audioUploadResult.error);
  }
  console.log('✅ 音频上传成功:', audioUploadResult.fileName);

  const imageNodeInfo = appInfo.success ? appInfo.nodeInfoList.find(n =>
    n.fieldType === 'IMAGE' ||
    (n.description && (n.description.toLowerCase().includes('image') || n.description.includes('图片')))
  ) : null;

  const audioNodeInfo = appInfo.success ? appInfo.nodeInfoList.find(n =>
    n.fieldType === 'AUDIO' ||
    (n.description && (n.description.toLowerCase().includes('audio') || n.description.includes('音频')))
  ) : null;

  console.log('📋 找到的图片节点:', imageNodeInfo);
  console.log('📋 找到的音频节点:', audioNodeInfo);

  const nodeInfoList = [];

  if (imageNodeInfo) {
    nodeInfoList.push({
      nodeId: imageNodeInfo.nodeId,
      fieldName: imageNodeInfo.fieldName,
      fieldValue: imageUploadResult.fileName,
      description: imageNodeInfo.description
    });
  }

  if (audioNodeInfo) {
    nodeInfoList.push({
      nodeId: audioNodeInfo.nodeId,
      fieldName: audioNodeInfo.fieldName,
      fieldValue: audioUploadResult.fileName,
      description: audioNodeInfo.description
    });
  }

  if (nodeInfoList.length < 2) {
    console.log('⚠️ 未找到完整的节点信息，使用配置好的节点...');
    nodeInfoList.length = 0;
    nodeInfoList.push(
      {
        nodeId: '180',
        fieldName: 'image',
        fieldValue: imageUploadResult.fileName,
        description: '上传图片'
      },
      {
        nodeId: '6',
        fieldName: 'audio',
        fieldValue: audioUploadResult.fileName,
        description: '上传音频'
      }
    );
  }

  console.log('📤 提交的 nodeInfoList:', JSON.stringify(nodeInfoList, null, 2));
  console.log('🚀 发起图片生成视频任务...');

  if (task) await taskService.updateProgress(task.id, 30, '正在提交视频生成任务...');
  const result = await runningHubAI.runAIApp(appId, nodeInfoList, {
    maxRetries: 5,
    usePersonalQueue: true
  });
  console.log('📥 API 返回结果:', JSON.stringify(result, null, 2));

  if (!result.success) {
    if (task) await taskService.failTask(task.id, '图片生成视频任务发起失败: ' + result.error);
    throw new Error('图片生成视频任务发起失败: ' + result.error);
  }

  console.log('✅ 任务已创建:', result.taskId);
  if (task) await taskService.updateRunningHubTaskId(task.id, result.taskId);
  console.log('🔌 等待任务完成...');
  if (task) await taskService.updateProgress(task.id, 40, 'AI模型处理中...');

  const taskResult = await runningHubAI.waitForCompletionWithWebSocket(result.taskId, result.netWssUrl, {
    timeout: 1800000,
    onProgress: async (progress, message) => {
      if (task) await taskService.updateProgress(task.id, 40 + Math.round(progress * 0.4), message);
    }
  });

  console.log('✅ WebSocket阶段结束, success:', taskResult.success, 'status:', taskResult.status);

  let videoUrl = '';

  if (taskResult.success && taskResult.outputs && taskResult.outputs.length > 0) {
    for (const output of taskResult.outputs) {
      if (typeof output === 'string' && isVideoUrl(output)) {
        videoUrl = output;
        console.log('✅ 从WebSocket找到输出视频 URL:', videoUrl);
        break;
      }
    }
  }

  if (!videoUrl) {
    console.log('📡 WebSocket未获取到视频URL，通过REST API轮询等待任务结果...');
    if (task) await taskService.updateProgress(task.id, 70, '正在获取生成结果...');
    const taskResultData = await runningHubAI.waitForTaskResult(result.taskId);
    if (taskResultData.success && taskResultData.outputs && taskResultData.outputs.length > 0) {
      for (const url of taskResultData.outputs) {
        if (isVideoUrl(url)) {
          videoUrl = url;
          console.log('✅ 从REST API找到输出视频 URL:', videoUrl);
          break;
        }
      }
      if (!videoUrl && taskResultData.outputs.length > 0) {
        videoUrl = taskResultData.outputs[0];
        console.log('⚠️ 未找到明确视频格式URL，使用第一个结果:', videoUrl);
      }
    }
  }

  if (!videoUrl) {
    if (task) await taskService.failTask(task.id, '未找到输出视频文件');
    throw new Error('未找到输出视频文件');
  }

  console.log('📥 下载视频文件到本地...');
  if (task) await taskService.updateProgress(task.id, 85, '正在下载视频文件...');

  const fileExt = videoUrl.includes('.mov') ? '.mov' : '.mp4';
  const fileName = `video_${Date.now()}${fileExt}`;

  const downloadResult = await runningHubAI.downloadFile(videoUrl, fileService.getFilePath('works', fileName));
  if (!downloadResult.success) {
    if (task) await taskService.failTask(task.id, '视频文件下载失败: ' + downloadResult.error);
    throw new Error('视频文件下载失败: ' + downloadResult.error);
  }

  console.log('✅ 视频文件已保存');
  if (task) await taskService.updateProgress(task.id, 95, '正在保存记录...');
  const fileUrl = fileService.getUrl('works', fileName);
  const fileSize = fs.statSync(fileService.getFilePath('works', fileName)).size;

  const work = await workLibraryRepository.create({
    userId: userId || '00000000-0000-0000-0000-000000000000',
    title: `视频_${Date.now()}`,
    videoPath: fileUrl,
    size: fileSize,
    status: 'completed',
    sourceType: 'image_to_video',
    description: `图片生视频: ${imageFileUrl} + ${audioFileUrl}`
  });

  console.log('✅ 作品记录已保存到数据库:', work.id);

  if (task) await taskService.completeTask(task.id, fileUrl);

  return { videoUrl: fileUrl, success: true, work, taskId: task ? task.id : null };
}

async function generateVideoToVideo(videoFileUrl, audioFileUrl, userId = null, existingTaskId = null) {
  console.log('🎬🎬🎬 开始视频生成视频');
  console.log('   视频文件:', videoFileUrl);
  console.log('   音频文件:', audioFileUrl);
  console.log('   用户ID:', userId);

  let task = null;
  if (existingTaskId) {
    task = await taskService.getTask(existingTaskId);
  }
  if (!task) {
    try {
      task = await taskService.createTask({
        taskType: 'video_generation',
        inputData: { videoFileUrl, audioFileUrl }
      });
    } catch (e) {
      console.log('⚠️ 创建任务记录失败（非致命）:', e.message);
    }
  }

  const runningHubAI = await getRunningHubAI();
  const config = await getDynamicConfig();

  const appId = config.runningHub.apps.videoToVideo || config.runningHub.aiApps.videoToVideo;
  console.log('📋 使用的 APP ID:', appId);
  if (!appId) {
    if (task) await taskService.failTask(task.id, '视频生成视频 AI 应用 ID 未配置');
    throw new Error('视频生成视频 AI 应用 ID 未配置');
  }

  let videoFilePath = videoFileUrl;
  let audioFilePath = audioFileUrl;

  if (videoFileUrl.startsWith('http')) {
    console.log('📡 下载视频文件...');
    if (task) await taskService.updateProgress(task.id, 5, '正在下载视频文件...');
    const fileName = videoFileUrl.split('/').pop();
    const tempPath = fileService.getFilePath('temp', fileName);
    const axios = require('axios');
    const response = await axios.get(videoFileUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(tempPath, response.data);
    videoFilePath = tempPath;
    console.log('✅ 视频已下载到:', videoFilePath);
  }

  if (audioFileUrl.startsWith('http')) {
    console.log('📡 下载音频文件...');
    if (task) await taskService.updateProgress(task.id, 8, '正在下载音频文件...');
    const fileName = audioFileUrl.split('/').pop();
    const tempPath = fileService.getFilePath('temp', fileName);
    const axios = require('axios');
    const response = await axios.get(audioFileUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(tempPath, response.data);
    audioFilePath = tempPath;
    console.log('✅ 音频已下载到:', audioFilePath);
  }

  console.log('📤 上传视频文件到 RunningHub...');
  if (task) await taskService.updateProgress(task.id, 10, '正在上传视频文件...');
  const videoUploadResult = await runningHubAI.uploadFile(videoFilePath);
  if (!videoUploadResult.success) {
    if (task) await taskService.failTask(task.id, '视频文件上传失败: ' + videoUploadResult.error);
    throw new Error('视频文件上传失败: ' + videoUploadResult.error);
  }
  console.log('✅ 视频上传成功:', videoUploadResult.fileName);

  console.log('📤 上传音频文件到 RunningHub...');
  if (task) await taskService.updateProgress(task.id, 20, '正在上传音频文件...');
  const audioUploadResult = await runningHubAI.uploadFile(audioFilePath);
  if (!audioUploadResult.success) {
    if (task) await taskService.failTask(task.id, '音频文件上传失败: ' + audioUploadResult.error);
    throw new Error('音频文件上传失败: ' + audioUploadResult.error);
  }
  console.log('✅ 音频上传成功:', audioUploadResult.fileName);

  const nodeInfoList = [
    {
      nodeId: '34',
      fieldName: 'video',
      fieldValue: videoUploadResult.fileName,
      description: '上传视频'
    },
    {
      nodeId: '43',
      fieldName: 'audio',
      fieldValue: audioUploadResult.fileName,
      description: '上传配音'
    }
  ];

  console.log('📤 提交的 nodeInfoList:', JSON.stringify(nodeInfoList, null, 2));
  console.log('🚀 发起视频生成视频任务...');

  if (task) await taskService.updateProgress(task.id, 30, '正在提交视频生成任务...');
  const result = await runningHubAI.runAIApp(appId, nodeInfoList, {
    maxRetries: 5,
    usePersonalQueue: true
  });
  console.log('📥 API 返回结果:', JSON.stringify(result, null, 2));

  if (!result.success) {
    if (task) await taskService.failTask(task.id, '视频生成视频任务发起失败: ' + result.error);
    throw new Error('视频生成视频任务发起失败: ' + result.error);
  }

  console.log('✅ 任务已创建:', result.taskId);
  if (task) await taskService.updateRunningHubTaskId(task.id, result.taskId);
  console.log('🔌 等待任务完成...');
  if (task) await taskService.updateProgress(task.id, 40, 'AI模型处理中...');

  const taskResult = await runningHubAI.waitForCompletionWithWebSocket(result.taskId, result.netWssUrl, {
    timeout: 1800000,
    onProgress: async (progress, message) => {
      if (task) await taskService.updateProgress(task.id, 40 + Math.round(progress * 0.4), message);
    }
  });

  console.log('✅ WebSocket阶段结束, success:', taskResult.success, 'status:', taskResult.status);

  let outputVideoUrl = '';

  if (taskResult.success && taskResult.outputs && taskResult.outputs.length > 0) {
    for (const output of taskResult.outputs) {
      if (typeof output === 'string' && isVideoUrl(output)) {
        outputVideoUrl = output;
        console.log('✅ 从WebSocket找到输出视频 URL:', outputVideoUrl);
        break;
      }
    }
  }

  if (!outputVideoUrl) {
    console.log('📡 WebSocket未获取到视频URL，通过REST API轮询等待任务结果...');
    if (task) await taskService.updateProgress(task.id, 70, '正在获取生成结果...');
    const taskResultData = await runningHubAI.waitForTaskResult(result.taskId);
    if (taskResultData.success && taskResultData.outputs && taskResultData.outputs.length > 0) {
      for (const url of taskResultData.outputs) {
        if (isVideoUrl(url)) {
          outputVideoUrl = url;
          console.log('✅ 从REST API找到输出视频 URL:', outputVideoUrl);
          break;
        }
      }
      if (!outputVideoUrl && taskResultData.outputs.length > 0) {
        outputVideoUrl = taskResultData.outputs[0];
        console.log('⚠️ 未找到明确视频格式URL，使用第一个结果:', outputVideoUrl);
      }
    }
  }

  if (!outputVideoUrl) {
    if (task) await taskService.failTask(task.id, '未找到输出视频文件');
    throw new Error('未找到输出视频文件');
  }

  console.log('📥 下载视频文件到本地...');
  if (task) await taskService.updateProgress(task.id, 85, '正在下载视频文件...');

  const fileExt = outputVideoUrl.includes('.mov') ? '.mov' : '.mp4';
  const fileName = `video_${Date.now()}${fileExt}`;

  const downloadResult = await runningHubAI.downloadFile(outputVideoUrl, fileService.getFilePath('works', fileName));
  if (!downloadResult.success) {
    if (task) await taskService.failTask(task.id, '视频文件下载失败: ' + downloadResult.error);
    throw new Error('视频文件下载失败: ' + downloadResult.error);
  }

  console.log('✅ 视频文件已保存');
  if (task) await taskService.updateProgress(task.id, 95, '正在保存记录...');
  const fileUrl = fileService.getUrl('works', fileName);
  const fileSize = fs.statSync(fileService.getFilePath('works', fileName)).size;

  const work = await workLibraryRepository.create({
    userId: userId || '00000000-0000-0000-0000-000000000000',
    title: `视频_${Date.now()}`,
    videoPath: fileUrl,
    size: fileSize,
    status: 'completed',
    sourceType: 'video_to_video',
    description: `视频生视频: ${videoFileUrl} + ${audioFileUrl}`
  });

  console.log('✅ 作品记录已保存到数据库:', work.id);

  if (task) await taskService.completeTask(task.id, fileUrl);

  return { videoUrl: fileUrl, success: true, work, taskId: task ? task.id : null };
}

async function listVoices() {
  return await voiceRepository.findAll();
}

async function uploadVoice(voiceData, name, voiceType = 'text_to_speech', userId = null, isPublic = false) {
  const voiceDir = './assets/voices';
  if (!fs.existsSync(voiceDir)) {
    fs.mkdirSync(voiceDir, { recursive: true });
  }

  const voice = await voiceRepository.create({
    name,
    audioUrl: '',
    voiceType,
    userId,
    isPublic,
    metadata: {}
  });

  const audioUrl = `/assets/voices/${voice.id}.wav`;
  await voiceRepository.update(voice.id, { audioUrl });

  fs.writeFileSync(`./assets/voices/${voice.id}.wav`, voiceData, 'base64');

  return { voiceId: voice.id, success: true };
}

module.exports = { generateAudio, generateDubbing, generateImageToVideo, generateVideoToVideo, listVoices, uploadVoice };

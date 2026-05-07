const express = require('express');
const router = express.Router();
const { transcribeAudio, rewriteText, checkForbidden, generateText, extractTopics } = require('../services/textService');
const { getMockTranscription } = require('../services/mockASR');
const { parseDouyinVideo } = require('../services/douyinService');
const { parseKuaishouVideo } = require('../services/kuaishouService');
const { parseXiaohongshuVideo } = require('../services/xiaohongshuService');
const { parseBilibiliVideo } = require('../services/bilibiliService');
const SiliconFlowAI = require('../services/siliconFlowAI');
const apiConfig = require('../config/apiConfig');
const axios = require('axios');
const path = require('path');
const { execSync } = require('child_process');
const fileService = require('../services/fileService');
const { getFfmpegPath } = require('../utils/ffmpegHelper');
const taskService = require('../services/taskService');

router.post('/transcribe', async (req, res) => {
  try {
    const { audioPath, modelType, asrModel, roleSplit } = req.body;
    const result = await transcribeAudio(audioPath, modelType, asrModel, roleSplit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/rewrite', async (req, res) => {
  try {
    const { text, modelType, prompt, isCreative, model } = req.body;
    const result = await rewriteText(text, modelType, prompt, isCreative, model);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/check-forbidden', async (req, res) => {
  try {
    const { text, modelType } = req.body;
    const result = await checkForbidden(text, modelType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { prompt, systemPrompt, model, temperature, maxTokens } = req.body;
    const result = await generateText(prompt, { systemPrompt, model, temperature, maxTokens });
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/extract-topics', async (req, res) => {
  try {
    const { text, model } = req.body;
    const result = await extractTopics(text, { model });
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/models', (req, res) => {
  const sf = new SiliconFlowAI();
  res.json({
    success: true,
    models: sf.getAvailableModels(),
    defaultModel: apiConfig.siliconFlow.defaultModel,
    configured: !!apiConfig.siliconFlow.apiKey
  });
});

router.post('/chat', async (req, res) => {
  try {
    const { messages, model, temperature, maxTokens, topP, stream } = req.body;

    if (!apiConfig.siliconFlow.apiKey) {
      return res.status(400).json({ error: '硅基流动 API Key 未配置' });
    }

    const sf = new SiliconFlowAI(apiConfig.siliconFlow.apiKey, apiConfig.siliconFlow.baseUrl);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const result = await sf.chatCompletion(messages, {
        model: model || apiConfig.siliconFlow.defaultModel,
        temperature,
        maxTokens,
        topP,
        stream: true
      });

      if (result.success && result.stream) {
        result.stream.on('data', (chunk) => {
          res.write(chunk);
        });
        result.stream.on('end', () => {
          res.end();
        });
        result.stream.on('error', (error) => {
          console.error('Stream error:', error);
          res.end();
        });
      } else {
        res.write(`data: ${JSON.stringify({ error: result.error })}\n\n`);
        res.end();
      }
    } else {
      const result = await sf.chatCompletion(messages, {
        model: model || apiConfig.siliconFlow.defaultModel,
        temperature,
        maxTokens,
        topP
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json({ error: result.error });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/extract-from-video', async (req, res) => {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 开始处理文案提取请求');
  console.log('═'.repeat(60));
  console.log('请求参数:', JSON.stringify(req.body, null, 2));

  const userId = req.userId || req.user?.id || null;

  try {
    let { url, modelType, asrModel, roleSplit, useTestVideo } = req.body;

    if (!url && !useTestVideo) {
      console.error('❌ URL 为空且未使用测试模式');
      return res.status(400).json({ error: 'URL 是必需的，或者设置 useTestVideo: true 使用测试视频' });
    }

    let videoPath = null;
    if (useTestVideo) {
      const testVideoPath = './output/test_video.mp4';
      if (fileService.fileExists(testVideoPath)) {
        videoPath = testVideoPath;
        console.log('🎬 使用测试视频:', videoPath);
      } else {
        console.warn('⚠️ 测试视频不存在，跳过视频处理');
        const testAudioPath = './output/test_audio.wav';
        if (fileService.fileExists(testAudioPath)) {
          try {
            const result = await transcribeAudio(testAudioPath, modelType, asrModel, roleSplit, userId, null);
            return res.json({ text: result.text, success: true });
          } catch (e) {
            return res.status(500).json({ error: e.message });
          }
        } else {
          return res.status(400).json({ error: '测试视频/音频不存在，请先配置测试文件' });
        }
      }
    }

    if (!videoPath) {
      const urlMatch = url.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        url = urlMatch[1];
        console.log(`🎯 提取到的 URL: ${url}`);
      }

      console.log(`🎬 开始处理视频链接: ${url}`);

      let isUrl = url.startsWith('http://') || url.startsWith('https://');

      if (isUrl) {
        if (url.includes('douyin.com')) {
          console.log('📱 解析抖音视频...');
          try {
            const douyinResult = await parseDouyinVideo(url);
            if (!douyinResult.success || !douyinResult.localVideoPath) {
              throw new Error('抖音解析失败');
            }
            videoPath = douyinResult.localVideoPath;
            console.log(`✅ 视频已下载: ${videoPath}`);
          } catch (douyinError) {
            console.error('❌ 抖音解析失败:', douyinError.message);
            return res.status(500).json({ error: '抖音解析失败: ' + douyinError.message });
          }
        } else if (url.includes('kuaishou.com') || url.includes('gifshow.com') || url.includes('kwai.com')) {
          console.log('📱 解析快手视频...');
          try {
            const kuaishouResult = await parseKuaishouVideo(url);
            if (!kuaishouResult.success || !kuaishouResult.localVideoPath) {
              throw new Error('快手解析失败');
            }
            videoPath = kuaishouResult.localVideoPath;
            console.log(`✅ 视频已下载: ${videoPath}`);
          } catch (kuaishouError) {
            console.error('❌ 快手解析失败:', kuaishouError.message);
            return res.status(500).json({ error: '快手解析失败: ' + kuaishouError.message });
          }
        } else if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
          console.log('📱 解析小红书视频...');
          try {
            const xhsResult = await parseXiaohongshuVideo(url);
            if (!xhsResult.success || !xhsResult.localVideoPath) {
              throw new Error('小红书解析失败');
            }
            videoPath = xhsResult.localVideoPath;
            console.log(`✅ 视频已下载: ${videoPath}`);
          } catch (xhsError) {
            console.error('❌ 小红书解析失败:', xhsError.message);
            return res.status(500).json({ error: '小红书解析失败: ' + xhsError.message });
          }
        } else if (url.includes('bilibili.com') || url.includes('b23.tv')) {
          console.log('📱 解析哔哩哔哩视频...');
          try {
            const biliResult = await parseBilibiliVideo(url);
            if (!biliResult.success || !biliResult.localVideoPath) {
              throw new Error('哔哩哔哩解析失败');
            }
            videoPath = biliResult.localVideoPath;
            console.log(`✅ 视频已下载: ${videoPath}`);
          } catch (biliError) {
            console.error('❌ 哔哩哔哩解析失败:', biliError.message);
            return res.status(500).json({ error: '哔哩哔哩解析失败: ' + biliError.message });
          }
        } else {
          return res.status(400).json({ error: '暂时不支持此平台的视频链接，目前支持：抖音、快手、小红书、哔哩哔哩' });
        }
      } else {
        videoPath = url;
      }
    }

    if (!fileService.fileExists(videoPath)) {
      console.error('❌ 视频文件不存在:', videoPath);
      return res.status(400).json({ error: '视频文件不存在: ' + videoPath });
    }

    console.log('🔊 提取音频...');
    const outputDir = './output';
    fileService.ensureDir(outputDir);

    const audioPath = path.join(outputDir, `audio_${Date.now()}.wav`);
    let audioExtracted = false;

    try {
      const ffmpegPath = getFfmpegPath();
      if (!ffmpegPath) {
        throw new Error('ffmpeg 未安装或未找到');
      }
      console.log(`🎬 使用 ffmpeg: ${ffmpegPath}`);
      execSync(`"${ffmpegPath}" -y -i "${videoPath}" -vn -acodec pcm_s16le -ar 44100 -ac 1 "${audioPath}"`, {
        stdio: 'inherit',
        timeout: 120000
      });
      audioExtracted = fileService.fileExists(audioPath);
      if (audioExtracted) {
        const stats = fileService.fileStats(audioPath);
        console.log(`✅ 音频提取成功: ${audioPath} (${stats.size} bytes)`);
      }
    } catch (ffmpegError) {
      console.warn('⚠️ ffmpeg 执行失败，尝试直接使用视频文件:', ffmpegError.message);
    }

    const audioInput = audioExtracted ? audioPath : videoPath;
    console.log(`🎤 开始语音转文字: ${audioInput}`);

    try {
      const result = await transcribeAudio(audioInput, modelType, asrModel, roleSplit, userId, null);
      console.log('✅ 文案提取完成');
      res.json({ text: result.text, success: true });
    } catch (asrError) {
      console.warn('⚠️ ASR 失败:', asrError.message);
      res.status(500).json({ error: asrError.message });
    }

  } catch (error) {
    console.error('\n❌ 文案提取失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
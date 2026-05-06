const express = require('express');
const router = express.Router();
const { transcribeAudio, rewriteText, checkForbidden, generateText, extractTopics } = require('../services/textService');
const { getMockTranscription } = require('../services/mockASR');
const { parseDouyinVideo } = require('../services/douyinService');
const SiliconFlowAI = require('../services/siliconFlowAI');
const apiConfig = require('../config/apiConfig');
const axios = require('axios');
const path = require('path');
const { execSync } = require('child_process');
const fileService = require('../services/fileService');
const { getFfmpegPath } = require('../utils/ffmpegHelper');

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

  const userId = req.user?.id || null;

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
          const result = await transcribeAudio(testAudioPath, modelType, asrModel, roleSplit, userId);
          res.json({
            success: true,
            text: result.text,
            segments: result.segments
          });
          return;
        } else {
          throw new Error('测试视频/音频不存在，请先配置测试文件');
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
            throw new Error('抖音解析失败: ' + douyinError.message);
          }
        } else {
          console.log('📥 下载网络视频...');
          try {
            const response = await axios.get(url, {
              responseType: 'stream',
              timeout: 60000
            });

            const outputDir = './output';
            fileService.ensureDir(outputDir);

            videoPath = path.join(outputDir, `video_${Date.now()}.mp4`);
            const writer = fileService.createWriteStream(videoPath);

            await new Promise((resolve, reject) => {
              response.data.pipe(writer);
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
          } catch (downloadError) {
            console.error('❌ 视频下载失败:', downloadError.message);
            throw new Error('视频下载失败: ' + downloadError.message);
          }
        }
      } else {
        videoPath = url;
      }
    }

    if (!fileService.fileExists(videoPath)) {
      console.error('❌ 视频文件不存在:', videoPath);
      throw new Error('视频文件不存在: ' + videoPath);
    }

    console.log('🔊 提取音频...');
    const outputDir = './output';
    fileService.ensureDir(outputDir);

    const audioPath = path.join(outputDir, `audio_${Date.now()}.wav`);
    let audioExtracted = false;

    try {
      const ffmpegPath = getFfmpegPath();
      if (!ffmpegPath) {
        throw new Error('ffmpeg 未安装或未找到，请将 ffmpeg 放到项目根目录或 backend 目录下，或安装到系统 PATH 中');
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

    let usingMock = false;
    let result;

    try {
      result = await transcribeAudio(audioInput, modelType, asrModel, roleSplit, userId);
    } catch (asrError) {
      console.warn('⚠️ RunningHub ASR 失败，使用降级方案:', asrError.message);
      usingMock = true;
      const mockText = getMockTranscription(path.basename(audioInput));
      result = { text: mockText, segments: [] };
    }

    console.log('✅ 文案提取完成');

    console.log('\n' + '═'.repeat(60));
    console.log('📤 返回结果:');
    console.log('═'.repeat(60));
    console.log('success:', true);
    console.log('usingMock:', usingMock);
    console.log('text长度:', result.text.length);
    console.log('text预览:', result.text.substring(0, 100));
    console.log('═'.repeat(60) + '\n');

    res.json({
      success: true,
      text: result.text,
      segments: result.segments,
      videoPath: videoPath,
      audioPath: audioPath,
      usingMock
    });

  } catch (error) {
    console.error('\n❌ 文案提取失败:', error);
    console.error('═'.repeat(60) + '\n');
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
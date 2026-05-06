const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { addSubtitle, addCover, addBgm, compose, trimVideo, mergeVideos, getVideoDuration, alignSubtitles, previewSubtitle, extractFrames, generateCover } = require('../services/clipsService');
const RunningHubAI = require('../services/runningHubAI');
const apiConfig = require('../config/apiConfig');
const { getDynamicConfig } = require('../config/apiConfig');
const { getMockTranscription } = require('../services/mockASR');
const WorkLibrary = require('../models/WorkLibrary');
const fileService = require('../services/fileService');
const { getFfmpegPath } = require('../utils/ffmpegHelper');

const coversDir = path.join(__dirname, '../assets/covers');
fileService.ensureDir(coversDir);

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, coversDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const coverUpload = multer({ storage: coverStorage });

const uploadsDir = path.join(__dirname, '../assets/uploads');
fileService.ensureDir(uploadsDir);

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const videoUpload = multer({ storage: videoStorage });

function resolvePath(p) {
  if (!p) return p;
  if (p.startsWith('http://localhost:') || p.startsWith('http://127.0.0.1:')) {
    try {
      const url = new URL(p);
      return path.join(__dirname, '..', url.pathname);
    } catch (e) {
      return p;
    }
  }
  if (p.startsWith('/output') || p.startsWith('/assets')) {
    return path.join(__dirname, '..', p);
  }
  return p;
}

router.post('/subtitle', async (req, res) => {
  try {
    const { videoPath, subtitles, style } = req.body;
    if (!videoPath || !subtitles || !subtitles.length) {
      return res.status(400).json({ error: '视频路径和字幕不能为空' });
    }
    const result = await addSubtitle(resolvePath(videoPath), subtitles, style);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cover', coverUpload.single('cover'), async (req, res) => {
  try {
    const { videoPath, duration } = req.body;
    if (!videoPath) {
      return res.status(400).json({ error: '视频路径不能为空' });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请上传封面图片' });
    }
    const coverPath = path.join(coversDir, req.file.filename);
    const result = await addCover(resolvePath(videoPath), coverPath, parseInt(duration) || 2);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bgm', async (req, res) => {
  try {
    const { videoPath, bgmPath, volume } = req.body;
    if (!videoPath || !bgmPath) {
      return res.status(400).json({ error: '视频路径和背景音乐路径不能为空' });
    }
    const result = await addBgm(resolvePath(videoPath), resolvePath(bgmPath), parseFloat(volume) || 0.3);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/compose', coverUpload.single('cover'), async (req, res) => {
  try {
    const { videoPath, subtitles, subtitleStyle, coverDuration, bgmPath, bgmVolume, userId } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: '视频路径不能为空' });
    }

    const resolvedUserId = userId || '00000000-0000-0000-0000-000000000000';

    let parsedSubtitles = null;
    if (subtitles) {
      try {
        parsedSubtitles = typeof subtitles === 'string' ? JSON.parse(subtitles) : subtitles;
      } catch (e) {
        parsedSubtitles = null;
      }
    }

    let parsedStyle = null;
    if (subtitleStyle) {
      try {
        parsedStyle = typeof subtitleStyle === 'string' ? JSON.parse(subtitleStyle) : subtitleStyle;
      } catch (e) {
        parsedStyle = null;
      }
    }

    let coverImagePath = null;
    if (req.file) {
      coverImagePath = path.join(coversDir, req.file.filename);
    } else if (req.body.coverImagePath) {
      coverImagePath = resolvePath(req.body.coverImagePath);
    }

    console.log('🎬 Compose request:', {
      videoPath,
      subtitles: parsedSubtitles ? parsedSubtitles.length : 0,
      subtitleStyle: parsedStyle,
      coverImagePath,
      coverDuration,
      bgmPath: bgmPath ? 'yes' : 'no',
      userId: resolvedUserId
    });

    const result = await compose({
      videoPath: resolvePath(videoPath),
      subtitles: parsedSubtitles,
      subtitleStyle: parsedStyle,
      coverImagePath,
      coverDuration: parseFloat(coverDuration) || 0.5,
      bgmPath: bgmPath ? resolvePath(bgmPath) : null,
      bgmVolume: parseFloat(bgmVolume) || 0.3
    });

    if (result.videoPath && result.success) {
      const userOutputDir = path.join(__dirname, '..', 'output', resolvedUserId, 'videos');
      fileService.ensureDir(userOutputDir);

      const fileName = `composed_${Date.now()}.mp4`;
      const newPath = path.join(userOutputDir, fileName);
      fileService.renameFile(result.videoPath, newPath);
      result.videoPath = newPath;
      result.videoUrl = `/output/${resolvedUserId}/videos/${fileName}`;

      try {
        const stats = fileService.fileStats(newPath);
        let duration = 0;
        try {
          duration = await getVideoDuration(newPath);
        } catch (e) {
          console.warn('Failed to get video duration:', e.message);
        }

        await WorkLibrary.create({
          userId: resolvedUserId,
          title: `视频_${new Date().toLocaleString()}`,
          description: parsedSubtitles ? parsedSubtitles.map(s => s.text).join('\n') : '',
          content: parsedSubtitles ? JSON.stringify(parsedSubtitles) : '',
          videoPath: result.videoUrl,
          status: 'completed',
          duration: duration,
          size: stats.size,
          sourceType: 'clip_compose',
          category: 'video'
        });
        console.log('✅ Video saved to WorkLibrary');
      } catch (dbError) {
        console.warn('⚠️ Failed to save to database:', dbError.message);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Compose error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/trim', async (req, res) => {
  try {
    const { videoPath, startTime, endTime } = req.body;
    const result = await trimVideo(resolvePath(videoPath), startTime, endTime);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/merge', async (req, res) => {
  try {
    const { videoPaths } = req.body;
    const result = await mergeVideos(videoPaths);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/preview-subtitle', async (req, res) => {
  try {
    let { videoPath, text, style } = req.body;
    if (!videoPath) {
      return res.status(400).json({ error: '视频路径不能为空' });
    }
    if (!text) {
      return res.status(400).json({ error: '预览文字不能为空' });
    }
    if (videoPath.startsWith('/output') || videoPath.startsWith('/assets')) {
      videoPath = path.join(__dirname, '..', videoPath);
    }
    const result = await previewSubtitle(videoPath, text, style || {});
    const previewUrl = result.previewPath.replace(/.*\/output/, '/output');
    res.json({ success: true, previewUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/align-subtitles', async (req, res) => {
  try {
    const { videoPath, lines } = req.body;
    if (!videoPath) {
      return res.status(400).json({ error: '视频路径不能为空' });
    }
    if (!lines || !lines.length) {
      return res.status(400).json({ error: '字幕行不能为空' });
    }
    const subtitles = await alignSubtitles(resolvePath(videoPath), lines);
    res.json({ success: true, subtitles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai-generate-subtitle', async (req, res) => {
  try {
    const { videoPath } = req.body;
    if (!videoPath) {
      return res.status(400).json({ error: '视频路径不能为空' });
    }

    const resolvedPath = resolvePath(videoPath);
    if (!fileService.fileExists(resolvedPath)) {
      return res.status(400).json({ error: '视频文件不存在' });
    }

    const audioDir = path.join(__dirname, '..', 'output', 'audio');
    fileService.ensureDir(audioDir);
    const audioPath = path.join(audioDir, `audio_${Date.now()}.wav`);

    const ffmpegPath = getFfmpegPath();
    if (!ffmpegPath) {
      return res.status(500).json({ error: 'ffmpeg 未安装或未找到，请将 ffmpeg 放到项目根目录或 backend 目录下，或安装到系统 PATH 中' });
    }
    console.log(`🎬 使用 ffmpeg: ${ffmpegPath}`);
    execSync(`"${ffmpegPath}" -y -i "${resolvedPath}" -vn -acodec pcm_s16le -ar 44100 -ac 1 "${audioPath}"`, {
      stdio: 'pipe',
      timeout: 120000
    });

    if (!fileService.fileExists(audioPath)) {
      return res.status(500).json({ error: '音频提取失败' });
    }

    let usingMock = false;
    let textResult = '';
    let segments = [];

    try {
      const dynamicConfig = await getDynamicConfig();
      const rhApiKey = dynamicConfig.runningHub.apiKey;
      if (!rhApiKey) {
        throw new Error('RunningHub API Key 未配置');
      }
      const runningHubAI = new RunningHubAI(rhApiKey);
      const appId = dynamicConfig.runningHub.apps.subtitle || '2050542479962849282';

        const uploadResult = await runningHubAI.uploadFile(audioPath);
        if (!uploadResult.success) {
          throw new Error('文件上传失败: ' + (uploadResult.error || ''));
        }

        const nodeInfoList = [
          {
            nodeId: '12',
            fieldName: 'audio',
            fieldValue: uploadResult.fileName,
            description: 'audio'
          }
        ];

        const result = await runningHubAI.runAIApp(appId, nodeInfoList);
        if (!result.success) {
          throw new Error('任务发起失败: ' + (result.error || ''));
        }

        const taskResult = await runningHubAI.waitForCompletionWithWebSocket(result.taskId, result.netWssUrl);
        if (!taskResult.success || taskResult.status === 'FAILED') {
          throw new Error('任务执行失败: ' + (taskResult.error || ''));
        }

        textResult = taskResult.text || '';

        if (taskResult.outputs && taskResult.outputs.length > 0) {
          for (const outputUrl of taskResult.outputs) {
            const url = typeof outputUrl === 'string' ? outputUrl : (outputUrl.url || outputUrl.cos_url || '');
            if (!url) continue;
            try {
              const axios = require('axios');
              const fileResp = await axios.get(url, { responseType: 'text' });
              const fileContent = fileResp.data;

              if (url.endsWith('.json')) {
                try {
                  const parsed = JSON.parse(fileContent);
                  if (Array.isArray(parsed)) {
                    segments = parsed.map(item => ({
                      start: item.start || item.begin || 0,
                      end: item.end || item.finish || 0,
                      text: item.text || item.content || ''
                    }));
                  }
                } catch (e) {}
              } else if (url.endsWith('.srt')) {
                const srtBlocks = fileContent.trim().split(/\n\s*\n/);
                segments = [];
                for (const block of srtBlocks) {
                  const lines = block.trim().split('\n');
                  if (lines.length >= 3) {
                    const timeMatch = lines[1].match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);
                    if (timeMatch) {
                      const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
                      const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
                      const text = lines.slice(2).join('\n').trim();
                      segments.push({ start, end, text });
                    }
                  }
                }
              } else if (url.endsWith('.txt')) {
                const lines = fileContent.trim().split('\n');
                segments = [];
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;
                  const parts = trimmed.split(/\t/);
                  if (parts.length >= 3) {
                    const text = parts[0].trim();
                    const start = parseFloat(parts[1]);
                    const end = parseFloat(parts[2]);
                    if (text && !isNaN(start) && !isNaN(end)) {
                      segments.push({ start, end, text });
                    }
                  } else if (parts.length === 1 && parts[0].trim()) {
                    segments.push({ start: 0, end: 0, text: parts[0].trim() });
                  }
                }
              }

              if (!textResult && segments.length > 0) {
                textResult = segments.map(s => s.text).join('\n');
              }
            } catch (e) {
              console.warn('下载输出文件失败:', e.message);
            }
          }
        }

        if (!textResult && segments.length === 0) {
          throw new Error('未获取到转写结果');
        }

        if (textResult && segments.length === 0) {
          const lines = textResult.trim().split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const parts = trimmed.split(/\t/);
            if (parts.length >= 3) {
              const text = parts[0].trim();
              const start = parseFloat(parts[1]);
              const end = parseFloat(parts[2]);
              if (text && !isNaN(start) && !isNaN(end)) {
                segments.push({ start, end, text });
              }
            } else if (trimmed) {
              segments.push({ start: 0, end: 0, text: trimmed });
            }
          }
          if (segments.length > 0) {
            textResult = segments.map(s => s.text).join('\n');
          }
        }
    } catch (error) {
      console.warn('RunningHub 转写失败，使用模拟方案:', error.message);
      usingMock = true;
      textResult = getMockTranscription(path.basename(audioPath));
    }

    try { fileService.deleteFile(audioPath); } catch (e) {}

    res.json({
      success: true,
      text: textResult,
      segments,
      usingMock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/extract-frames', async (req, res) => {
  try {
    const { videoPath, count } = req.body;
    if (!videoPath) {
      return res.status(400).json({ error: '视频路径不能为空' });
    }
    const frames = await extractFrames(resolvePath(videoPath), parseInt(count) || 5);
    res.json({ success: true, frames });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-cover', async (req, res) => {
  try {
    const { framePath, text, style } = req.body;
    if (!framePath) {
      return res.status(400).json({ error: '帧图片路径不能为空' });
    }
    if (!text) {
      return res.status(400).json({ error: '封面文字不能为空' });
    }
    const resolvedFrame = resolvePath(framePath);
    const result = await generateCover(resolvedFrame, text, style || {});
    const coverUrl = result.coverPath.replace(/.*\/output/, '/output');
    res.json({ success: true, coverUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-cover-upload', coverUpload.single('cover'), async (req, res) => {
  try {
    const { text, style } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: '请上传封面图片' });
    }
    if (!text) {
      return res.status(400).json({ error: '封面文字不能为空' });
    }
    const coverImagePath = path.join(coversDir, req.file.filename);
    let parsedStyle = null;
    if (style) {
      try {
        parsedStyle = typeof style === 'string' ? JSON.parse(style) : style;
      } catch (e) {
        parsedStyle = null;
      }
    }
    const result = await generateCover(coverImagePath, text, parsedStyle || {});
    const coverUrl = result.coverPath.replace(/.*\/output/, '/output');
    res.json({ success: true, coverUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/music-list', async (req, res) => {
  try {
    const userInfo = req.query.userId ? { id: req.query.userId } : null;
    const userId = userInfo?.id || '00000000-0000-0000-0000-000000000000';

    const axios = require('axios');
    const INTERNAL_BASE_URL = `http://localhost:${process.env.PORT || 3001}`;
    const response = await axios.get(`${INTERNAL_BASE_URL}/api/music-library`, {
      params: { userId }
    });
    res.json(response.data);
  } catch (error) {
    res.json([]);
  }
});

router.post('/upload-video', videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传视频文件' });
    }
    const videoUrl = `/assets/uploads/${req.file.filename}`;
    res.json({ success: true, videoUrl });
  } catch (error) {
    console.error('视频上传失败:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

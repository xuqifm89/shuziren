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
const taskService = require('../services/taskService');

const coversDir = path.join(__dirname, '../assets/covers');
fileService.ensureDir(coversDir);

function parseSubtitleText(text) {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  const duration = 3;
  return lines.map((line, i) => ({
    text: line.trim(),
    start: i * duration,
    end: (i + 1) * duration
  }));
}

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
      try {
        fileService.renameFile(result.videoPath, newPath);
      } catch (renameErr) {
        console.warn('⚠️ Failed to rename output file:', renameErr.message);
      }
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
          size: stats ? stats.size : 0,
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
      return res.status(500).json({ error: 'ffmpeg 未安装或未找到' });
    }
    execSync(`"${ffmpegPath}" -y -i "${resolvedPath}" -vn -acodec pcm_s16le -ar 44100 -ac 1 "${audioPath}"`, {
      stdio: 'pipe',
      timeout: 120000
    });

    if (!fileService.fileExists(audioPath)) {
      return res.status(500).json({ error: '音频提取失败' });
    }

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

        let subtitleText = taskResult.text || '';
        if (!subtitleText && taskResult.outputs && taskResult.outputs.text) {
          subtitleText = Array.isArray(taskResult.outputs.text) ? taskResult.outputs.text.join('\n') : taskResult.outputs.text;
        }

        const subtitles = parseSubtitleText(subtitleText);
        res.json({ subtitles, text: subtitleText, success: true });
    } catch (error) {
      console.warn('RunningHub 转写失败:', error.message);
      res.status(500).json({ error: error.message });
    }

    try { fileService.deleteFile(audioPath); } catch (e) {}
  } catch (error) {
    console.error('字幕生成失败:', error.message);
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

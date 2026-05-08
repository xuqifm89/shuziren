const express = require('express');
const router = express.Router();
const path = require('path');
const audioService = require('../services/audioService');
const taskService = require('../services/taskService');
const voiceRepository = require('../repositories/VoiceRepository');
const fileService = require('../services/fileService');

router.post('/generate', async (req, res) => {
  try {
    const { text, voiceId, modelType } = req.body;
    const result = await audioService.generateAudio(text, voiceId, modelType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-dubbing', async (req, res) => {
  try {
    const { voiceFileUrl, text, emotionDescription, userId } = req.body;

    if (!text) {
      return res.status(400).json({ error: '请提供配音文本' });
    }

    if (!voiceFileUrl) {
      return res.status(400).json({ error: '请选择声音文件' });
    }

    let voiceFilePath;
    if (voiceFileUrl.startsWith('http')) {
      const fileName = path.basename(voiceFileUrl);
      const tempPath = path.join(__dirname, '../temp', fileName);
      const tempDir = path.dirname(tempPath);

      fileService.ensureDir(tempDir);

      const axios = require('axios');
      const response = await axios.get(voiceFileUrl, { responseType: 'arraybuffer' });
      fileService.writeBuffer(tempPath, response.data);
      voiceFilePath = tempPath;
    } else {
      voiceFilePath = path.join(__dirname, '..', voiceFileUrl);
    }

    const task = await taskService.createTask({
      taskType: 'audio_generation',
      userId: userId || req.userId,
      inputParams: { voiceFileUrl, text: text.substring(0, 100), emotionDescription }
    });

    res.json({ taskId: task.id, status: 'pending', success: true });

    audioService.generateDubbing(voiceFilePath, text, emotionDescription, userId || req.userId, task.id).catch(err => {
      console.error('配音生成异步失败:', err.message);
    });
  } catch (error) {
    console.error('配音生成失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/voices', async (req, res) => {
  try {
    const { voiceType, userId } = req.query;
    let voices;
    if (userId) {
      voices = await voiceRepository.findByUserOrPublic(userId);
    } else if (voiceType) {
      voices = await voiceRepository.findByVoiceType(voiceType);
    } else {
      voices = await voiceRepository.findAll();
    }
    res.json(voices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/voices/:id', async (req, res) => {
  try {
    const voice = await voiceRepository.findById(req.params.id);
    if (voice) {
      res.json(voice);
    } else {
      res.status(404).json({ error: 'Voice not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload-voice', async (req, res) => {
  try {
    const { voiceData, name, voiceType = 'text_to_speech', userId, isPublic = false } = req.body;
    const result = await audioService.uploadVoice(voiceData, name, voiceType, userId, isPublic);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-image-to-video', async (req, res) => {
  try {
    let { imageFileUrl, audioFileUrl, userId } = req.body;

    if (!imageFileUrl) {
      return res.status(400).json({ error: '请提供图片文件' });
    }

    if (!audioFileUrl) {
      return res.status(400).json({ error: '请提供音频文件' });
    }

    if (!imageFileUrl.startsWith('http')) {
      imageFileUrl = path.resolve(__dirname, '..', imageFileUrl.replace(/^\//, ''));
    }
    if (!audioFileUrl.startsWith('http')) {
      audioFileUrl = path.resolve(__dirname, '..', audioFileUrl.replace(/^\//, ''));
    }

    const task = await taskService.createTask({
      taskType: 'video_generation',
      userId: userId || req.userId,
      inputParams: { imageFileUrl, audioFileUrl, mode: 'image_to_video' }
    });

    res.json({ taskId: task.id, status: 'pending', success: true });

    audioService.generateImageToVideo(imageFileUrl, audioFileUrl, userId || req.userId, task.id).catch(err => {
      console.error('图片生成视频异步失败:', err.message);
    });
  } catch (error) {
    console.error('图片生成视频失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-video-to-video', async (req, res) => {
  try {
    let { videoFileUrl, audioFileUrl, userId } = req.body;

    if (!videoFileUrl) {
      return res.status(400).json({ error: '请提供视频文件' });
    }

    if (!audioFileUrl) {
      return res.status(400).json({ error: '请提供音频文件' });
    }

    if (!videoFileUrl.startsWith('http')) {
      videoFileUrl = path.resolve(__dirname, '..', videoFileUrl.replace(/^\//, ''));
    }
    if (!audioFileUrl.startsWith('http')) {
      audioFileUrl = path.resolve(__dirname, '..', audioFileUrl.replace(/^\//, ''));
    }

    const task = await taskService.createTask({
      taskType: 'video_generation',
      userId: userId || req.userId,
      inputParams: { videoFileUrl, audioFileUrl, mode: 'video_to_video' }
    });

    res.json({ taskId: task.id, status: 'pending', success: true });

    audioService.generateVideoToVideo(videoFileUrl, audioFileUrl, userId || req.userId, task.id).catch(err => {
      console.error('视频生成视频异步失败:', err.message);
    });
  } catch (error) {
    console.error('视频生成视频失败:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/voices/:id', async (req, res) => {
  try {
    const { name, audioUrl, voiceType, metadata } = req.body;
    const voice = await voiceRepository.update(req.params.id, { name, audioUrl, voiceType, metadata });
    if (voice) {
      res.json(voice);
    } else {
      res.status(404).json({ error: 'Voice not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/voices/:id', async (req, res) => {
  try {
    const result = await voiceRepository.delete(req.params.id);
    if (result) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Voice not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

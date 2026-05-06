const express = require('express');
const router = express.Router();
const videoService = require('../services/videoService');
const avatarRepository = require('../repositories/AvatarRepository');
const { parseDouyinVideo } = require('../services/douyinService');
const { parseKuaishouVideo } = require('../services/kuaishouService');
const { parseXiaohongshuVideo } = require('../services/xiaohongshuService');
const { parseBilibiliVideo } = require('../services/bilibiliService');
const axios = require('axios');
const path = require('path');
const { execSync } = require('child_process');
const fileService = require('../services/fileService');
const taskService = require('../services/taskService');

router.post('/generate', async (req, res) => {
  try {
    const { audioPath, avatarId, modelType, userId } = req.body;

    try {
      const result = await videoService.generateVideo(audioPath, avatarId, modelType, userId, null);
      res.json({ videoUrl: result.videoUrl, success: true });
    } catch (genError) {
      res.status(500).json({ error: genError.message });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/avatars', async (req, res) => {
  try {
    const { type } = req.query;
    let avatars;
    if (type) {
      avatars = await avatarRepository.findByType(type);
    } else {
      avatars = await avatarRepository.findAll();
    }
    res.json(avatars);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/avatars/:id', async (req, res) => {
  try {
    const avatar = await avatarRepository.findById(req.params.id);
    if (avatar) {
      res.json(avatar);
    } else {
      res.status(404).json({ error: 'Avatar not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload-avatar', async (req, res) => {
  try {
    const { avatarData, name, type = 'image' } = req.body;
    const result = await videoService.uploadAvatar(avatarData, name, type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/avatars/:id', async (req, res) => {
  try {
    const { name, thumbnailUrl, metadata } = req.body;
    const avatar = await avatarRepository.update(req.params.id, { name, thumbnailUrl, metadata });
    if (avatar) {
      res.json(avatar);
    } else {
      res.status(404).json({ error: 'Avatar not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/avatars/:id', async (req, res) => {
  try {
    const result = await avatarRepository.delete(req.params.id);
    if (result) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Avatar not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sounds', async (req, res) => {
  try {
    const sounds = await videoService.listSounds();
    res.json(sounds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

router.post('/douyin/parse', async (req, res) => {
  try {
    const result = await parseDouyinVideo(req.body.url);
    res.json(result);
  } catch (error) {
    console.error('\n❌ 抖音解析失败:', error.message);
    console.error('═'.repeat(60) + '\n');
    if (error.videoInfo) {
      res.status(400).json({ error: 'Video download failed', detail: error.message, videoInfo: error.videoInfo });
    } else {
      res.status(500).json({ error: '抖音解析失败: ' + error.message });
    }
  }
});

router.post('/kuaishou/parse', async (req, res) => {
  try {
    const result = await parseKuaishouVideo(req.body.url);
    res.json(result);
  } catch (error) {
    console.error('\n❌ 快手解析失败:', error.message);
    console.error('═'.repeat(60) + '\n');
    if (error.videoInfo) {
      res.status(400).json({ error: 'Video download failed', detail: error.message, videoInfo: error.videoInfo });
    } else {
      res.status(500).json({ error: '快手解析失败: ' + error.message });
    }
  }
});

router.post('/xiaohongshu/parse', async (req, res) => {
  try {
    const result = await parseXiaohongshuVideo(req.body.url);
    res.json(result);
  } catch (error) {
    console.error('\n❌ 小红书解析失败:', error.message);
    console.error('═'.repeat(60) + '\n');
    if (error.videoInfo) {
      res.status(400).json({ error: 'Video download failed', detail: error.message, videoInfo: error.videoInfo });
    } else {
      res.status(500).json({ error: '小红书解析失败: ' + error.message });
    }
  }
});

router.post('/bilibili/parse', async (req, res) => {
  try {
    const result = await parseBilibiliVideo(req.body.url);
    res.json(result);
  } catch (error) {
    console.error('\n❌ 哔哩哔哩解析失败:', error.message);
    console.error('═'.repeat(60) + '\n');
    if (error.videoInfo) {
      res.status(400).json({ error: 'Video download failed', detail: error.message, videoInfo: error.videoInfo });
    } else {
      res.status(500).json({ error: '哔哩哔哩解析失败: ' + error.message });
    }
  }
});

module.exports = router;
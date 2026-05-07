const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { execSync } = require('child_process');
const voiceLibraryRepository = require('../repositories/VoiceLibraryRepository');
const fileService = require('../services/fileService');
const { getFfmpegPath } = require('../utils/ffmpegHelper');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const ffmpegPath = getFfmpegPath() || 'ffmpeg';

const voicesDir = path.join(__dirname, '../assets/voices');
fileService.ensureDir(voicesDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, voicesDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.get('/', optionalAuth, async (req, res) => {
  try {
    const effectiveUserId = req.userId;
    
    let voices;
    if (effectiveUserId) {
      voices = await voiceLibraryRepository.findByUserIdWithPublic(effectiveUserId);
    } else {
      voices = await voiceLibraryRepository.findPublic();
    }
    
    if (!Array.isArray(voices)) {
      voices = [];
    }
    
    // 对缺少 duration 的记录，尝试从文件获取
    for (let i = 0; i < voices.length; i++) {
      const voice = voices[i];
      if ((!voice.duration || voice.duration === 0) && voice.fileUrl) {
        const fileName = voice.fileUrl.split('/').pop();
        const filePath = path.join(voicesDir, fileName);
        if (fileService.fileExists(filePath)) {
          const duration = getAudioDuration(filePath);
          if (duration > 0) {
            voice.duration = duration;
            voiceLibraryRepository.update(voice.id, { duration });
          }
        }
      }
    }
    
    res.json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.json([]);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const voice = await voiceLibraryRepository.findById(req.params.id);
    if (!voice) {
      return res.status(404).json({ error: '音色不存在' });
    }
    if (!voice.isPublic && voice.userId !== req.userId) {
      return res.status(404).json({ error: '音色不存在' });
    }
    res.json(voice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const voices = await voiceLibraryRepository.searchByKeyword(req.params.keyword);
    const filtered = voices.filter(v => v.isPublic || v.userId === req.userId);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取音频时长的辅助函数 - 使用 ffmpeg -i 命令
const getAudioDuration = (filePath) => {
  try {
    const cmd = `"${ffmpegPath}" -i "${filePath}" 2>&1`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (match) {
      const hours = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const secs = parseInt(match[3]);
      return hours * 3600 + mins * 60 + secs;
    }
    return 0;
  } catch (err) {
    // ffmpeg -i 在没有输出文件时会返回非零退出码，但 stderr 中仍包含 Duration 信息
    const output = err.stderr || err.stdout || '';
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (match) {
      const hours = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const secs = parseInt(match[3]);
      return hours * 3600 + mins * 60 + secs;
    }
    return 0;
  }
};

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传音频文件' });
    }
    
    let filePath = path.join(voicesDir, req.file.filename);
    
    if (filePath.toLowerCase().endsWith('.flac')) {
      const mp3FileName = req.file.filename.replace(/\.flac$/i, '.mp3');
      const mp3FilePath = path.join(voicesDir, mp3FileName);
      try {
        execSync(`"${ffmpegPath}" -y -i "${filePath}" -ab 192k -f mp3 "${mp3FilePath}"`, { timeout: 30000 });
        const fs = require('fs');
        fs.unlinkSync(filePath);
        filePath = mp3FilePath;
        req.file.filename = mp3FileName;
        console.log(`✅ Converted FLAC to MP3: ${mp3FileName}`);
      } catch (convErr) {
        console.warn(`⚠️ FLAC to MP3 conversion failed: ${convErr.message}`);
      }
    }
    
    const duration = getAudioDuration(filePath);
    
    const fileUrl = `/assets/voices/${req.file.filename}`;
    res.json({ 
      fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      duration: duration
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { fileName, fileUrl, fileSize, duration, description, tags, isPublic } = req.body;
    
    const voice = await voiceLibraryRepository.create({
      userId: req.userId,
      fileName,
      fileUrl,
      fileSize,
      duration,
      description,
      tags,
      isPublic: isPublic || false
    });
    
    res.status(201).json(voice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await voiceLibraryRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '音色不存在' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: '无权修改此音色' });
    }
    const { fileName, fileUrl, fileSize, duration, description, tags, isPublic } = req.body;
    const voice = await voiceLibraryRepository.update(req.params.id, {
      fileName,
      fileUrl,
      fileSize,
      duration,
      description,
      tags,
      isPublic
    });
    
    if (voice) {
      res.json(voice);
    } else {
      res.status(404).json({ error: '音色不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/usage', async (req, res) => {
  try {
    const voice = await voiceLibraryRepository.incrementUsageCount(req.params.id);
    if (voice) {
      res.json({ usageCount: voice.usageCount });
    } else {
      res.status(404).json({ error: '音色不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const voice = await voiceLibraryRepository.findById(req.params.id);
    if (!voice) {
      return res.status(404).json({ error: '音色不存在' });
    }
    if (voice.userId !== req.userId) {
      return res.status(403).json({ error: '无权删除此音色' });
    }
    
    const filePath = path.join(voicesDir, voice.fileName);
    if (fileService.fileExists(filePath)) {
      fileService.deleteFile(filePath);
    }
    
    await voiceLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
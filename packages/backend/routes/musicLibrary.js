const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { execSync } = require('child_process');
const musicLibraryRepository = require('../repositories/MusicLibraryRepository');
const fileService = require('../services/fileService');
const { getFfmpegPath } = require('../utils/ffmpegHelper');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const ffmpegPath = getFfmpegPath() || 'ffmpeg';

const musicsDir = path.join(__dirname, '../assets/musics');
fileService.ensureDir(musicsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, musicsDir);
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
    const isAdmin = req.userRole === 'admin' || req.userRole === 'superadmin';
    
    let musics;
    if (isAdmin) {
      musics = await musicLibraryRepository.findAll();
    } else if (effectiveUserId) {
      musics = await musicLibraryRepository.findByUserIdWithPublic(effectiveUserId);
    } else {
      musics = await musicLibraryRepository.findPublic();
    }
    
    if (!Array.isArray(musics)) {
      musics = [];
    }
    
    // 对缺少 duration 的记录，尝试从文件获取
    for (let i = 0; i < musics.length; i++) {
      const music = musics[i];
      if ((!music.duration || music.duration === 0) && music.fileUrl) {
        const fileName = music.fileUrl.split('/').pop();
        const filePath = path.join(musicsDir, fileName);
        if (fileService.fileExists(filePath)) {
          const duration = getAudioDuration(filePath);
          if (duration > 0) {
            music.duration = duration;
            musicLibraryRepository.update(music.id, { duration });
          }
        }
      }
    }
    
    res.json(musics);
  } catch (error) {
    console.error('Error fetching musics:', error);
    res.json([]);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const music = await musicLibraryRepository.findById(req.params.id);
    if (!music) {
      return res.status(404).json({ error: '音乐不存在' });
    }
    if (!music.isPublic && music.userId !== req.userId) {
      return res.status(404).json({ error: '音乐不存在' });
    }
    res.json(music);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const musics = await musicLibraryRepository.searchByKeyword(req.params.keyword);
    const filtered = musics.filter(m => m.isPublic || m.userId === req.userId);
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
    
    let filePath = path.join(musicsDir, req.file.filename);
    
    if (filePath.toLowerCase().endsWith('.flac') || filePath.toLowerCase().endsWith('.wav')) {
      const mp3FileName = req.file.filename.replace(/\.(flac|wav)$/i, '.mp3');
      const mp3FilePath = path.join(musicsDir, mp3FileName);
      try {
        execSync(`"${ffmpegPath}" -y -i "${filePath}" -ab 192k -f mp3 "${mp3FilePath}"`, { timeout: 30000 });
        const fs = require('fs');
        fs.unlinkSync(filePath);
        filePath = mp3FilePath;
        req.file.filename = mp3FileName;
        console.log(`✅ Converted to MP3: ${mp3FileName}`);
      } catch (convErr) {
        console.warn(`⚠️ Audio to MP3 conversion failed: ${convErr.message}`);
      }
    }
    
    const duration = getAudioDuration(filePath);
    
    const fileUrl = `/assets/musics/${req.file.filename}`;
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
    
    const music = await musicLibraryRepository.create({
      userId: req.userId,
      fileName,
      fileUrl,
      fileSize,
      duration,
      description,
      tags,
      isPublic: isPublic || false
    });
    
    res.status(201).json(music);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await musicLibraryRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '音乐不存在' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: '无权修改此音乐' });
    }
    const { fileName, fileUrl, fileSize, duration, description, tags, isPublic } = req.body;
    const music = await musicLibraryRepository.update(req.params.id, {
      fileName,
      fileUrl,
      fileSize,
      duration,
      description,
      tags,
      isPublic
    });
    
    if (music) {
      res.json(music);
    } else {
      res.status(404).json({ error: '音乐不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/usage', async (req, res) => {
  try {
    const music = await musicLibraryRepository.incrementUsageCount(req.params.id);
    if (music) {
      res.json({ usageCount: music.usageCount });
    } else {
      res.status(404).json({ error: '音乐不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const music = await musicLibraryRepository.findById(req.params.id);
    if (!music) {
      return res.status(404).json({ error: '音乐不存在' });
    }
    if (music.userId !== req.userId) {
      return res.status(403).json({ error: '无权删除此音乐' });
    }
    
    const filePath = path.join(musicsDir, music.fileName);
    if (fileService.fileExists(filePath)) {
      fileService.deleteFile(filePath);
    }
    
    await musicLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

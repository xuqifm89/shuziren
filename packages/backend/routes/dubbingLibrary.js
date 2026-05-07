const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { execSync } = require('child_process');
const dubbingLibraryRepository = require('../repositories/DubbingLibraryRepository');
const fileService = require('../services/fileService');
const { getFfmpegPath } = require('../utils/ffmpegHelper');
const { authMiddleware } = require('../middleware/auth');

const ffmpegPath = getFfmpegPath() || 'ffmpeg';

const dubbingsDir = path.join(__dirname, '../assets/dubbings');
fileService.ensureDir(dubbingsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, dubbingsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const authUserId = req.userId;
    const queryUserId = req.query.userId;
    const effectiveUserId = authUserId || queryUserId;
    
    let dubbings;
    if (effectiveUserId) {
      dubbings = await dubbingLibraryRepository.findByUserIdWithPublic(effectiveUserId);
    } else {
      dubbings = await dubbingLibraryRepository.findPublic();
    }
    
    if (!Array.isArray(dubbings)) {
      dubbings = [];
    }
    
    // 对缺少 duration 的记录，尝试从文件获取
    for (let i = 0; i < dubbings.length; i++) {
      const dubbing = dubbings[i];
      if ((!dubbing.duration || dubbing.duration === 0) && dubbing.fileUrl) {
        const fileName = dubbing.fileUrl.split('/').pop();
        const filePath = path.join(dubbingsDir, fileName);
        if (fileService.fileExists(filePath)) {
          const duration = getAudioDuration(filePath);
          if (duration > 0) {
            dubbing.duration = duration;
            dubbingLibraryRepository.update(dubbing.id, { duration });
          }
        }
      }
    }
    
    res.json(dubbings);
  } catch (error) {
    console.error('Error fetching dubbings:', error);
    res.json([]);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const dubbing = await dubbingLibraryRepository.findById(req.params.id);
    if (!dubbing) {
      return res.status(404).json({ error: '配音不存在' });
    }
    if (!dubbing.isPublic && dubbing.userId !== req.userId) {
      return res.status(404).json({ error: '配音不存在' });
    }
    res.json(dubbing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const dubbings = await dubbingLibraryRepository.searchByKeyword(req.params.keyword);
    const filtered = dubbings.filter(d => d.isPublic || d.userId === req.userId);
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
    
    const filePath = path.join(dubbingsDir, req.file.filename);
    const duration = getAudioDuration(filePath);
    
    const fileUrl = `/assets/dubbings/${req.file.filename}`;
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
    
    const dubbing = await dubbingLibraryRepository.create({
      userId: req.userId,
      fileName,
      fileUrl,
      fileSize,
      duration,
      description,
      tags,
      isPublic: isPublic || false
    });
    
    res.status(201).json(dubbing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await dubbingLibraryRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '配音不存在' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: '无权修改此配音' });
    }
    const { fileName, fileUrl, fileSize, duration, description, tags, isPublic } = req.body;
    const dubbing = await dubbingLibraryRepository.update(req.params.id, {
      fileName,
      fileUrl,
      fileSize,
      duration,
      description,
      tags,
      isPublic
    });
    
    if (dubbing) {
      res.json(dubbing);
    } else {
      res.status(404).json({ error: '配音不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/usage', async (req, res) => {
  try {
    const dubbing = await dubbingLibraryRepository.incrementUsageCount(req.params.id);
    if (dubbing) {
      res.json({ usageCount: dubbing.usageCount });
    } else {
      res.status(404).json({ error: '配音不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const dubbing = await dubbingLibraryRepository.findById(req.params.id);
    if (!dubbing) {
      return res.status(404).json({ error: '配音不存在' });
    }
    if (dubbing.userId !== req.userId) {
      return res.status(403).json({ error: '无权删除此配音' });
    }
    
    const filePath = path.join(dubbingsDir, dubbing.fileName);
    if (fileService.fileExists(filePath)) {
      fileService.deleteFile(filePath);
    }
    
    await dubbingLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

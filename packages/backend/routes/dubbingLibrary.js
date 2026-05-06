const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { execSync } = require('child_process');
const dubbingLibraryRepository = require('../repositories/DubbingLibraryRepository');
const fileService = require('../services/fileService');
const { getFfmpegPath } = require('../utils/ffmpegHelper');

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
    const { userId, isPublic } = req.query;
    
    let dubbings;
    if (userId) {
      dubbings = await dubbingLibraryRepository.findByUserIdWithPublic(userId);
    } else if (isPublic === 'true') {
      dubbings = await dubbingLibraryRepository.findPublic();
    } else {
      dubbings = await dubbingLibraryRepository.findAll();
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
    if (dubbing) {
      res.json(dubbing);
    } else {
      res.status(404).json({ error: '配音不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const dubbings = await dubbingLibraryRepository.searchByKeyword(req.params.keyword);
    res.json(dubbings);
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

router.post('/', async (req, res) => {
  try {
    const { userId, fileName, fileUrl, fileSize, duration, description, tags, isPublic } = req.body;
    
    const dubbing = await dubbingLibraryRepository.create({
      userId: userId || '00000000-0000-0000-0000-000000000000',
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

router.put('/:id', async (req, res) => {
  try {
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

router.delete('/:id', async (req, res) => {
  try {
    const dubbing = await dubbingLibraryRepository.findById(req.params.id);
    if (!dubbing) {
      return res.status(404).json({ error: '配音不存在' });
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

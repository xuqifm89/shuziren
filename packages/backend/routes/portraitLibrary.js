const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { execSync } = require('child_process');
const portraitLibraryRepository = require('../repositories/PortraitLibraryRepository');
const fileService = require('../services/fileService');
const { getFfmpegPath } = require('../utils/ffmpegHelper');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const ffmpegPath = getFfmpegPath() || 'ffmpeg';

const portraitsDir = path.join(__dirname, '../assets/portraits');
fileService.ensureDir(portraitsDir);

const imageDir = path.join(portraitsDir, 'images');
fileService.ensureDir(imageDir);

const videoDir = path.join(portraitsDir, 'videos');
fileService.ensureDir(videoDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mimetype = file.mimetype || '';
    if (mimetype.startsWith('video/')) {
      cb(null, videoDir);
    } else {
      cb(null, imageDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^\w\u4e00-\u9fff\-]/g, '_');
    const uniqueName = Date.now() + '-' + baseName + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// 获取图片尺寸
const getImageDimensions = (filePath) => {
  try {
    const imageSizeMode = require('image-size');
    const sizeOf = imageSizeMode.imageSize || imageSizeMode.default || imageSizeMode;
    if (typeof sizeOf === 'function') {
      const dimensions = sizeOf(filePath);
      if (dimensions && dimensions.width && dimensions.height) {
        return { width: dimensions.width, height: dimensions.height };
      }
    }
    return getMediaDimensions(filePath);
  } catch (e) {
    return getMediaDimensions(filePath);
  }
};

// 用 ffmpeg 获取媒体尺寸
const getMediaDimensions = (filePath) => {
  try {
    const cmd = `"${ffmpegPath}" -i "${filePath}" 2>&1`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    const match = output.match(/Stream.*?,\s*(\d+)x(\d+)/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    return { width: 0, height: 0 };
  } catch (err) {
    const output = err.stderr || err.stdout || '';
    const match = output.match(/Stream.*?,\s*(\d+)x(\d+)/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    return { width: 0, height: 0 };
  }
};

// 获取视频时长
const getVideoDuration = (filePath) => {
  try {
    const cmd = `"${ffmpegPath}" -i "${filePath}" 2>&1`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
    }
    return 0;
  } catch (err) {
    const output = err.stderr || err.stdout || '';
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (match) {
      return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
    }
    return 0;
  }
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    const effectiveUserId = req.userId;
    const { type } = req.query;
    
    let portraits;
    if (effectiveUserId && type) {
      portraits = await portraitLibraryRepository.findByUserIdAndType(effectiveUserId, type);
    } else if (effectiveUserId) {
      portraits = await portraitLibraryRepository.findByUserIdWithPublic(effectiveUserId);
    } else if (type) {
      portraits = await portraitLibraryRepository.findPublicByType(type);
    } else {
      portraits = await portraitLibraryRepository.findPublic();
    }
    
    if (!Array.isArray(portraits)) {
      portraits = [];
    }
    
    // 对缺少尺寸的记录，尝试从文件获取
    for (let i = 0; i < portraits.length; i++) {
      const p = portraits[i];
      if ((!p.width || !p.height || (p.width === 0 && p.height === 0)) && p.fileUrl) {
        const fileName = p.fileUrl.split('/').pop();
        let filePath = path.join(p.type === 'video' ? videoDir : imageDir, fileName);
        if (!fileService.fileExists(filePath)) {
          filePath = path.join(p.type === 'video' ? imageDir : videoDir, fileName);
        }
        if (fileService.fileExists(filePath)) {
          const dims = p.type === 'video' ? getMediaDimensions(filePath) : getImageDimensions(filePath);
          if (dims.width > 0 && dims.height > 0) {
            p.width = dims.width;
            p.height = dims.height;
            const updateData = { width: dims.width, height: dims.height };
            if (p.type === 'video' && (!p.duration || p.duration === 0)) {
              const duration = getVideoDuration(filePath);
              if (duration > 0) {
                p.duration = duration;
                updateData.duration = duration;
              }
            }
            portraitLibraryRepository.update(p.id, updateData);
          }
          const correctDir = p.type === 'video' ? videoDir : imageDir;
          const currentDir = path.dirname(filePath);
          if (currentDir !== correctDir) {
            const newPath = path.join(correctDir, fileName);
            fileService.renameFile(filePath, newPath);
            const correctUrl = `/assets/portraits/${p.type}s/${fileName}`;
            if (p.fileUrl !== correctUrl) {
              p.fileUrl = correctUrl;
              portraitLibraryRepository.update(p.id, { fileUrl: correctUrl });
            }
          }
        }
      }
    }
    
    res.json(portraits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const portrait = await portraitLibraryRepository.findById(req.params.id);
    if (!portrait) {
      return res.status(404).json({ error: '肖像不存在' });
    }
    if (!portrait.isPublic && portrait.userId !== req.userId) {
      return res.status(404).json({ error: '肖像不存在' });
    }
    res.json(portrait);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const portraits = await portraitLibraryRepository.searchByKeyword(req.params.keyword);
    const filtered = portraits.filter(p => p.isPublic || p.userId === req.userId);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传肖像文件' });
    }
    
    const mimetype = req.file.mimetype || '';
    const fileType = mimetype.startsWith('video/') ? 'video' : 'image';
    const fileUrl = `/assets/portraits/${fileType}s/${req.file.filename}`;
    const filePath = req.file.path;
    
    let width = 0;
    let height = 0;
    let duration = 0;
    
    if (fileType === 'image') {
      const dims = getImageDimensions(filePath);
      width = dims.width;
      height = dims.height;
    } else if (fileType === 'video') {
      const dims = getMediaDimensions(filePath);
      width = dims.width;
      height = dims.height;
      duration = getVideoDuration(filePath);
    }
    
    res.json({ 
      fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      type: fileType,
      width,
      height,
      duration
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { fileName, fileUrl, fileSize, type, width, height, duration, description, tags, isPublic } = req.body;
    
    const portrait = await portraitLibraryRepository.create({
      userId: req.userId,
      fileName,
      fileUrl,
      fileSize,
      type: type || 'image',
      width,
      height,
      duration,
      description,
      tags,
      isPublic: isPublic || false
    });
    
    res.status(201).json(portrait);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await portraitLibraryRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '肖像不存在' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: '无权修改此肖像' });
    }
    const { fileName, fileUrl, fileSize, type, width, height, duration, description, tags, isPublic } = req.body;
    const portrait = await portraitLibraryRepository.update(req.params.id, {
      fileName,
      fileUrl,
      fileSize,
      type,
      width,
      height,
      duration,
      description,
      tags,
      isPublic
    });
    
    if (portrait) {
      res.json(portrait);
    } else {
      res.status(404).json({ error: '肖像不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/usage', async (req, res) => {
  try {
    const portrait = await portraitLibraryRepository.incrementUsageCount(req.params.id);
    if (portrait) {
      res.json({ usageCount: portrait.usageCount });
    } else {
      res.status(404).json({ error: '肖像不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const portrait = await portraitLibraryRepository.findById(req.params.id);
    if (!portrait) {
      return res.status(404).json({ error: '肖像不存在' });
    }
    if (portrait.userId !== req.userId) {
      return res.status(403).json({ error: '无权删除此肖像' });
    }
    
    const dir = portrait.type === 'video' ? videoDir : imageDir;
    const filePath = path.join(dir, portrait.fileName);
    if (fileService.fileExists(filePath)) {
      fileService.deleteFile(filePath);
    }
    
    await portraitLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
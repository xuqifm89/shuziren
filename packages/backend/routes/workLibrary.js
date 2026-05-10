const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const workLibraryRepository = require('../repositories/WorkLibraryRepository');
const fileService = require('../services/fileService');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

const worksDir = path.join(__dirname, '../assets/works');
fileService.ensureDir(worksDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, worksDir);
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
    const { status, category, tag, published } = req.query;
    const isAdmin = req.userRole === 'admin' || req.userRole === 'superadmin';
    
    let works;
    if (isAdmin) {
      works = await workLibraryRepository.findAll();
    } else if (effectiveUserId && status) {
      works = await workLibraryRepository.findByUserIdAndStatus(effectiveUserId, status);
    } else if (effectiveUserId && category) {
      works = await workLibraryRepository.findByUserIdAndCategory(effectiveUserId, category);
    } else if (effectiveUserId && tag) {
      works = await workLibraryRepository.findByUserIdAndTag(effectiveUserId, tag);
    } else if (effectiveUserId) {
      works = await workLibraryRepository.findByUserIdWithPublic(effectiveUserId);
    } else if (published === 'true') {
      works = await workLibraryRepository.findPublished();
    } else {
      works = await workLibraryRepository.findPublic();
    }
    
    res.json(works);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const work = await workLibraryRepository.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }
    if (!work.isPublic && work.userId !== req.userId) {
      return res.status(404).json({ error: '作品不存在' });
    }
    await workLibraryRepository.incrementViewCount(req.params.id);
    res.json(work);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const works = await workLibraryRepository.searchByKeyword(req.params.keyword);
    const filtered = works.filter(w => w.isPublic || w.userId === req.userId);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tags/list', async (req, res) => {
  try {
    const userId = req.userId || req.query.userId;
    const tags = await workLibraryRepository.getAllTags(userId || '00000000-0000-0000-0000-000000000000');
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const userId = req.userId || req.query.userId;
    const categories = await workLibraryRepository.getAllCategories(userId || '00000000-0000-0000-0000-000000000000');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats/:userId', async (req, res) => {
  try {
    const stats = await workLibraryRepository.getStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, content, audioPath, videoPath, coverPath, status, duration, size, tags, category, isPublic, sourceType, voiceId, portraitId } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    
    const work = await workLibraryRepository.create({
      userId: req.userId,
      title,
      description,
      content,
      audioPath,
      videoPath,
      coverPath,
      status: status || 'draft',
      duration: duration ? parseFloat(duration) : null,
      size: size ? parseInt(size) : null,
      tags: tags || [],
      category: category || 'default',
      isPublic: isPublic || false,
      sourceType: sourceType || 'generated',
      voiceId,
      portraitId
    });
    
    res.status(201).json(work);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await workLibraryRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '作品不存在' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: '无权修改此作品' });
    }
    const { title, description, content, audioPath, videoPath, coverPath, status, duration, size, tags, category, isPublic, sourceType, voiceId, portraitId } = req.body;
    const work = await workLibraryRepository.update(req.params.id, {
      title,
      description,
      content,
      audioPath,
      videoPath,
      coverPath,
      status,
      duration,
      size,
      tags,
      category,
      isPublic,
      sourceType,
      voiceId,
      portraitId
    });
    
    if (work) {
      res.json(work);
    } else {
      res.status(404).json({ error: '作品不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/publish', authMiddleware, async (req, res) => {
  try {
    const existing = await workLibraryRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '作品不存在' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: '无权发布此作品' });
    }
    const work = await workLibraryRepository.publish(req.params.id);
    if (work) {
      res.json(work);
    } else {
      res.status(404).json({ error: '作品不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/like', async (req, res) => {
  try {
    const work = await workLibraryRepository.incrementLikeCount(req.params.id);
    if (work) {
      res.json({ likeCount: work.likeCount });
    } else {
      res.status(404).json({ error: '作品不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/share', async (req, res) => {
  try {
    const work = await workLibraryRepository.incrementShareCount(req.params.id);
    if (work) {
      res.json({ shareCount: work.shareCount });
    } else {
      res.status(404).json({ error: '作品不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const work = await workLibraryRepository.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }
    if (work.userId !== req.userId) {
      return res.status(403).json({ error: '无权删除此作品' });
    }
    
    await workLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload/:field?', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const fieldName = req.params.field || 'file';
    const validFields = ['video', 'audio', 'cover'];
    if (fieldName !== 'file' && !validFields.includes(fieldName)) {
      return res.status(400).json({ error: '无效的字段类型' });
    }

    const fileUrl = `/assets/works/${req.file.filename}`;
    res.json({
      fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      field: fieldName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
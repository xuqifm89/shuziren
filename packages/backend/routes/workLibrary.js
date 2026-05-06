const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const workLibraryRepository = require('../repositories/WorkLibraryRepository');
const fileService = require('../services/fileService');

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

router.get('/', async (req, res) => {
  try {
    const { userId, status, category, tag, isPublic, published } = req.query;
    
    let works;
    if (userId && status) {
      works = await workLibraryRepository.findByUserIdAndStatus(userId, status);
    } else if (userId && category) {
      works = await workLibraryRepository.findByUserIdAndCategory(userId, category);
    } else if (userId && tag) {
      works = await workLibraryRepository.findByUserIdAndTag(userId, tag);
    } else if (userId) {
      works = await workLibraryRepository.findByUserIdWithPublic(userId);
    } else if (status) {
      works = await workLibraryRepository.findByStatus(status);
    } else if (category) {
      works = await workLibraryRepository.findByCategory(category);
    } else if (tag) {
      works = await workLibraryRepository.findByTag(tag);
    } else if (published === 'true') {
      works = await workLibraryRepository.findPublished();
    } else if (isPublic === 'true') {
      works = await workLibraryRepository.findPublic();
    } else {
      works = await workLibraryRepository.findAll();
    }
    
    res.json(works);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const work = await workLibraryRepository.findById(req.params.id);
    if (work) {
      await workLibraryRepository.incrementViewCount(req.params.id);
      res.json(work);
    } else {
      res.status(404).json({ error: '作品不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const works = await workLibraryRepository.searchByKeyword(req.params.keyword);
    res.json(works);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tags/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const tags = await workLibraryRepository.getAllTags(userId || '00000000-0000-0000-0000-000000000000');
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const { userId } = req.query;
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

router.post('/', async (req, res) => {
  try {
    const { userId, title, description, content, audioPath, videoPath, coverPath, status, duration, size, tags, category, isPublic, sourceType, voiceId, portraitId } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: '标题不能为空' });
    }
    
    const work = await workLibraryRepository.create({
      userId: userId || '00000000-0000-0000-0000-000000000000',
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

router.put('/:id', async (req, res) => {
  try {
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

router.put('/:id/publish', async (req, res) => {
  try {
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

router.delete('/:id', async (req, res) => {
  try {
    const work = await workLibraryRepository.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
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
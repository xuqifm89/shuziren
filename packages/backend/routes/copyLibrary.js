const express = require('express');
const router = express.Router();
const copyLibraryRepository = require('../repositories/CopyLibraryRepository');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, async (req, res) => {
  try {
    const effectiveUserId = req.userId;
    const { category, tag } = req.query;
    
    let copies;
    if (effectiveUserId && category) {
      copies = await copyLibraryRepository.findByUserIdAndCategory(effectiveUserId, category);
    } else if (effectiveUserId && tag) {
      copies = await copyLibraryRepository.findByUserIdAndTag(effectiveUserId, tag);
    } else if (effectiveUserId) {
      copies = await copyLibraryRepository.findByUserIdWithPublic(effectiveUserId);
    } else {
      copies = await copyLibraryRepository.findPublic();
    }
    
    res.json(copies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const copy = await copyLibraryRepository.findById(req.params.id);
    if (!copy) {
      return res.status(404).json({ error: '文案不存在' });
    }
    if (!copy.isPublic && copy.userId !== req.userId) {
      return res.status(404).json({ error: '文案不存在' });
    }
    res.json(copy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const copies = await copyLibraryRepository.searchByKeyword(req.params.keyword);
    const filtered = copies.filter(c => c.isPublic || c.userId === req.userId);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tags/list', async (req, res) => {
  try {
    const userId = req.userId || req.query.userId;
    const tags = await copyLibraryRepository.getAllTags(userId || '00000000-0000-0000-0000-000000000000');
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const userId = req.userId || req.query.userId;
    const categories = await copyLibraryRepository.getAllCategories(userId || '00000000-0000-0000-0000-000000000000');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, content, tags, category, isPublic } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    
    const copy = await copyLibraryRepository.create({
      userId: req.userId,
      title,
      content,
      tags: tags || [],
      category: category || 'default',
      isPublic: isPublic || false
    });
    
    res.status(201).json(copy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await copyLibraryRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '文案不存在' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: '无权修改此文案' });
    }
    const { title, content, tags, category, isPublic } = req.body;
    const copy = await copyLibraryRepository.update(req.params.id, {
      title,
      content,
      tags,
      category,
      isPublic
    });
    
    if (copy) {
      res.json(copy);
    } else {
      res.status(404).json({ error: '文案不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/usage', async (req, res) => {
  try {
    const copy = await copyLibraryRepository.incrementUsageCount(req.params.id);
    if (copy) {
      res.json({ usageCount: copy.usageCount });
    } else {
      res.status(404).json({ error: '文案不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const copy = await copyLibraryRepository.findById(req.params.id);
    if (!copy) {
      return res.status(404).json({ error: '文案不存在' });
    }
    if (copy.userId !== req.userId) {
      return res.status(403).json({ error: '无权删除此文案' });
    }
    
    await copyLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
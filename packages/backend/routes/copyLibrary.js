const express = require('express');
const router = express.Router();
const copyLibraryRepository = require('../repositories/CopyLibraryRepository');

router.get('/', async (req, res) => {
  try {
    const { userId, category, tag, isPublic } = req.query;
    
    let copies;
    if (userId && category) {
      copies = await copyLibraryRepository.findByUserIdAndCategory(userId, category);
    } else if (userId && tag) {
      copies = await copyLibraryRepository.findByUserIdAndTag(userId, tag);
    } else if (userId) {
      copies = await copyLibraryRepository.findByUserIdWithPublic(userId);
    } else if (category) {
      copies = await copyLibraryRepository.findByCategory(category);
    } else if (tag) {
      copies = await copyLibraryRepository.findByTag(tag);
    } else if (isPublic === 'true') {
      copies = await copyLibraryRepository.findPublic();
    } else {
      copies = await copyLibraryRepository.findAll();
    }
    
    res.json(copies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const copy = await copyLibraryRepository.findById(req.params.id);
    if (copy) {
      res.json(copy);
    } else {
      res.status(404).json({ error: '文案不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const copies = await copyLibraryRepository.searchByKeyword(req.params.keyword);
    res.json(copies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tags/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const tags = await copyLibraryRepository.getAllTags(userId || '00000000-0000-0000-0000-000000000000');
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const categories = await copyLibraryRepository.getAllCategories(userId || '00000000-0000-0000-0000-000000000000');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, title, content, tags, category, isPublic } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    
    const copy = await copyLibraryRepository.create({
      userId: userId || '00000000-0000-0000-0000-000000000000',
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

router.put('/:id', async (req, res) => {
  try {
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

router.delete('/:id', async (req, res) => {
  try {
    const copy = await copyLibraryRepository.findById(req.params.id);
    if (!copy) {
      return res.status(404).json({ error: '文案不存在' });
    }
    
    await copyLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
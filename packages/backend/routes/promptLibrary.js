const express = require('express');
const router = express.Router();
const promptLibraryRepository = require('../repositories/PromptLibraryRepository');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, async (req, res) => {
  try {
    const effectiveUserId = req.userId;
    const { category, tag, modelType } = req.query;
    
    let prompts;
    if (effectiveUserId && category) {
      prompts = await promptLibraryRepository.findByUserIdAndCategory(effectiveUserId, category);
    } else if (effectiveUserId && modelType) {
      prompts = await promptLibraryRepository.findByUserIdAndModelType(effectiveUserId, modelType);
    } else if (effectiveUserId && tag) {
      prompts = await promptLibraryRepository.findByUserIdAndTag(effectiveUserId, tag);
    } else if (effectiveUserId) {
      prompts = await promptLibraryRepository.findByUserIdWithPublic(effectiveUserId);
    } else {
      prompts = await promptLibraryRepository.findPublic();
    }
    
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prompt = await promptLibraryRepository.findById(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: '提示词不存在' });
    }
    if (!prompt.isPublic && prompt.userId !== req.userId) {
      return res.status(404).json({ error: '提示词不存在' });
    }
    res.json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const prompts = await promptLibraryRepository.searchByKeyword(req.params.keyword);
    const filtered = prompts.filter(p => p.isPublic || p.userId === req.userId);
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tags/list', async (req, res) => {
  try {
    const userId = req.userId || req.query.userId;
    const tags = await promptLibraryRepository.getAllTags(userId || '00000000-0000-0000-0000-000000000000');
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const userId = req.userId || req.query.userId;
    const categories = await promptLibraryRepository.getAllCategories(userId || '00000000-0000-0000-0000-000000000000');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/model-types/list', async (req, res) => {
  try {
    const userId = req.userId || req.query.userId;
    const types = await promptLibraryRepository.getAllModelTypes(userId || '00000000-0000-0000-0000-000000000000');
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, tags, category, modelType, isPublic } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: '提示词内容不能为空' });
    }
    
    const prompt = await promptLibraryRepository.create({
      userId: req.userId,
      content,
      tags: tags || [],
      category: category || 'default',
      modelType: modelType || 'general',
      isPublic: isPublic || false
    });
    
    res.status(201).json(prompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existing = await promptLibraryRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '提示词不存在' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ error: '无权修改此提示词' });
    }
    const { content, tags, category, modelType, isPublic } = req.body;
    const prompt = await promptLibraryRepository.update(req.params.id, {
      content,
      tags,
      category,
      modelType,
      isPublic
    });
    
    if (prompt) {
      res.json(prompt);
    } else {
      res.status(404).json({ error: '提示词不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/usage', async (req, res) => {
  try {
    const prompt = await promptLibraryRepository.incrementUsageCount(req.params.id);
    if (prompt) {
      res.json({ usageCount: prompt.usageCount });
    } else {
      res.status(404).json({ error: '提示词不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const prompt = await promptLibraryRepository.findById(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: '提示词不存在' });
    }
    if (prompt.userId !== req.userId) {
      return res.status(403).json({ error: '无权删除此提示词' });
    }
    
    await promptLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const promptLibraryRepository = require('../repositories/PromptLibraryRepository');

router.get('/', async (req, res) => {
  try {
    const { userId, category, tag, modelType, isPublic } = req.query;
    
    let prompts;
    if (userId && category) {
      prompts = await promptLibraryRepository.findByUserIdAndCategory(userId, category);
    } else if (userId && modelType) {
      prompts = await promptLibraryRepository.findByUserIdAndModelType(userId, modelType);
    } else if (userId && tag) {
      prompts = await promptLibraryRepository.findByUserIdAndTag(userId, tag);
    } else if (userId) {
      prompts = await promptLibraryRepository.findByUserIdWithPublic(userId);
    } else if (category) {
      prompts = await promptLibraryRepository.findByCategory(category);
    } else if (modelType) {
      prompts = await promptLibraryRepository.findByModelType(modelType);
    } else if (tag) {
      prompts = await promptLibraryRepository.findByTag(tag);
    } else if (isPublic === 'true') {
      prompts = await promptLibraryRepository.findPublic();
    } else {
      prompts = await promptLibraryRepository.findAll();
    }
    
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prompt = await promptLibraryRepository.findById(req.params.id);
    if (prompt) {
      res.json(prompt);
    } else {
      res.status(404).json({ error: '提示词不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search/:keyword', async (req, res) => {
  try {
    const prompts = await promptLibraryRepository.searchByKeyword(req.params.keyword);
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tags/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const tags = await promptLibraryRepository.getAllTags(userId || '00000000-0000-0000-0000-000000000000');
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const categories = await promptLibraryRepository.getAllCategories(userId || '00000000-0000-0000-0000-000000000000');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/model-types/list', async (req, res) => {
  try {
    const { userId } = req.query;
    const types = await promptLibraryRepository.getAllModelTypes(userId || '00000000-0000-0000-0000-000000000000');
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, content, tags, category, modelType, isPublic } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: '提示词内容不能为空' });
    }
    
    const prompt = await promptLibraryRepository.create({
      userId: userId || '00000000-0000-0000-0000-000000000000',
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

router.put('/:id', async (req, res) => {
  try {
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

router.delete('/:id', async (req, res) => {
  try {
    const prompt = await promptLibraryRepository.findById(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: '提示词不存在' });
    }
    
    await promptLibraryRepository.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
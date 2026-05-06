const express = require('express');
const router = express.Router();
const taskService = require('../services/taskService');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, pageSize = 20 } = req.query;
    let tasks;
    if (status) {
      tasks = await taskService.getTasksByStatus(status);
    } else if (type) {
      tasks = await taskService.getTasksByType(type);
    } else {
      const Task = require('../models/Task');
      tasks = await Task.findAll({
        order: [['createdAt', 'DESC']],
        limit: parseInt(pageSize),
        offset: (parseInt(page) - 1) * parseInt(pageSize)
      });
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await taskService.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const task = await taskService.cancelTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json({ message: '任务已取消', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

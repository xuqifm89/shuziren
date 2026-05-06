const express = require('express');
const router = express.Router();
const wsManager = require('../websocket/WebSocketManager');
const taskService = require('../services/taskService');

router.get('/status', (req, res) => {
  res.json({
    online: wsManager.getOnlineCount(),
    timestamp: new Date().toISOString()
  });
});

router.post('/subscribe', (req, res) => {
  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: '缺少taskId参数' });
  }
  res.json({ message: '请通过WebSocket连接订阅任务更新', taskId });
});

router.get('/:taskId', async (req, res) => {
  try {
    const task = await taskService.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

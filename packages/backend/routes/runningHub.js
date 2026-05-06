const express = require('express');
const router = express.Router();
const axios = require('axios');
const apiConfig = require('../config/apiConfig');
const RunningHubAI = require('../services/runningHubAI');

let runningHubAI = null;

if (apiConfig.runningHub.apiKey) {
  runningHubAI = new RunningHubAI(apiConfig.runningHub.apiKey);
}

router.get('/ai-app/info', async (req, res) => {
  try {
    const { webappId } = req.query;
    
    if (!webappId) {
      return res.status(400).json({ error: '缺少 webappId 参数' });
    }

    if (!runningHubAI) {
      return res.status(500).json({ error: 'RunningHub API 未配置' });
    }

    const result = await runningHubAI.getAIAppInfo(webappId);
    
    if (result.success) {
      res.json({
        webappName: result.webappName,
        nodeInfoList: result.nodeInfoList,
        accessEncrypted: result.accessEncrypted
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai-app/run', async (req, res) => {
  try {
    const { webappId, nodeInfoList, instanceType } = req.body;
    
    if (!webappId || !nodeInfoList) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (!runningHubAI) {
      return res.status(500).json({ error: 'RunningHub API 未配置' });
    }

    const result = await runningHubAI.runAIApp(webappId, nodeInfoList, { instanceType });
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/ai-app/status', async (req, res) => {
  try {
    const { taskId } = req.query;
    
    if (!taskId) {
      return res.status(400).json({ error: '缺少 taskId 参数' });
    }

    if (!runningHubAI) {
      return res.status(500).json({ error: 'RunningHub API 未配置' });
    }

    const result = await runningHubAI.getTaskStatus(taskId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai-app/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: '缺少文件' });
    }

    if (!runningHubAI) {
      return res.status(500).json({ error: 'RunningHub API 未配置' });
    }

    const file = req.files.file;
    const result = await runningHubAI.uploadBuffer(file.data, file.name);
    
    if (result.success) {
      res.json({
        fileName: result.fileName,
        fileType: result.fileType
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

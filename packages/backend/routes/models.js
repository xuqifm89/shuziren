const express = require('express');
const router = express.Router();
const { getModelStatus, switchModelMode } = require('../services/modelService');

router.get('/status', async (req, res) => {
  try {
    const status = await getModelStatus();
    res.json({ ...status, mode: 'cloud' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/gpu-info', (req, res) => {
  res.json({ gpu: { type: 'cloud', name: 'Cloud API', memory: 0 }, recommendations: {} });
});

router.post('/switch-mode', async (req, res) => {
  try {
    const { mode } = req.body;
    const result = await switchModelMode(mode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

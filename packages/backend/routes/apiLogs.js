const express = require('express');
const router = express.Router();
const apiLogService = require('../services/apiLogService');

// ========== 获取日志列表 ==========
router.get('/', async (req, res) => {
  try {
    const result = await apiLogService.getApiLogs(req.query);
    
    res.json({
      success: true,
      data: result,
      message: '获取API日志列表成功'
    });
  } catch (error) {
    console.error('❌ 获取API日志列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取API日志列表失败'
    });
  }
});

// ========== 获取单个日志详情 ==========
router.get('/:id', async (req, res) => {
  try {
    const log = await apiLogService.getApiLogById(req.params.id);
    
    res.json({
      success: true,
      data: log,
      message: '获取日志详情成功'
    });
  } catch (error) {
    console.error('❌ 获取日志详情失败:', error);
    res.status(error.message === '日志记录不存在' ? 404 : 500).json({
      success: false,
      error: error.message,
      message: '获取日志详情失败'
    });
  }
});

// ========== 获取统计数据 ==========
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await apiLogService.getApiStatistics(req.query);
    
    res.json({
      success: true,
      data: stats,
      message: '获取统计数据成功'
    });
  } catch (error) {
    console.error('❌ 获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取统计数据失败'
    });
  }
});

// ========== 删除日志（支持批量） ==========
router.delete('/', async (req, res) => {
  try {
    const { logIds } = req.body;
    
    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的日志ID数组',
        message: '参数错误'
      });
    }

    const deletedCount = await apiLogService.deleteApiLogs(logIds);

    res.json({
      success: true,
      data: { deletedCount },
      message: `成功删除 ${deletedCount} 条日志记录`
    });
  } catch (error) {
    console.error('❌ 删除日志失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '删除日志失败'
    });
  }
});

// ========== 清理过期日志 ==========
router.post('/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;
    
    const deletedCount = await apiLogService.cleanOldLogs(parseInt(daysToKeep));

    res.json({
      success: true,
      data: { 
        deletedCount,
        daysKept: parseInt(daysToKeep)
      },
      message: `成功清理 ${deletedCount} 条过期日志`
    });
  } catch (error) {
    console.error('❌ 清理过期日志失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '清理过期日志失败'
    });
  }
});

module.exports = router;

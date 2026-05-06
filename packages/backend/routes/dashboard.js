const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

router.get('/overview', async (req, res) => {
  try {
    const results = {};

    const countQuery = async (tableName) => {
      try {
        const r = await sequelize.query(
          `SELECT COUNT(*) as count FROM ${tableName}`,
          { type: sequelize.QueryTypes.SELECT }
        );
        return r[0]?.count || 0;
      } catch (e) {
        return 0;
      }
    };

    results.userCount = await countQuery('users');

    const tables = [
      { key: 'voiceLibraryCount', table: 'voice_library' },
      { key: 'dubbingLibraryCount', table: 'dubbing_library' },
      { key: 'musicLibraryCount', table: 'music_library' },
      { key: 'portraitLibraryCount', table: 'portrait_library' },
      { key: 'copyLibraryCount', table: 'copy_library' },
      { key: 'promptLibraryCount', table: 'prompt_library' },
      { key: 'workLibraryCount', table: 'work_library' }
    ];

    for (const t of tables) {
      results[t.key] = await countQuery(t.table);
    }

    try {
      const apiStats = await sequelize.query(
        'SELECT COUNT(*) as total, SUM(CASE WHEN isSuccess = 1 THEN 1 ELSE 0 END) as successCount FROM api_logs',
        { type: sequelize.QueryTypes.SELECT }
      );
      results.apiCallTotal = apiStats[0]?.total || 0;
      results.apiCallSuccess = apiStats[0]?.successCount || 0;
    } catch (e) {
      results.apiCallTotal = 0;
      results.apiCallSuccess = 0;
    }

    try {
      const recentUsers = await sequelize.query(
        "SELECT id, username, email, role, status, createdAt FROM users ORDER BY createdAt DESC LIMIT 5",
        { type: sequelize.QueryTypes.SELECT }
      );
      results.recentUsers = recentUsers;
    } catch (e) {
      results.recentUsers = [];
    }

    try {
      const recentWorks = await sequelize.query(
        "SELECT id, title, status, createdAt FROM work_library ORDER BY createdAt DESC LIMIT 5",
        { type: sequelize.QueryTypes.SELECT }
      );
      results.recentWorks = recentWorks;
    } catch (e) {
      results.recentWorks = [];
    }

    results.totalAssets =
      (results.voiceLibraryCount || 0) +
      (results.dubbingLibraryCount || 0) +
      (results.musicLibraryCount || 0) +
      (results.portraitLibraryCount || 0) +
      (results.copyLibraryCount || 0) +
      (results.promptLibraryCount || 0) +
      (results.workLibraryCount || 0);

    const uptime = process.uptime();
    results.system = {
      uptime: Math.floor(uptime),
      uptimeFormatted: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      memoryTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      nodeVersion: process.version,
      platform: process.platform
    };

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

router.get('/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const trends = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = { date: dateStr };

      try {
        const userCount = await sequelize.query(
          "SELECT COUNT(*) as count FROM users WHERE date(createdAt) = ?",
          { replacements: [dateStr], type: sequelize.QueryTypes.SELECT }
        );
        dayData.newUsers = userCount[0]?.count || 0;
      } catch (e) {
        dayData.newUsers = 0;
      }

      try {
        const workCount = await sequelize.query(
          "SELECT COUNT(*) as count FROM work_library WHERE date(createdAt) = ?",
          { replacements: [dateStr], type: sequelize.QueryTypes.SELECT }
        );
        dayData.newWorks = workCount[0]?.count || 0;
      } catch (e) {
        dayData.newWorks = 0;
      }

      try {
        const apiCount = await sequelize.query(
          "SELECT COUNT(*) as count FROM api_logs WHERE date(startTime) = ?",
          { replacements: [dateStr], type: sequelize.QueryTypes.SELECT }
        );
        dayData.apiCalls = apiCount[0]?.count || 0;
      } catch (e) {
        dayData.apiCalls = 0;
      }

      trends.push(dayData);
    }

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Dashboard trends error:', error);
    res.status(500).json({
      success: false,
      error: '获取趋势数据失败'
    });
  }
});

module.exports = router;

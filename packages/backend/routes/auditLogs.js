const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const AuditLog = require('../models/AuditLog');

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      action,
      resource,
      userId,
      startDate,
      endDate,
      success
    } = req.query;

    const where = {};
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userId) where.userId = userId;
    if (success !== undefined) where.success = success === 'true';
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const offset = (parseInt(page) - 1) * parseInt(size);
    const limit = parseInt(size);

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      success: true,
      data: {
        items: rows,
        total: count,
        page: parseInt(page),
        size: parseInt(size),
        totalPages: Math.ceil(count / parseInt(size))
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: '获取审计日志失败' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const totalActions = await AuditLog.count({ where });
    const failedActions = await AuditLog.count({ where: { ...where, success: false } });

    const actionBreakdown = await AuditLog.findAll({
      where,
      attributes: ['action', [AuditLog.sequelize.fn('COUNT', '*'), 'count']],
      group: ['action'],
      order: [[AuditLog.sequelize.literal('count'), 'DESC']],
      raw: true
    });

    const resourceBreakdown = await AuditLog.findAll({
      where,
      attributes: ['resource', [AuditLog.sequelize.fn('COUNT', '*'), 'count']],
      group: ['resource'],
      order: [[AuditLog.sequelize.literal('count'), 'DESC']],
      raw: true
    });

    const topUsers = await AuditLog.findAll({
      where,
      attributes: ['userId', 'username', [AuditLog.sequelize.fn('COUNT', '*'), 'count']],
      group: ['userId', 'username'],
      order: [[AuditLog.sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    });

    res.json({
      success: true,
      data: {
        totalActions,
        failedActions,
        successRate: totalActions > 0 ? ((totalActions - failedActions) / totalActions * 100).toFixed(1) : '100.0',
        actionBreakdown,
        resourceBreakdown,
        topUsers
      }
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ success: false, error: '获取审计统计失败' });
  }
});

router.delete('/cleanup', async (req, res) => {
  try {
    const { days = 90 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const deleted = await AuditLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate }
      }
    });

    res.json({
      success: true,
      data: { deletedCount: deleted, cutoffDate: cutoffDate.toISOString() }
    });
  } catch (error) {
    console.error('Audit cleanup error:', error);
    res.status(500).json({ success: false, error: '清理审计日志失败' });
  }
});

module.exports = router;

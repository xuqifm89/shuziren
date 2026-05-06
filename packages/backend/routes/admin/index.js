const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.use('/users', require('../users'));
router.use('/cloud-config', require('../cloudConfig'));
router.use('/api-logs', require('../apiLogs'));

module.exports = router;

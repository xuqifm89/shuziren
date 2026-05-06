const AuditLog = require('../models/AuditLog');

const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  PERMISSION_DENIED: 'permission_denied',
  CONFIG_CHANGE: 'config_change',
  ROLE_CHANGE: 'role_change',
  STATUS_CHANGE: 'status_change'
};

async function auditLog({ userId, username, action, resource, resourceId, details, ip, userAgent, statusCode, success }) {
  try {
    await AuditLog.create({
      userId: userId || null,
      username: username || null,
      action,
      resource,
      resourceId: resourceId ? String(resourceId) : null,
      details: details || null,
      ip: ip || null,
      userAgent: userAgent ? String(userAgent).substring(0, 500) : null,
      statusCode: statusCode || null,
      success: success !== false
    });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
}

function auditMiddleware(resource, action) {
  return (req, res, next) => {
    const originalEnd = res.end;
    res.end = function (...args) {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      auditLog({
        userId: req.userId,
        username: req.username,
        action: action || AUDIT_ACTIONS.UPDATE,
        resource,
        resourceId: req.params?.id,
        details: {
          method: req.method,
          path: req.originalUrl,
          body: sanitizeBody(req.body)
        },
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
        statusCode: res.statusCode,
        success
      });
      originalEnd.apply(res, args);
    };
    next();
  };
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'confirmPassword', 'currentPassword', 'newPassword', 'secretKey', 'accessKey', 'token'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) sanitized[field] = '***';
  }
  return sanitized;
}

module.exports = {
  auditLog,
  auditMiddleware,
  AUDIT_ACTIONS
};

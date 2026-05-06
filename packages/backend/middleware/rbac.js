const responseHelper = require('../utils/responseHelper');

const ROLE_HIERARCHY = {
  superadmin: 3,
  admin: 2,
  user: 1
};

const PERMISSIONS = {
  'user:create': ['superadmin', 'admin'],
  'user:read': ['superadmin', 'admin'],
  'user:update': ['superadmin', 'admin'],
  'user:delete': ['superadmin'],
  'user:manage_roles': ['superadmin'],
  'content:read': ['superadmin', 'admin', 'user'],
  'content:create': ['superadmin', 'admin', 'user'],
  'content:update': ['superadmin', 'admin'],
  'content:delete': ['superadmin', 'admin'],
  'system:config': ['superadmin', 'admin'],
  'system:logs': ['superadmin', 'admin'],
  'system:stats': ['superadmin', 'admin'],
  'task:create': ['superadmin', 'admin', 'user'],
  'task:read': ['superadmin', 'admin', 'user'],
  'task:cancel': ['superadmin', 'admin', 'user'],
  'task:manage': ['superadmin', 'admin'],
  'library:read': ['superadmin', 'admin', 'user'],
  'library:create': ['superadmin', 'admin', 'user'],
  'library:manage': ['superadmin', 'admin'],
  'publish:read': ['superadmin', 'admin', 'user'],
  'publish:create': ['superadmin', 'admin', 'user'],
  'publish:manage': ['superadmin', 'admin']
};

function hasPermission(role, permission) {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

function hasRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    const userRole = req.userRole || 'user';

    if (!hasRole(userRole, requiredRole)) {
      return res.status(403).json(
        responseHelper.forbidden(`需要${requiredRole}角色权限`)
      );
    }

    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.userRole || 'user';

    if (!hasPermission(userRole, permission)) {
      return res.status(403).json(
        responseHelper.permissionDenied(permission)
      );
    }

    next();
  };
}

function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    const userRole = req.userRole || 'user';

    const hasAny = permissions.some(p => hasPermission(userRole, p));
    if (!hasAny) {
      return res.status(403).json(
        responseHelper.forbidden('缺少必要权限')
      );
    }

    next();
  };
}

function getRolePermissions(role) {
  const perms = [];
  for (const [permission, roles] of Object.entries(PERMISSIONS)) {
    if (roles.includes(role)) {
      perms.push(permission);
    }
  }
  return perms;
}

module.exports = {
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  hasRole,
  requireRole,
  requirePermission,
  requireAnyPermission,
  getRolePermissions
};

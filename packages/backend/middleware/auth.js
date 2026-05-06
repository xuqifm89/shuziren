const jwt = require('jsonwebtoken');
const responseHelper = require('../utils/responseHelper');

const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET must be set in production'); })()
    : 'shuziren_jwt_dev_secret_key_2024'
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(
      responseHelper.unauthorized('未提供认证Token')
    );
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(
      responseHelper.unauthorized('Token格式错误')
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.userId = decoded.userId || decoded.id;
    req.userRole = decoded.role || 'user';
    req.username = decoded.username;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(
        responseHelper.tokenExpired()
      );
    }
    return res.status(401).json(
      responseHelper.authenticationFailed('Token无效或已过期')
    );
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId || decoded.id;
      req.userRole = decoded.role || 'user';
      req.username = decoded.username;
    } catch (err) {
      // Token无效，但不阻止请求
    }
  }

  next();
}

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role || 'user'
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  authMiddleware,
  optionalAuth,
  generateToken,
  verifyToken,
  JWT_SECRET
};

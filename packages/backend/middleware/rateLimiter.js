const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    code: 42900,
    message: '请求过于频繁，请稍后再试',
    error: 'TOO_MANY_REQUESTS',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/ws';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    code: 42901,
    message: '登录尝试过多，请15分钟后再试',
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: {
    code: 42902,
    message: 'API调用过于频繁，请稍后再试',
    error: 'API_RATE_LIMITED',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: {
    code: 42903,
    message: '上传请求过于频繁，请稍后再试',
    error: 'UPLOAD_RATE_LIMITED',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  globalLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter
};

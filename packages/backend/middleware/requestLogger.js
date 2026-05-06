const requestCounts = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

function requestLogger(req, res, next) {
  const start = Date.now();

  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const key = `${clientIp}`;

  const current = requestCounts.get(key) || { count: 0, windowStart: Date.now() };

  if (Date.now() - current.windowStart > WINDOW_MS) {
    current.count = 0;
    current.windowStart = Date.now();
  }

  current.count++;
  requestCounts.set(key, current);

  if (current.count > MAX_REQUESTS) {
    return res.status(429).json({
      code: 42900,
      message: '请求过于频繁，请稍后再试',
      error: 'RATE_LIMITED'
    });
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    const logMsg = `[${level}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (level === 'ERROR') {
      console.error(logMsg);
    } else if (level === 'WARN') {
      console.warn(logMsg);
    } else if (req.method !== 'OPTIONS') {
      console.log(logMsg);
    }
  });

  next();
}

module.exports = requestLogger;

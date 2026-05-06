const responseHelper = require('../utils/responseHelper');

function errorHandler(err, req, res, next) {
  console.error('[Error]', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    userId: req.userId
  });

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json(
      responseHelper.validationError(err.errors.map(e => e.message).join(', '))
    );
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json(
      responseHelper.error(40900, '数据重复', 'CONFLICT')
    );
  }

  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json(
      responseHelper.internalError('数据库操作失败')
    );
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      responseHelper.unauthorized('认证失败')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      responseHelper.tokenExpired()
    );
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(
      responseHelper.badRequest('请求体格式错误')
    );
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json(
      responseHelper.error(41300, '请求体过大', 'PAYLOAD_TOO_LARGE')
    );
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json(
      responseHelper.error(41301, '文件大小超出限制', 'FILE_TOO_LARGE')
    );
  }

  if (err.code === 'ENOENT') {
    return res.status(404).json(
      responseHelper.notFound('文件不存在')
    );
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(502).json(
      responseHelper.error(50200, '外部服务连接失败', 'BAD_GATEWAY')
    );
  }

  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json(
      responseHelper.error(50400, '请求超时', 'GATEWAY_TIMEOUT')
    );
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message || '服务器内部错误';

  res.status(statusCode).json(
    responseHelper.error(statusCode * 100, message, 'INTERNAL_ERROR')
  );
}

module.exports = errorHandler;

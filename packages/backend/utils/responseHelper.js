class ResponseHelper {
  success(data = null, message = 'success', statusCode = 200, meta = {}) {
    return {
      code: statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...meta
    };
  }

  paginated(list, pagination) {
    return this.success({
      list,
      pagination: {
        page: pagination.page || 1,
        size: pagination.size || 20,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.size || 20))
      }
    });
  }

  created(data, message = '创建成功') {
    return this.success(data, message, 201);
  }

  noContent(message = '删除成功') {
    return { code: 204, message, timestamp: new Date().toISOString() };
  }

  error(code, message, error = null, statusCode = null, details = null) {
    const response = {
      code,
      message,
      error: error || this.getErrorCodeName(code),
      timestamp: new Date().toISOString()
    };

    if (details) response.details = details;
    
    if (!statusCode) {
      statusCode = this.getStatusCodeFromCode(code);
    }

    response.statusCode = statusCode;
    
    return response;
  }

  badRequest(message = '请求参数错误', details = null) {
    return this.error(40000, message, 'BAD_REQUEST', 400, details);
  }

  unauthorized(message = '未认证', details = null) {
    return this.error(40100, message, 'UNAUTHORIZED', 401, details);
  }

  forbidden(message = '无权限访问', details = null) {
    return this.error(40300, message, 'FORBIDDEN', 403, details);
  }

  notFound(resource = '资源') {
    return this.error(40400, `${resource}不存在`, 'NOT_FOUND', 404);
  }

  conflict(message = '资源冲突', details = null) {
    return this.error(40900, message, 'CONFLICT', 409, details);
  }

  tooManyRequests(retryAfter = 60) {
    return this.error(42900, `请求过于频繁，请在${retryAfter}秒后重试`, 'RATE_LIMITED', 429, { retryAfter });
  }

  internalError(message = '服务器内部错误', error = null) {
    console.error('[ResponseHelper] Internal Error:', message, error);
    return this.error(50000, message, 'INTERNAL_ERROR', 500);
  }

  serviceUnavailable(message = '服务暂不可用') {
    return this.error(50300, message, 'SERVICE_UNAVAILABLE', 503);
  }

  validationError(errors) {
    return this.error(40001, '数据验证失败', 'VALIDATION_ERROR', 400, errors);
  }

  fileUploadError(message = '文件上传失败', details = null) {
    return this.error(40002, message, 'FILE_UPLOAD_ERROR', 400, details);
  }

  fileNotFoundError(fileKey) {
    return this.error(40003, `文件不存在: ${fileKey}`, 'FILE_NOT_FOUND', 404);
  }

  authenticationFailed(message = '认证失败') {
    return this.error(40101, message, 'AUTH_FAILED', 401);
  }

  tokenExpired() {
    return this.error(40102, 'Token已过期，请重新登录', 'TOKEN_EXPIRED', 401);
  }

  insufficientRole(requiredRoles) {
    return this.error(40301, `需要角色: ${requiredRoles.join(', ')}`, 'INSUFFICIENT_ROLE', 403);
  }

  permissionDenied(permission) {
    return this.error(40302, `缺少权限: ${permission}`, 'PERMISSION_DENIED', 403);
  }

  getErrorCodeName(code) {
    const errorMap = {
      200: 'SUCCESS',
      201: 'CREATED',
      204: 'NO_CONTENT',
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE'
    };

    if (code >= 200 && code < 300) return errorMap[code] || 'SUCCESS';
    if (code >= 400 && code < 500) return 'CLIENT_ERROR';
    if (code >= 500) return 'SERVER_ERROR';

    return 'UNKNOWN_ERROR';
  }

  getStatusCodeFromCode(code) {
    if (code >= 40000 && code < 50000) return Math.floor(code / 100);
    if (code >= 50000 && code < 60000) return Math.floor(code / 100);
    return code;
  }

  sendSuccess(res, data, message, meta) {
    res.json(this.success(data, message, 200, meta));
  }

  sendPaginated(res, list, pagination) {
    res.json(this.paginated(list, pagination));
  }

  sendCreated(res, data, message) {
    res.status(201).json(this.created(data, message));
  }

  sendNoContent(res, message) {
    res.status(204).json(this.noContent(message));
  }

  sendError(res, errorCode, message, httpStatus, details) {
    const status = httpStatus || this.getStatusCodeFromCode(errorCode);
    res.status(status).json(this.error(errorCode, message, null, status, details));
  }

  sendBadRequest(res, message, details) {
    res.status(400).json(this.badRequest(message, details));
  }

  sendUnauthorized(res, message) {
    res.status(401).json(this.unauthorized(message));
  }

  sendForbidden(res, message) {
    res.status(403).json(this.forbidden(message));
  }

  sendNotFound(res, resource) {
    res.status(404).json(this.notFound(resource));
  }

  sendInternalError(res, error) {
    res.status(500).json(this.internalError(null, error?.message || error));
  }
}

module.exports = new ResponseHelper();

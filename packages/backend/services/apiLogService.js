const ApiLog = require('../models/ApiLog');
const { Op, literal } = require('sequelize');
const sequelize = require('../config/database');

/**
 * 创建 API 调用日志（请求开始时调用）
 * @param {Object} logData - 日志数据
 * @returns {Promise<ApiLog>} 创建的日志记录
 */
async function createApiLog(logData) {
  try {
    const apiLog = await ApiLog.create({
      userId: logData.userId || '00000000-0000-0000-0000-000000000000',
      taskId: logData.taskId || null,
      platform: logData.platform,
      functionType: logData.functionType,
      functionName: logData.functionName || getFunctionName(logData.functionType),
      apiEndpoint: logData.apiEndpoint || null,
      requestParams: logData.requestParams ? JSON.stringify(logData.requestParams) : null,
      inputSize: logData.inputSize || null,
      startTime: new Date(),
      clientIp: logData.clientIp || null,
      userAgent: logData.userAgent || null
    });

    console.log(`📝 [API日志] 创建日志记录: ${apiLog.id} | 用户: ${apiLog.userId} | 功能: ${apiLog.functionName}`);
    return apiLog;
  } catch (error) {
    console.error('❌ [API日志] 创建日志失败:', error.message);
    return null;
  }
}

/**
 * 更新 API 调用日志（响应完成后调用）
 * @param {string} logId - 日志ID
 * @param {Object} responseData - 响应数据
 */
async function updateApiLog(logId, responseData) {
  try {
    const apiLog = await ApiLog.findByPk(logId);
    if (!apiLog) {
      console.warn(`⚠️ [API日志] 未找到日志记录: ${logId}`);
      return;
    }

    const updateData = {
      isSuccess: responseData.isSuccess || false,
      endTime: new Date(),
      durationMs: responseData.startTime ? Date.now() - responseData.startTime.getTime() : null
    };

    // 错误信息
    if (!responseData.isSuccess) {
      updateData.errorCode = responseData.errorCode || null;
      updateData.errorMessage = responseData.errorMessage || null;
      updateData.httpStatus = responseData.httpStatus || null;
    }

    // RunningHub 特有字段
    if (responseData.rhTaskId) {
      updateData.rhTaskId = responseData.rhTaskId;
    }
    if (responseData.consumeCoins !== undefined) {
      updateData.consumeCoins = responseData.consumeCoins;
    }
    if (responseData.taskCostTimeMs !== undefined) {
      updateData.taskCostTimeMs = responseData.taskCostTimeMs;
      updateData.taskCostTimeFormatted = formatDuration(responseData.taskCostTimeMs);
    }
    if (responseData.netWssUrl) {
      updateData.netWssUrl = responseData.netWssUrl;
    }

    // SiliconFlow 特有字段
    if (responseData.inputTokens !== undefined) {
      updateData.inputTokens = responseData.inputTokens;
    }
    if (responseData.outputTokens !== undefined) {
      updateData.outputTokens = responseData.outputTokens;
    }
    if (responseData.totalTokens !== undefined) {
      updateData.totalTokens = responseData.totalTokens;
    }
    if (responseData.modelName) {
      updateData.modelName = responseData.modelName;
    }

    // 响应数据
    if (responseData.responseData) {
      updateData.responseData = JSON.stringify(responseData.responseData);
    }
    
    // 输出文件信息
    if (responseData.outputFilePath) {
      updateData.outputFilePath = responseData.outputFilePath;
    }
    if (responseData.outputFileSize) {
      updateData.outputFileSize = responseData.outputFileSize;
    }

    await apiLog.update(updateData);

    const status = updateData.isSuccess ? '✅ 成功' : '❌ 失败';
    console.log(`📊 [API日志] 更新日志: ${logId} | 状态: ${status} | 耗时: ${updateData.durationMs || '?'}ms`);
  } catch (error) {
    console.error('❌ [API日志] 更新日志失败:', error.message);
  }
}

/**
 * 查询 API 日志列表
 * @param {Object} query - 查询条件
 * @returns {Promise<Object>} 日志列表和总数
 */
async function getApiLogs(query = {}) {
  const {
    page = 1,
    pageSize = 20,
    userId,
    platform,
    functionType,
    isSuccess,
    startDate,
    endDate,
    taskId,
    sortBy = 'startTime',
    sortOrder = 'DESC'
  } = query;

  const where = {};
  
  // 构建查询条件
  if (userId) where.userId = userId;
  if (platform) where.platform = platform;
  if (functionType) where.functionType = functionType;
  if (isSuccess !== undefined && isSuccess !== '' && isSuccess !== null) {
    where.isSuccess = isSuccess === 'true' || isSuccess === true;
  }
  if (taskId) where.taskId = { [Op.like]: `%${taskId}%` };
  
  // 时间范围
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime[Op.gte] = new Date(startDate);
    if (endDate) where.startTime[Op.lte] = new Date(endDate + 'T23:59:59');
  }

  const { count, rows } = await ApiLog.findAndCountAll({
    where,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: parseInt(pageSize),
    offset: (parseInt(page) - 1) * parseInt(pageSize)
  });

  return {
    logs: rows.map(formatApiLogForDisplay),
    total: count,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(count / parseInt(pageSize))
  };
}

/**
 * 获取单个 API 日志详情
 * @param {string} logId - 日志ID
 * @returns {Promise<Object>} 日志详情
 */
async function getApiLogById(logId) {
  const apiLog = await ApiLog.findByPk(logId);
  if (!apiLog) {
    throw new Error('日志记录不存在');
  }
  return formatApiLogForDisplay(apiLog);
}

/**
 * 获取 API 统计数据
 * @param {Object} query - 查询条件（可选时间范围）
 * @returns {Promise<Object>} 统计数据
 */
async function getApiStatistics(query = {}) {
  const { startDate, endDate } = query;
  
  const where = {};
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime[Op.gte] = new Date(startDate);
    if (endDate) where.startTime[Op.lte] = new Date(endDate + 'T23:59:59');
  }

  // 总调用次数
  const totalCalls = await ApiLog.count({ where });
  
  // 成功/失败统计
  const successCalls = await ApiLog.count({ where: { ...where, isSuccess: true } });
  const failedCalls = await ApiLog.count({ where: { ...where, isSuccess: false } });
  
  // 按平台统计
  const platformStats = await ApiLog.findAll({
    attributes: [
      'platform',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [literal('SUM(CASE WHEN "isSuccess" = 1 THEN 1 ELSE 0 END)'), 'successCount']
    ],
    where,
    group: ['platform'],
    raw: true
  });

  // 按功能类型统计
  const functionStats = await ApiLog.findAll({
    attributes: [
      'functionType',
      'functionName',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [literal('SUM(CASE WHEN "isSuccess" = 1 THEN 1 ELSE 0 END)'), 'successCount']
    ],
    where,
    group: ['functionType', 'functionName'],
    order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
    raw: true
  });

  // 平均耗时
  const avgDuration = await ApiLog.findOne({
    attributes: [[sequelize.fn('AVG', sequelize.col('durationMs')), 'avgDuration']],
    where: { ...where, durationMs: { [Op.ne]: null } },
    raw: true
  });

  // 总消耗（RunningHub 金币）
  const totalCoins = await ApiLog.findOne({
    attributes: [[sequelize.fn('SUM', sequelize.col('consumeCoins')), 'totalCoins']],
    where: { ...where, consumeCoins: { [Op.ne]: null } },
    raw: true
  });

  // 总 Token 消耗（SiliconFlow）
  const totalTokens = await ApiLog.findOne({
    attributes: [[sequelize.fn('SUM', sequelize.col('totalTokens')), 'totalTokens']],
    where: { ...where, totalTokens: { [Op.ne]: null } },
    raw: true
  });

  return {
    overview: {
      totalCalls,
      successCalls,
      failedCalls,
      successRate: totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(2) + '%' : '0%',
      avgDuration: avgDuration?.avgDuration ? Math.round(avgDuration.avgDuration) + 'ms' : 'N/A'
    },
    byPlatform: platformStats.map(p => ({
      platform: p.platform,
      count: parseInt(p.count),
      successCount: parseInt(p.successCount)
    })),
    byFunction: functionStats.map(f => ({
      functionType: f.functionType,
      functionName: f.functionName,
      count: parseInt(f.count),
      successCount: parseInt(f.successCount)
    })),
    costs: {
      totalCoins: parseFloat(totalCoins?.totalCoins || 0).toFixed(2),
      totalTokens: parseInt(totalTokens?.totalTokens || 0)
    }
  };
}

/**
 * 删除 API 日志（支持批量删除）
 * @param {Array<string>} logIds - 日志ID数组
 * @returns {Promise<number>} 删除的数量
 */
async function deleteApiLogs(logIds) {
  const result = await ApiLog.destroy({
    where: {
      id: { [Op.in]: logIds }
    }
  });
  console.log(`🗑️ [API日志] 删除了 ${result} 条日志记录`);
  return result;
}

/**
 * 清理过期日志（保留最近N天）
 * @param {number} daysToKeep - 保留天数（默认90天）
 * @returns {Promise<number>} 删除的数量
 */
async function cleanOldLogs(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const result = await ApiLog.destroy({
    where: {
      startTime: { [Op.lt]: cutoffDate }
    }
  });

  console.log(`🧹 [API日志] 清理了 ${result} 条过期日志（超过 ${daysToKeep} 天）`);
  return result;
}

// ========== 辅助函数 ==========

/**
 * 根据功能类型获取中文名称
 */
function getFunctionName(functionType) {
  const nameMap = {
    // RunningHub
    'asr': '音频转文字 (ASR)',
    'tts': '文字转音频 (TTS)',
    'dubbing': '配音生成',
    'image_to_video': '图生视频/数字人',  // ⭐ 合并：通用图片生成视频 + 数字人口型驱动
    'video_to_video': '视频生成视频',
    // SiliconFlow
    'text_rewrite': '文案改写',
    'text_check': '文案审核',
    'text_generate': '文案生成',
    'text_extract_topics': '主题提取',
    'chat_completion': '对话补全'
  };
  return nameMap[functionType] || functionType;
}

/**
 * 格式化毫秒为 分:秒 格式
 */
function formatDuration(ms) {
  if (!ms) return null;
  
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}

/**
 * 格式化日志记录用于前端显示
 */
function formatApiLogForDisplay(apiLog) {
  const log = apiLog.toJSON();
  
  // 解析JSON字段
  if (log.requestParams) {
    try { log.requestParams = JSON.parse(log.requestParams); } catch (e) {}
  }
  if (log.responseData) {
    try { log.responseData = JSON.parse(log.responseData); } catch (e) {}
  }
  
  return log;
}

module.exports = {
  createApiLog,
  updateApiLog,
  getApiLogs,
  getApiLogById,
  getApiStatistics,
  deleteApiLogs,
  cleanOldLogs
};

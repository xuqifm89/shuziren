const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const ApiLog = sequelize.define('ApiLog', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  
  // ========== 请求信息 ==========
  
  // 用户ID
  userId: {
    type: UUID,
    allowNull: false,
    comment: '调用API的用户ID'
  },
  
  // 任务ID（可选，用于关联具体任务）
  taskId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '关联的任务ID'
  },
  
  // 调用的平台
  platform: {
    type: DataTypes.ENUM(
      'runninghub',      // RunningHub 平台
      'siliconflow'      // 硅基流动平台
    ),
    allowNull: false,
    comment: '调用的第三方平台'
  },
  
  // 使用的功能/接口
  functionType: {
    type: DataTypes.ENUM(
      // ====== RunningHub 功能 ======
      'asr',                    // 音频转文字 (ASR)
      'tts',                    // 文字转音频 (TTS)
      'dubbing',                // 配音生成 (Voice Cloning)
      'image_to_video',         // 图片生成视频 / 数字人 (I2V) ⭐ 合并：通用图生视频 + 数字人口型驱动
      'video_to_video',         // 视频生成视频 (V2V)
      // ====== SiliconFlow 功能 ======
      'text_rewrite',           // 文案改写
      'text_check',             // 文案审核（违禁词检测）
      'text_generate',          // 文案生成
      'text_extract_topics',    // 主题提取
      'chat_completion'         // 对话补全（通用）
    ),
    allowNull: false,
    comment: '使用的功能类型'
  },
  
  // 功能描述（中文，用于显示）
  functionName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '功能名称（中文）'
  },
  
  // 请求的 API 端点或方法名
  apiEndpoint: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '调用的API端点或方法'
  },
  
  // 请求参数摘要（JSON格式，记录关键参数）
  requestParams: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '请求参数摘要（JSON）'
  },
  
  // 输入数据大小（字符数或文件大小）
  inputSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '输入数据大小（字符数或字节）'
  },
  
  // ========== 响应信息 ==========
  
  // 是否成功
  isSuccess: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否调用成功'
  },
  
  // 错误代码（失败时）
  errorCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '错误代码'
  },
  
  // 错误消息（失败时）
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误详细信息'
  },
  
  // HTTP状态码
  httpStatus: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'HTTP响应状态码'
  },
  
  // ========== RunningHub 特有字段 ==========
  
  // RunningHub 任务ID
  rhTaskId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'RunningHub 任务ID'
  },
  
  // 消耗的积分/金币
  consumeCoins: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: '消耗的金币数（RunningHub）'
  },
  
  // 任务耗时（毫秒）
  taskCostTimeMs: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '任务执行时间（毫秒）'
  },
  
  // 任务耗时（格式化：分:秒）
  taskCostTimeFormatted: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '任务执行时间（格式化：X分Y秒）'
  },
  
  // WebSocket URL（RunningHub）
  netWssUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'WebSocket连接URL'
  },
  
  // ========== SiliconFlow 特有字段 ==========
  
  // 输入 Token 数
  inputTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '输入Token数量（SiliconFlow）'
  },
  
  // 输出 Token 数
  outputTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '输出Token数量（SiliconFlow）'
  },
  
  // 总 Token 数
  totalTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '总Token消耗量'
  },
  
  // 模型名称
  modelName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '使用的AI模型名称'
  },
  
  // ========== 通用响应数据 ==========
  
  // 响应数据摘要（JSON格式，记录核心返回值）
  responseData: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '响应数据摘要（JSON）'
  },
  
  // 输出文件路径（如果有生成的文件）
  outputFilePath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '生成的输出文件路径'
  },
  
  // 输出文件大小（字节）
  outputFileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '输出文件大小（字节）'
  },
  
  // ========== 性能统计 ==========
  
  // 客户端发起时间
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '请求开始时间'
  },
  
  // 响应完成时间
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '响应完成时间'
  },
  
  // 总耗时（毫秒）
  durationMs: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '总耗时（毫秒）'
  },
  
  // IP地址
  clientIp: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: '客户端IP地址'
  },
  
  // 用户代理
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '用户代理字符串'
  }
}, {
  timestamps: true,
  tableName: 'api_logs',
  indexes: [
    { fields: ['userId'] },
    { fields: ['platform'] },
    { fields: ['functionType'] },
    { fields: ['isSuccess'] },
    { fields: ['startTime'] },
    { fields: ['taskId'] },
    { fields: ['rhTaskId'] },
    { fields: ['createdAt'] },
    // 复合索引（常用查询组合）
    { fields: ['userId', 'platform'] },
    { fields: ['userId', 'functionType'] },
    { fields: ['platform', 'functionType'] },
    { fields: ['startTime', 'isSuccess'] }
  ]
});

module.exports = ApiLog;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { UUID, UUIDV4 } = require('../config/dbTypes');

const CloudConfig = sequelize.define('CloudConfig', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  
  // 配置分类
  category: {
    type: DataTypes.ENUM(
      'api_provider',      // API提供商配置
      'model_config',      // 模型配置
      'app_config',        // 应用配置
      'user_account',      // 用户账号
      'system_setting'     // 系统设置
    ),
    allowNull: false,
    defaultValue: 'api_provider'
  },
  
  // 配置键名（如：runninghub_api_key, siliconflow_base_url）
  configKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  
  // 配置值（加密存储敏感信息）
  configValue: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  // 是否为敏感信息（需要加密存储）
  isSensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // 加密后的值（仅用于密钥类）
  encryptedValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // 配置显示名称
  displayName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // 配置描述
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // 配置类型
  valueType: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'url'),
    defaultValue: 'string'
  },
  
  // 所属用户ID（null表示全局配置）
  userId: {
    type: UUID,
    allowNull: true
  },
  
  // 是否启用
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // 是否为默认值
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // 排序权重
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // 最后修改人
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'cloud_configs',
  indexes: [
    { fields: ['category'] },
    { fields: ['configKey'] },
    { fields: ['userId'] },
    { fields: ['isActive'] }
  ]
});

module.exports = CloudConfig;

const express = require('express');
const router = express.Router();
const CloudConfig = require('../models/CloudConfig');
const configService = require('../services/configService');
const apiConfig = require('../config/apiConfig');
const crypto = require('crypto');

// 加密密钥（实际项目中应该从环境变量读取）
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('CONFIG_ENCRYPTION_KEY must be set in production'); })()
    : 'shuziren-cloud-config-dev-32bytes!!'
);
const IV_LENGTH = 16;

// 加密函数
function encrypt(text) {
  if (!text) return null;
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// 解密函数
function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('解密失败:', error.message);
    return null;
  }
}

// 获取所有配置（支持分类过滤）
router.get('/', async (req, res) => {
  try {
    const { category, configKey, userId, isActive } = req.query;
    
    const whereClause = {};
    
    if (category) whereClause.category = category;
    if (configKey) whereClause.configKey = configKey;
    if (userId) whereClause.userId = userId;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';
    
    // 如果不是管理员，只返回非敏感配置
    const configs = await CloudConfig.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['sortOrder', 'ASC'], ['configKey', 'ASC']]
    });
    
    const safeConfigs = configs.map(config => {
      const configObj = config.toJSON();
      
      if (configObj.isSensitive && configObj.encryptedValue) {
        const decrypted = decrypt(configObj.encryptedValue);
        configObj.configValue = decrypted || '';
      }
      
      return configObj;
    });
    
    res.json({
      success: true,
      data: safeConfigs,
      total: safeConfigs.length
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取配置失败',
      message: error.message 
    });
  }
});

// 获取单个配置的明文值（仅限管理员）
router.get('/:id/decrypt', async (req, res) => {
  try {
    const config = await CloudConfig.findByPk(req.params.id);
    
    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }
    
    if (!config.isSensitive || !config.encryptedValue) {
      return res.json({
        success: true,
        data: { value: config.configValue }
      });
    }
    
    const decryptedValue = decrypt(config.encryptedValue);
    
    res.json({
      success: true,
      data: { value: decryptedValue }
    });
  } catch (error) {
    console.error('获取配置值失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取配置值失败' 
    });
  }
});

// 创建或更新配置
router.post('/', async (req, res) => {
  try {
    const {
      category,
      configKey,
      configValue,
      isSensitive,
      displayName,
      description,
      valueType,
      userId,
      isDefault,
      sortOrder
    } = req.body;
    
    if (!category || !configKey || configValue === undefined) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：category, configKey, configValue'
      });
    }
    
    let encryptedValue = null;
    let finalValue = configValue;
    
    if (isSensitive && configValue !== '' && configValue !== null) {
      encryptedValue = encrypt(configValue);
      finalValue = '';
    } else if (isSensitive) {
      finalValue = '';
    } else {
      encryptedValue = null;
    }
    
    // 查找是否已存在该配置
    const existingConfig = await CloudConfig.findOne({
      where: { configKey }
    });
    
    let config;
    
    if (existingConfig) {
      const updateFields = {
        category,
        configValue: finalValue,
        isSensitive: isSensitive || false,
        encryptedValue: isSensitive ? encryptedValue : null,
        displayName: displayName || existingConfig.displayName,
        description: description || existingConfig.description,
        valueType: valueType || existingConfig.valueType,
        userId: userId || existingConfig.userId,
        isDefault: isDefault || existingConfig.isDefault,
        sortOrder: sortOrder !== undefined ? sortOrder : existingConfig.sortOrder,
        updatedBy: req.user?.id || null
      };

      await existingConfig.update(updateFields);
      
      config = existingConfig;
    } else {
      // 创建新配置
      config = await CloudConfig.create({
        category,
        configKey,
        configValue: finalValue,
        isSensitive: isSensitive || false,
        encryptedValue,
        displayName,
        description,
        valueType: valueType || 'string',
        userId,
        isDefault: isDefault || false,
        sortOrder: sortOrder || 0,
        updatedBy: req.user?.id
      });
    }
    
    res.status(201).json({
      success: true,
      data: config.toJSON(),
      message: existingConfig ? '配置更新成功' : '配置创建成功'
    });

    configService.clearCache();
    apiConfig.clearConfigCache && apiConfig.clearConfigCache();
  } catch (error) {
    console.error('保存配置失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '保存配置失败',
      message: error.message 
    });
  }
});

// 批量更新配置（用于批量导入）
router.post('/batch', async (req, res) => {
  try {
    const { configs } = req.body;
    
    if (!Array.isArray(configs)) {
      return res.status(400).json({
        success: false,
        error: 'configs 必须是数组'
      });
    }
    
    const results = [];
    
    for (const configData of configs) {
      const {
        category,
        configKey,
        configValue,
        isSensitive,
        displayName,
        description,
        valueType,
        userId
      } = configData;
      
      if (!configKey) continue;
      
      let encryptedValue = null;
      let finalValue = configValue;
      
      if (isSensitive && configValue !== '********') {
        encryptedValue = encrypt(configValue);
        finalValue = '';
      }
      
      const [config] = await CloudConfig.upsert(
        {
          category: category || 'api_provider',
          configKey,
          configValue: finalValue,
          isSensitive: isSensitive || false,
          encryptedValue,
          displayName,
          description,
          valueType: valueType || 'string',
          userId,
          isActive: true,
          updatedBy: req.user?.id
        },
        {
          where: { configKey }
        }
      );
      
      results.push(config.toJSON());
    }
    
    res.status(201).json({
      success: true,
      data: results,
      total: results.length,
      message: `成功更新 ${results.length} 个配置`
    });
  } catch (error) {
    console.error('批量更新失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '批量更新失败',
      message: error.message 
    });
  }
});

// 更新单个配置
router.put('/:id', async (req, res) => {
  try {
    const config = await CloudConfig.findByPk(req.params.id);

    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    const {
      category,
      configKey,
      configValue,
      isSensitive,
      displayName,
      description,
      valueType,
      userId,
      isDefault,
      sortOrder
    } = req.body;

    const updateData = {};

    if (category !== undefined) updateData.category = category;
    if (configKey !== undefined) updateData.configKey = configKey;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (valueType !== undefined) updateData.valueType = valueType;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    updateData.updatedBy = req.user?.id || null;

    if (userId !== undefined) {
      updateData.userId = userId || null;
    }

    if (isSensitive !== undefined) {
      updateData.isSensitive = isSensitive;
    }

    const effectiveIsSensitive = isSensitive !== undefined ? isSensitive : config.isSensitive;

    if (effectiveIsSensitive) {
      if (configValue === undefined) {
        // not provided: keep existing values
      } else if (configValue === '' || configValue === null) {
        updateData.configValue = '';
        updateData.encryptedValue = null;
      } else {
        const encrypted = encrypt(configValue);
        updateData.configValue = '';
        updateData.encryptedValue = encrypted;
      }
    } else {
      if (configValue !== undefined) {
        updateData.configValue = configValue;
      }
      updateData.encryptedValue = null;
    }

    await config.update(updateData);

    configService.clearCache();
    apiConfig.clearConfigCache && apiConfig.clearConfigCache();

    res.json({
      success: true,
      data: config.toJSON(),
      message: '配置更新成功'
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({
      success: false,
      error: '更新配置失败',
      message: error.message,
      detail: error.original?.message || null
    });
  }
});

// 删除配置
router.delete('/:id', async (req, res) => {
  try {
    const config = await CloudConfig.findByPk(req.params.id);
    
    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }
    
    await config.destroy();

    configService.clearCache();
    apiConfig.clearConfigCache && apiConfig.clearConfigCache();

    res.json({
      success: true,
      message: '配置删除成功'
    });
  } catch (error) {
    console.error('删除配置失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '删除配置失败' 
    });
  }
});

// 获取配置分类列表
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = [
      {
        name: 'api_provider',
        label: 'API提供商配置',
        icon: '🔗',
        description: '管理API链接地址、密钥等'
      },
      {
        name: 'model_config',
        label: '模型配置',
        icon: '🤖',
        description: '管理AI模型ID、参数等'
      },
      {
        name: 'app_config',
        label: '应用配置',
        icon: '📱',
        description: '管理应用ID、工作流ID等'
      },
      {
        name: 'user_account',
        label: '用户账号',
        icon: '👤',
        description: '管理用户登录凭证等'
      },
      {
        name: 'system_setting',
        label: '系统设置',
        icon: '⚙️',
        description: '管理系统级配置项'
      }
    ];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取分类失败' });
  }
});

// 客户端同步接口（获取当前用户的所有有效配置）
router.get('/sync/client', async (req, res) => {
  try {
    const { userId, clientVersion } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少userId参数'
      });
    }
    
    // 获取全局配置和用户特定配置
    const [globalConfigs, userConfigs] = await Promise.all([
      CloudConfig.findAll({
        where: {
          userId: null,
          isActive: true
        }
      }),
      CloudConfig.findAll({
        where: {
          userId: userId,
          isActive: true
        }
      })
    ]);
    
    // 合并配置，用户配置覆盖全局配置
    const allConfigs = [...globalConfigs, ...userConfigs];
    
    // 转换为键值对格式
    const configMap = {};
    
    for (const config of allConfigs) {
      let value = config.configValue;
      
      // 如果有加密值，解密返回
      if (config.isSensitive && config.encryptedValue) {
        value = decrypt(config.encryptedValue);
      }
      
      // 根据类型转换值
      switch (config.valueType) {
        case 'number':
          value = Number(value);
          break;
        case 'boolean':
          value = value === 'true' || value === true;
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = value;
          }
          break;
      }
      
      configMap[config.configKey] = value;
    }
    
    res.json({
      success: true,
      data: configMap,
      syncTime: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    console.error('客户端同步失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '同步失败',
      message: error.message 
    });
  }
});

module.exports = router;

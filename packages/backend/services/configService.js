const CloudConfig = require('../models/CloudConfig');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'shuziren-cloud-config-dev-32bytes!!';

const OLD_ENCRYPTION_KEYS = [
  'shuziren-cloud-config-2024-secret-key-32bytes'
];

function decrypt(encryptedText, keyOverride) {
  if (!encryptedText) return null;
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    const key = crypto.scryptSync(keyOverride || ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
}

function decryptWithFallback(encryptedText) {
  if (!encryptedText) return null;

  const result = decrypt(encryptedText);
  if (result) return result;

  for (const oldKey of OLD_ENCRYPTION_KEYS) {
    const fallbackResult = decrypt(encryptedText, oldKey);
    if (fallbackResult) {
      console.log(`[configService] 使用旧密钥成功解密，建议重新保存该配置以更新加密`);
      return fallbackResult;
    }
  }

  console.error('[configService] 解密失败: 所有密钥均无法解密');
  return null;
}

let configCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

class ConfigService {

  async getAllConfigs(userId) {
    const now = Date.now();

    if (configCache && (now - cacheTimestamp) < CACHE_TTL) {
      return configCache;
    }

    try {
      const [globalConfigs, userConfigs] = await Promise.all([
        CloudConfig.findAll({
          where: { userId: null, isActive: true },
          order: [['sortOrder', 'ASC']]
        }),
        ...(userId ? [CloudConfig.findAll({
          where: { userId, isActive: true },
          order: [['sortOrder', 'ASC']]
        })] : [[]])
      ]);

      const allConfigs = [...globalConfigs, ...userConfigs];

      const configMap = {};

      for (const config of allConfigs) {
        let value = config.configValue;

        if (config.isSensitive && config.encryptedValue) {
          value = decryptWithFallback(config.encryptedValue);
          if (value === null) {
            value = config.configValue || '';
          }
        }

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
            } catch (e) {}
            break;
        }

        configMap[config.configKey] = value;
      }

      configCache = configMap;
      cacheTimestamp = now;

      return configMap;
    } catch (error) {
      console.error('获取配置失败:', error);
      return {};
    }
  }

  async getConfig(key, defaultValue = null, userId) {
    const configs = await this.getAllConfigs(userId);
    return configs[key] !== undefined ? configs[key] : defaultValue;
  }

  async getApiProviderConfig(provider, userId) {
    const configs = await this.getAllConfigs(userId);

    switch (provider.toLowerCase()) {
      case 'runninghub':
        return {
          apiKey: configs['runninghub_api_key'] || process.env.RUNNINGHUB_API_KEY || '',
          baseUrl: configs['runninghub_base_url'] || process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.cn',
          apps: {
            textGeneration: configs['runninghub_app_text_generation'] || process.env.TEXT_GENERATION_APP_ID || '',
            audioGeneration: configs['runninghub_app_audio_generation'] || process.env.AUDIO_GENERATION_APP_ID || '',
            videoGeneration: configs['runninghub_app_video_generation'] || process.env.VIDEO_GENERATION_APP_ID || '',
            dubbing: configs['runninghub_app_dubbing'] || process.env.DUBBING_APP_ID || '2049527678209892354',
            imageToVideo: configs['runninghub_app_image_to_video'] || process.env.IMAGE_TO_VIDEO_APP_ID || '2050230386843762690',
            videoToVideo: configs['runninghub_app_video_to_video'] || process.env.VIDEO_TO_VIDEO_APP_ID || '2050226856238043137'
          }
        };

      case 'siliconflow':
        return {
          apiKey: configs['siliconflow_api_key'] || process.env.SILICONFLOW_API_KEY || '',
          baseUrl: configs['siliconflow_base_url'] || process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
          defaultModel: configs['siliconflow_default_model'] || process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
        };

      default:
        throw new Error(`未知的API提供商: ${provider}`);
    }
  }

  clearCache() {
    configCache = null;
    cacheTimestamp = 0;
  }

  async initDefaultConfigs() {
    const defaultConfigs = [
      {
        category: 'api_provider',
        configKey: 'runninghub_base_url',
        configValue: 'https://www.runninghub.cn',
        displayName: 'RunningHub API地址',
        description: 'RunningHub平台的API基础URL',
        valueType: 'url',
        isDefault: true,
        sortOrder: 1
      },
      {
        category: 'api_provider',
        configKey: 'runninghub_api_key',
        configValue: '',
        displayName: 'RunningHub API密钥',
        description: 'RunningHub平台的API访问密钥',
        isSensitive: true,
        isDefault: true,
        sortOrder: 2
      },
      {
        category: 'api_provider',
        configKey: 'siliconflow_base_url',
        configValue: 'https://api.siliconflow.cn/v1',
        displayName: 'SiliconFlow API地址',
        description: 'SiliconFlow平台的API基础URL',
        valueType: 'url',
        isDefault: true,
        sortOrder: 10
      },
      {
        category: 'api_provider',
        configKey: 'siliconflow_api_key',
        configValue: '',
        displayName: 'SiliconFlow API密钥',
        description: 'SiliconFlow平台的API访问密钥',
        isSensitive: true,
        isDefault: true,
        sortOrder: 11
      },
      {
        category: 'api_provider',
        configKey: 'siliconflow_default_model',
        configValue: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
        displayName: '默认AI模型',
        description: 'SiliconFlow默认使用的AI模型ID',
        isDefault: true,
        sortOrder: 12
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_text_generation',
        configValue: '',
        displayName: '文本生成应用ID',
        description: 'RunningHub文本生成应用的应用ID',
        isDefault: true,
        sortOrder: 20
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_audio_generation',
        configValue: '',
        displayName: '音频生成应用ID',
        description: 'RunningHub音频生成应用的应用ID',
        isDefault: true,
        sortOrder: 21
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_video_generation',
        configValue: '',
        displayName: '视频生成应用ID',
        description: 'RunningHub视频生成应用的应用ID',
        isDefault: true,
        sortOrder: 22
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_dubbing',
        configValue: '2049527678209892354',
        displayName: '配音应用ID',
        description: 'RunningHub配音应用的应用ID',
        isDefault: true,
        sortOrder: 23
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_image_to_video',
        configValue: '2050230386843762690',
        displayName: '图片转视频应用ID',
        description: 'RunningHub图片转视频应用的应用ID',
        isDefault: true,
        sortOrder: 24
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_video_to_video',
        configValue: '2050226856238043137',
        displayName: '视频转视频应用ID',
        description: 'RunningHub视频转视频应用的应用ID',
        isDefault: true,
        sortOrder: 25
      }
    ];

    for (const config of defaultConfigs) {
      try {
        const existing = await CloudConfig.findOne({ where: { configKey: config.configKey } });
        if (!existing) {
          await CloudConfig.create(config);
        }
      } catch (error) {
        console.error(`初始化默认配置 ${config.configKey} 失败:`, error.message);
      }
    }

    console.log('✅ 默认配置初始化完成');
  }
}

module.exports = new ConfigService();

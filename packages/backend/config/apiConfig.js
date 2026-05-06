const configService = require('../services/configService');

let cachedConfig = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 默认静态配置（向后兼容）
const defaultConfig = {
  runningHub: {
    apiKey: process.env.RUNNINGHUB_API_KEY || '',
    baseUrl: process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.cn',
    
    // 新版应用 ID 配置（按功能分类，更清晰）
    apps: {
      asr: '',           // 音频转文字 (ASR)
      tts: '',           // 文字转音频 (TTS)
      imageToVideo: '',  // 图片生成视频
      videoToVideo: '', // 视频生成视频
      subtitle: ''       // 音频转字幕和时间线
    },
    
    // 旧版应用 ID 配置（向后兼容）
    aiApps: {
      textGeneration: process.env.TEXT_GENERATION_APP_ID || '',
      audioGeneration: process.env.AUDIO_GENERATION_APP_ID || '',
      videoGeneration: process.env.VIDEO_GENERATION_APP_ID || '',
      dubbing: process.env.DUBBING_APP_ID || '2049527678209892354',
      imageToVideo: process.env.IMAGE_TO_VIDEO_APP_ID || '2050230386843762690',
      videoToVideo: process.env.VIDEO_TO_VIDEO_APP_ID || '2050226856238043137'
    },
    
    workflows: {
      textGeneration: process.env.TEXT_GENERATION_WORKFLOW_ID || '',
      audioGeneration: process.env.AUDIO_GENERATION_WORKFLOW_ID || '',
      videoGeneration: process.env.VIDEO_GENERATION_WORKFLOW_ID || ''
    }
  },
  
  siliconFlow: {
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    baseUrl: process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
    defaultModel: process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
  }
};

async function getDynamicConfig() {
  const now = Date.now();
  
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedConfig;
  }
  
  try {
    const configs = await configService.getAllConfigs();
    
    cachedConfig = {
      runningHub: {
        apiKey: configs['runninghub_api_key'] || process.env.RUNNINGHUB_API_KEY || '',
        baseUrl: configs['runninghub_base_url'] || process.env.RUNNINGHUB_BASE_URL || 'https://www.runninghub.cn',
        
        // ⚠️ [重要] 应用 ID 配置说明
        // 本项目中 TTS（文字转音频）和配音（Voice Cloning）为同一功能
        // 以下两个配置项应保持一致：tts 和 dubbing
        
        // 新版应用 ID 配置（优先从云端读取）
        apps: {
          asr: configs['runninghub_app_asr'] ||
               process.env.DUBBING_APP_ID ||  // ASR 使用配音 ID 作为默认值
               '2049522529517182978',          // 音频转文字/字幕应用

          tts: configs['runninghub_app_tts'] ||
              configs['runninghub_app_dubbing'] || // ⚠️ TTS 与配音为同一功能，优先使用配音ID
              process.env.AUDIO_GENERATION_APP_ID ||
              process.env.DUBBING_APP_ID ||         // 回退到配音环境变量
              '2049527678209892354',               // 默认使用配音应用ID
          
          dubbing: configs['runninghub_app_dubbing'] || 
                   configs['runninghub_app_tts'] ||   // ⚠️ 配音与TTS为同一功能，优先使用TTS ID
                   process.env.DUBBING_APP_ID || 
                   '2049527678209892354',            // 配音生成应用ID
          
          imageToVideo: configs['runninghub_app_image_to_video'] || 
                       process.env.IMAGE_TO_VIDEO_APP_ID || 
                       '2050230386843762690',
          
          videoToVideo: configs['runninghub_app_video_to_video'] || 
                       process.env.VIDEO_TO_VIDEO_APP_ID || 
                       '2050226856238043137',

          subtitle: configs['runninghub_app_subtitle'] ||
                    '2050542479962849282'              // SRT字幕生成应用
        },
        
        // 旧版应用 ID 配置（保持兼容）
        aiApps: {
          textGeneration: configs['runninghub_app_text_generation'] || process.env.TEXT_GENERATION_APP_ID || '',
          audioGeneration: configs['runninghub_app_audio_generation'] || process.env.AUDIO_GENERATION_APP_ID || '',
          videoGeneration: configs['runninghub_app_video_generation'] || process.env.VIDEO_GENERATION_APP_ID || '',
          dubbing: configs['runninghub_app_dubbing'] || process.env.DUBBING_APP_ID || '2049527678209892354',
          imageToVideo: configs['runninghub_app_image_to_video'] || process.env.IMAGE_TO_VIDEO_APP_ID || '2050230386843762690',
          videoToVideo: configs['runninghub_app_video_to_video'] || process.env.VIDEO_TO_VIDEO_APP_ID || '2050226856238043137'
        },
        
        workflows: {
          textGeneration: configs['runninghub_workflow_text_generation'] || process.env.TEXT_GENERATION_WORKFLOW_ID || '',
          audioGeneration: configs['runninghub_workflow_audio_generation'] || process.env.AUDIO_GENERATION_WORKFLOW_ID || '',
          videoGeneration: configs['runninghub_workflow_video_generation'] || process.env.VIDEO_GENERATION_WORKFLOW_ID || ''
        }
      },
      
      siliconFlow: {
        apiKey: configs['siliconflow_api_key'] || process.env.SILICONFLOW_API_KEY || '',
        baseUrl: configs['siliconflow_base_url'] || process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
        defaultModel: configs['siliconflow_default_model'] || process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
      }
    };
    
    // 同步更新默认配置对象（向后兼容）
    Object.assign(defaultConfig, cachedConfig);
    
    cacheTimestamp = now;
    
    console.log('✅ 配置已从云端加载（带缓存）');
    return cachedConfig;
  } catch (error) {
    console.error('❌ 加载动态配置失败，使用默认配置:', error.message);
    return { ...defaultConfig };
  }
}

function clearConfigCache() {
  cachedConfig = null;
  cacheTimestamp = 0;

  const textService = require('../services/textService');
  if (textService && textService.clearCache) {
    textService.clearCache();
  }
}

/**
 * 获取特定应用的 ID（推荐使用此方法）
 * @param {string} appName - 应用名称: 'asr', 'tts', 'imageToVideo', 'videoToVideo', 'subtitle'
 * @returns {Promise<string>} 应用 ID
 */
async function getAppId(appName) {
  const config = await getDynamicConfig();
  return config.runningHub.apps[appName] || config.runningHub.aiApps[appName] || '';
}

// 导出：支持新旧两种使用方式
module.exports = defaultConfig; // 默认导出配置对象（向后兼容）
module.exports.getDynamicConfig = getDynamicConfig; // 动态配置函数
module.exports.clearConfigCache = clearConfigCache; // 清除缓存
module.exports.getAppId = getAppId; // 获取特定应用 ID（推荐）
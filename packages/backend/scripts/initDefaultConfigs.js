const CloudConfig = require('../models/CloudConfig');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function initializeDefaultConfigs() {
  console.log('🚀 开始初始化默认云端配置...');

  const defaultConfigs = [
    // ========== 硅基流动 (SiliconFlow) 配置 ==========
    {
      category: 'api_provider',
      configKey: 'siliconflow_api_key',
      displayName: '硅基流动 API 密钥',
      configValue: process.env.SILICONFLOW_API_KEY || '',
      isSensitive: true,
      valueType: 'string',
      description: 'SiliconFlow 平台的 API 访问密钥，用于调用所有 AI 接口',
      sortOrder: 1
    },
    {
      category: 'api_provider',
      configKey: 'siliconflow_base_url',
      displayName: '硅基流动 API 地址',
      configValue: 'https://api.siliconflow.cn/v1',
      isSensitive: false,
      valueType: 'string',
      description: '硅基流动 API 服务的基础 URL，通常不需要修改',
      sortOrder: 2
    },
    {
      category: 'model_config',
      configKey: 'siliconflow_default_model',
      displayName: '默认大语言模型',
      configValue: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
      isSensitive: false,
      valueType: 'string',
      description: '用于文案生成、改写、审核等文本处理任务的主模型。推荐使用 DeepSeek-R1 系列以获得更好的推理能力。',
      sortOrder: 3
    },

    // ========== RunningHub 配置 ==========
    {
      category: 'api_provider',
      configKey: 'runninghub_api_key',
      displayName: 'RunningHub API 密钥',
      configValue: process.env.RUNNINGHUB_API_KEY || '',
      isSensitive: true,
      valueType: 'string',
      description: 'RunningHub 平台的访问密钥，用于调用所有音视频生成功能',
      sortOrder: 10
    },
    {
      category: 'api_provider',
      configKey: 'runninghub_base_url',
      displayName: 'RunningHub 平台地址',
      configValue: 'https://www.runninghub.cn',
      isSensitive: false,
      valueType: 'string',
      description: 'RunningHub 平台的基础 URL，通常不需要修改',
      sortOrder: 11
    },

    // ========== AI 应用 ID 配置（共6个） ==========

    // 1. 音频转文字 (ASR) - 字幕生成
    {
      category: 'app_config',
      configKey: 'runninghub_app_asr',
      displayName: '音频转文字应用 ID',
      configValue: '2049522529517182978',
      isSensitive: false,
      valueType: 'string',
      description: 'ASR (Automatic Speech Recognition) 应用的唯一标识符，用于将音频文件转换为文字内容和 SRT 字幕',
      sortOrder: 20,
      usageHint: '用于：语音识别、会议记录转写、音频内容提取'
    },

    // 2. 文字转音频 (TTS) / 配音生成 - ⚠️ 本项目中两者为同一概念，共用同一 App ID
    {
      category: 'app_config',
      configKey: 'runninghub_app_tts',
      displayName: '文字转音频 (TTS) 应用 ID',
      configValue: '2049527678209892354',
      isSensitive: false,
      valueType: 'string',
      description: '[重要] 本项目中 TTS（文字转音频）和配音（Voice Cloning）是同一功能。此配置项与"配音生成应用ID"应保持一致。',
      sortOrder: 21,
      usageHint: '用于：文本转语音、AI 音色合成、视频配音制作（等同于配音生成）'
    },

    // 3. 配音生成 ⭐ 常用 - 与 TTS 为同一功能
    {
      category: 'app_config',
      configKey: 'runninghub_app_dubbing',
      displayName: '配音生成应用 ID',
      configValue: '2049527678209892354',
      isSensitive: false,
      valueType: 'string',
      description: '[重要] 配音生成（Voice Cloning）与 TTS 是同一功能。此配置项与"文字转音频(TTS)应用ID"应保持一致，修改任一即可。',
      sortOrder: 22,
      usageHint: '用于：克隆音色配音、情感化语音合成、视频配音制作（等同于 TTS）',
      isFeatured: true
    },

    // 4. 图片生成视频 (I2V)
    {
      category: 'app_config',
      configKey: 'runninghub_app_image_to_video',
      displayName: '图片生成视频应用 ID',
      configValue: '2050230386843762690',
      isSensitive: false,
      valueType: 'string',
      description: 'I2V (Image to Video) 应用的唯一标识符，用于根据静态图片生成动态视频内容',
      sortOrder: 23,
      usageHint: '用于：静态图动画化、产品展示视频、社交媒体内容、图生视频/数字人'
    },

    // 5. 视频生成视频 (V2V)
    {
      category: 'app_config',
      configKey: 'runninghub_app_video_to_video',
      displayName: '视频生成视频应用 ID',
      configValue: '2050226856238043137',
      isSensitive: false,
      valueType: 'string',
      description: 'V2V (Video to Video) 应用的唯一标识符，用于对现有视频进行风格迁移或效果转换',
      sortOrder: 24,
      usageHint: '用于：视频风格转换、特效添加、画质增强、视频转视频'
    },

    // 6. SRT字幕生成
    {
      category: 'app_config',
      configKey: 'runninghub_app_subtitle',
      displayName: 'SRT字幕生成应用 ID',
      configValue: '2050542479962849282',
      isSensitive: false,
      valueType: 'string',
      description: '语音转字幕应用的唯一标识符，用于将音频转换为带时间轴的 SRT/VTT 字幕文件',
      sortOrder: 25,
      usageHint: '用于：视频字幕生成、多语言字幕、时间线字幕编辑'
    }
  ];

  try {
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const config of defaultConfigs) {
      const existingConfig = await CloudConfig.findOne({
        where: { configKey: config.configKey }
      });

      if (existingConfig) {
        if (!existingConfig.configValue && config.configValue !== undefined && config.configValue !== '') {
          await existingConfig.update({
            configValue: config.configValue,
            description: config.description,
            displayName: config.displayName,
            sortOrder: config.sortOrder,
            ...(config.usageHint && { usageHint: config.usageHint }),
            ...(config.isFeatured !== undefined && { isFeatured: config.isFeatured })
          });
          updatedCount++;
          console.log(`   ✅ 已更新 ${config.configKey}: ${config.configValue.substring(0, 10)}...`);
        } else {
          skippedCount++;
        }
      } else {
        // 创建新配置项
        await CloudConfig.create(config);
        createdCount++;
      }
    }

    console.log('✅ 默认配置初始化完成！');
    console.log(`   📝 新建: ${createdCount} 个`);
    console.log(`   🔄 更新: ${updatedCount} 个`);
    console.log(`   ⏭️ 跳过: ${skippedCount} 个`);
    console.log(`   📊 总计: ${defaultConfigs.length} 个配置项`);

    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: defaultConfigs.length
    };

  } catch (error) {
    console.error('❌ 初始化默认配置失败:', error);
    throw error;
  }
}

module.exports = { initializeDefaultConfigs };

// 如果直接运行此脚本
if (require.main === module) {
  initializeDefaultConfigs()
    .then(result => {
      console.log('\n🎉 初始化成功！现在可以在管理后台配置这些项目了。');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 初始化失败:', error.message);
      process.exit(1);
    });
}
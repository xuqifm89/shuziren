<template>
  <div class="cloud-config-manager">
    <div class="manager-layout">
      <!-- 页面头部 -->
      <div class="config-header">
      <div class="header-left">
        <h1>⚙️ API 配置管理</h1>
        <p>管理所有第三方服务的 API 密钥和应用 ID，修改后即时生效</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSaveAll" :loading="saving" :disabled="!hasChanges">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          保存所有更改
        </el-button>
        <el-button @click="loadConfigs">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          重置
        </el-button>
      </div>
    </div>

    <!-- 配置状态提示 -->
    <div v-if="hasChanges" class="changes-banner">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      <span>您有未保存的更改，请点击"保存所有更改"按钮以应用配置</span>
    </div>

    <!-- 配置卡片列表 -->
    <div class="config-cards">
      
      <!-- 硅基流动 (SiliconFlow) 配置卡片 -->
      <div class="config-card siliconflow-card">
        <div class="card-header">
          <div class="provider-info">
            <div class="provider-logo sf-logo">SF</div>
            <div class="provider-details">
              <h2>硅基流动 SiliconFlow</h2>
              <span class="provider-desc">文案处理与大语言模型服务</span>
            </div>
          </div>
          <div class="provider-status">
            <el-tag :type="configs.siliconflow.apiKey ? 'success' : 'danger'" effect="dark" size="small">
              {{ configs.siliconflow.apiKey ? '已配置' : '未配置' }}
            </el-tag>
          </div>
        </div>

        <div class="card-body">
          <div class="config-section">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              基础连接配置
            </h3>
            
            <div class="config-grid">
              <div class="config-item full-width">
                <label class="config-label">
                  <span class="label-text">API 密钥</span>
                  <el-tag type="danger" size="small" effect="dark">敏感信息</el-tag>
                </label>
                <el-input
                  v-model="configs.siliconflow.apiKey"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  @input="markChanged('siliconflow_api_key')"
                >
                  <template #prefix>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#667eea"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  </template>
                </el-input>
                <div class="config-tip">用于调用硅基流动的所有 AI 接口，包括文案生成、改写等</div>
              </div>

              <div class="config-item full-width">
                <label class="config-label">
                  <span class="label-text">API 基础地址</span>
                </label>
                <el-input
                  v-model="configs.siliconflow.baseUrl"
                  placeholder="https://api.siliconflow.cn/v1"
                  @input="markChanged('siliconflow_base_url')"
                >
                  <template #prefix>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#10b981"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </template>
                </el-input>
                <div class="config-tip">硅基流动 API 服务的基础 URL，通常不需要修改</div>
              </div>
            </div>
          </div>

          <div class="config-section">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 11.01L3 11v2h18zM3 16h12v2H3zM21 6H3v2.01L21 8z"/></svg>
              大语言模型配置
            </h3>
            
            <div class="config-grid">
              <div class="config-item full-width">
                <label class="config-label">
                  <span class="label-text">默认模型</span>
                  <el-tag type="warning" size="small" effect="dark">核心配置</el-tag>
                </label>
                <el-select
                  v-model="configs.siliconflow.defaultModel"
                  filterable
                  allow-create
                  placeholder="选择或输入模型 ID"
                  style="width: 100%"
                  @change="markChanged('siliconflow_default_model')"
                >
                  <el-option-group label="推荐模型">
                    <el-option label="DeepSeek-R1-0528-Qwen3-8B (推理增强)" value="deepseek-ai/DeepSeek-R1-0528-Qwen3-8B" />
                    <el-option label="DeepSeek-V2.5 (通用对话)" value="deepseek-ai/DeepSeek-V2.5" />
                    <el-option label="Qwen2.5-72B-Instruct (高性能)" value="Qwen/Qwen2.5-72B-Instruct" />
                    <el-option label="GLM-4-9B-chat (中文优化)" value="THUDM/glm-4-9b-chat" />
                  </el-option-group>
                  <el-option-group label="其他可用模型">
                    <el-option label="Qwen2.5-32B-Instruct" value="Qwen/Qwen2.5-32B-Instruct" />
                    <el-option label="Qwen2.5-7B-Instruct" value="Qwen/Qwen2.5-7B-Instruct" />
                    <el-option label="DeepSeek-R1 (推理)" value="deepseek-ai/DeepSeek-R1" />
                    <el-option label="Meta-Llama-3.1-70B" value="meta-llama/Meta-Llama-3.1-70B-Instruct" />
                  </el-option-group>
                </el-select>
                <div class="config-tip">用于文案生成、改写、审核等文本处理任务的主模型</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="footer-info">
            <span class="info-icon">💡</span>
            <span>硅基流动主要用于<strong>文案处理</strong>：生成视频脚本、改写文案、内容审核等</span>
          </div>
        </div>
      </div>

      <!-- RunningHub 配置卡片 -->
      <div class="config-card runninghub-card">
        <div class="card-header">
          <div class="provider-info">
            <div class="provider-logo rh-logo">RH</div>
            <div class="provider-details">
              <h2>RunningHub</h2>
              <span class="provider-desc">音视频生成与 AI 应用平台</span>
            </div>
          </div>
          <div class="provider-status">
            <el-tag :type="configs.runninghub.apiKey ? 'success' : 'danger'" effect="dark" size="small">
              {{ configs.runninghub.apiKey ? '已配置' : '未配置' }}
            </el-tag>
          </div>
        </div>

        <div class="card-body">
          <!-- 基础配置 -->
          <div class="config-section">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              平台连接配置
            </h3>
            
            <div class="config-grid">
              <div class="config-item full-width">
                <label class="config-label">
                  <span class="label-text">API 密钥</span>
                  <el-tag type="danger" size="small" effect="dark">敏感信息</el-tag>
                </label>
                <el-input
                  v-model="configs.runninghub.apiKey"
                  placeholder="rh-xxxxxxxxxxxxxxxxxxxxxxxx"
                  @input="markChanged('runninghub_api_key')"
                >
                  <template #prefix>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#f59e0b"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  </template>
                </el-input>
                <div class="config-tip">RunningHub 平台的访问密钥，用于调用所有音视频生成功能</div>
              </div>

              <div class="config-item full-width">
                <label class="config-label">
                  <span class="label-text">平台基础地址</span>
                </label>
                <el-input
                  v-model="configs.runninghub.baseUrl"
                  placeholder="https://www.runninghub.cn"
                  @input="markChanged('runninghub_base_url')"
                >
                  <template #prefix>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#f97316"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </template>
                </el-input>
                <div class="config-tip">RunningHub 平台的基础 URL，通常不需要修改</div>
              </div>
            </div>
          </div>

          <!-- AI 应用配置 -->
          <div class="config-section apps-section">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>
              AI 应用 ID 配置
              <el-tag type="info" size="small" effect="plain" style="margin-left: 8px;">共 5 个应用</el-tag>
            </h3>
            
            <div class="apps-grid">
              
              <!-- 音频转文字 ASR -->
              <div class="app-config-item">
                <div class="app-header">
                  <div class="app-icon asr-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5l.01 6c0 1.66 1.33 3 2.99 3zm5.29-3.71l-2.83-2.83C13.28 6.55 12.68 6 12 6c-.67 0-1.28.26-1.75.69l-2.76-2.76C8.37 3.13 10.07 2 12 2c2.62 0 4.89 1.56 5.93 3.81.19.38.31.79.38 1.23 0 .55-.45 1-1 1h-7c-.55 0-1-.45-1-1 0-.43.12-.84.32-1.21 1.03-2.25 2.73-3.81 5.35-3.81z"/></svg>
                  </div>
                  <div class="app-info">
                    <h4>音频转文字</h4>
                    <span class="app-subtitle">ASR - 语音识别</span>
                  </div>
                </div>
                <div class="app-body">
                  <el-input
                    v-model="configs.runninghub.apps.asr"
                    placeholder="应用 ID"
                    size="default"
                    @input="markChanged('runninghub_app_asr')"
                  >
                    <template #prefix>
                      <span class="app-id-prefix">ID:</span>
                    </template>
                  </el-input>
                </div>
                <div class="app-footer">
                  <span class="usage-hint">用于将音频文件转换为文字内容</span>
                </div>
              </div>

              <!-- 文字转音频 TTS / 配音生成 - ⚠️ 两者为同一功能 -->
              <div class="app-config-item tts-dubbing-notice">
                <div class="app-header">
                  <div class="app-icon tts-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  </div>
                  <div class="app-info">
                    <h4>文字转音频 (TTS)</h4>
                    <span class="app-subtitle">Text-to-Speech / Voice Cloning</span>
                  </div>
                  <el-tag type="warning" size="small" effect="dark" style="margin-left: auto;">等同于配音</el-tag>
                </div>
                <div class="app-body">
                  <el-input
                    v-model="configs.runninghub.apps.tts"
                    placeholder="应用 ID"
                    size="default"
                    @input="handleTtsChange"
                  >
                    <template #prefix>
                      <span class="app-id-prefix">ID:</span>
                    </template>
                  </el-input>
                </div>
                <div class="app-footer">
                  <div class="notice-banner">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <span>⚠️ 本项目中 TTS 与配音（Voice Cloning）为同一功能</span>
                  </div>
                  <span class="usage-hint">用于将文字转换为语音音频、视频配音制作</span>
                </div>
              </div>

              <!-- 图片生成视频 -->
              <div class="app-config-item">
                <div class="app-header">
                  <div class="app-icon i2v-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18 4l2 4h-3l-2 4h-2l-2 4h-2l-2 4h-2l-2 4h-2l-2 4H9l-2-4H5l-2-4H2l2-4h2l2-4h2l2-4h2l2-4h2l2-4h2l2-4h2zM4 8h2l2 4h2l2 4h2l2 4h2l2-4h2l2-4h2l-2-4h-2l-2-4h-2l-2-4h-2l-2-4h-2L8 8H4z"/></svg>
                  </div>
                  <div class="app-info">
                    <h4>图片生成视频</h4>
                    <span class="app-subtitle">Image to Video</span>
                  </div>
                </div>
                <div class="app-body">
                  <el-input
                    v-model="configs.runninghub.apps.imageToVideo"
                    placeholder="应用 ID"
                    size="default"
                    @input="markChanged('runninghub_app_image_to_video')"
                  >
                    <template #prefix>
                      <span class="app-id-prefix">ID:</span>
                    </template>
                  </el-input>
                </div>
                <div class="app-footer">
                  <span class="usage-hint">根据静态图片生成动态视频内容</span>
                </div>
              </div>

              <!-- 视频生成视频 -->
              <div class="app-config-item">
                <div class="app-header">
                  <div class="app-icon v2v-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-5l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/></svg>
                  </div>
                  <div class="app-info">
                    <h4>视频生成视频</h4>
                    <span class="app-subtitle">Video to Video</span>
                  </div>
                </div>
                <div class="app-body">
                  <el-input
                    v-model="configs.runninghub.apps.videoToVideo"
                    placeholder="应用 ID"
                    size="default"
                    @input="markChanged('runninghub_app_video_to_video')"
                  >
                    <template #prefix>
                      <span class="app-id-prefix">ID:</span>
                    </template>
                  </el-input>
                </div>
                <div class="app-footer">
                  <span class="usage-hint">对现有视频进行风格迁移或效果转换</span>
                </div>
              </div>

              <!-- 语音转字幕 -->
              <div class="app-config-item">
                <div class="app-header">
                  <div class="app-icon subtitle-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </div>
                  <div class="app-info">
                    <h4>语音转字幕</h4>
                    <span class="app-subtitle">Audio to Subtitle (SRT/VTT)</span>
                  </div>
                </div>
                <div class="app-body">
                  <el-input
                    v-model="configs.runninghub.apps.subtitle"
                    placeholder="应用 ID"
                    size="default"
                    @input="markChanged('runninghub_app_subtitle')"
                  >
                    <template #prefix>
                      <span class="app-id-prefix">ID:</span>
                    </template>
                  </el-input>
                </div>
                <div class="app-footer">
                  <span class="usage-hint">将音频转换为带时间轴的 SRT/VTT 字幕文件</span>
                </div>
              </div>

              <!-- 配音生成 ⭐ 常用 - 与 TTS 为同一功能 -->
              <div class="app-config-item featured dubbing-tts-notice">
                <div class="app-header">
                  <div class="app-icon dubbing-icon">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5l.01 6c0 1.66 1.33 3 2.99 3zm5.29-3.71l-2.83-2.83C13.28 6.55 12.68 6 12 6c-.67 0-1.28.26-1.75.69l-2.76-2.76C8.37 3.13 10.07 2 12 2c2.62 0 4.89 1.56 5.93 3.81.19.38.31.79.38 1.23 0 .55-.45 1-1 1h-7c-.55 0-1-.45-1-1 0-.43.12-.84.32-1.21 1.03-2.25 2.73-3.81 5.35-3.81z"/><path d="M7 19h10v2H7z"/></svg>
                  </div>
                  <div class="app-info">
                    <h4>配音生成</h4>
                    <span class="app-subtitle">Voice Cloning & Dubbing / TTS</span>
                  </div>
                  <el-badge :value="'常用'" class="featured-badge" type="warning" />
                  <el-tag type="warning" size="small" effect="dark" style="margin-left: 8px;">等同于 TTS</el-tag>
                </div>
                <div class="app-body">
                  <el-input
                    v-model="configs.runninghub.apps.dubbing"
                    placeholder="应用 ID"
                    size="default"
                    @input="handleDubbingChange"
                  >
                    <template #prefix>
                      <span class="app-id-prefix">ID:</span>
                    </template>
                  </el-input>
                </div>
                <div class="app-footer">
                  <div class="notice-banner">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <span>⚠️ 本项目中配音与 TTS（文字转音频）为同一功能，修改任一即可同步</span>
                  </div>
                  <span class="usage-hint">基于音色样本生成带情感的语音，用于视频配音（等同于 TTS）</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="footer-info">
            <span class="info-icon">🎬</span>
            <span>RunningHub 主要用于<strong>音视频处理</strong>：配音、字幕、视频生成等</span>
          </div>
        </div>
      </div>

    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-actions">
      <div class="actions-left">
        <el-button 
          type="info" 
          plain 
          @click="testConnection"
          :loading="testing"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          测试连接
        </el-button>
        <el-button @click="exportConfig">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18h14v2H5z"/></svg>
          导出配置
        </el-button>
      </div>
      <div class="actions-right">
        <span class="last-sync-time" v-if="lastSyncTime">
          最后同步: {{ formatTime(lastSyncTime) }}
        </span>
      </div>
    </div>

    <!-- 测试结果对话框 -->
    <el-dialog
      v-model="showTestResult"
      title="🔍 连接测试结果"
      width="580px"
      destroy-on-close
    >
      <div class="test-result-content">
        <!-- 硅基流动测试结果 -->
        <div class="result-item" :class="{ 
          success: testResults.siliconflow === true, 
          error: testResults.siliconflow === false,
          warning: testResults.siliconflow === 'not_configured',
          loading: testResults.siliconflow === null
        }">
          <div class="result-icon" :class="{
            success: testResults.siliconflow === true,
            error: testResults.siliconflow === false,
            warning: testResults.siliconflow === 'not_configured',
            loading: testResults.siliconflow === null
          }">
            <!-- 成功图标 -->
            <svg v-if="testResults.siliconflow === true" viewBox="0 0 24 24" width="28" height="28" fill="#10b981"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <!-- 未配置图标 -->
            <svg v-else-if="testResults.siliconflow === 'not_configured'" viewBox="0 0 24 24" width="28" height="28" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" opacity=".3"/></svg>
            <!-- 失败图标 -->
            <svg v-else-if="testResults.siliconflow === false" viewBox="0 0 24 24" width="28" height="28" fill="#ef4444"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 7l5 5.59z"/></svg>
            <!-- 加载图标 -->
            <svg v-else viewBox="0 0 24 24" width="28" height="28" fill="#f59e0b" class="spin-icon"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8zm0 18a8 8 0 0 1-8-8H2A10 10 0 0 0 12 22v-2z"/><path d="M18 6l-4 4h3v6h-3l4 4 4-4h-3V10h-3z"/></svg>
          </div>
          <div class="result-details">
            <strong>硅基流动 SiliconFlow</strong>
            
            <!-- 成功状态 -->
            <p v-if="testResults.siliconflow === true" class="success-text">
              ✅ {{ testResults._siliconflowDetail || '连接成功，服务正常' }}
            </p>
            
            <!-- 未配置状态 -->
            <p v-else-if="testResults.siliconflow === 'not_configured'" class="warning-text">
              {{ testResults._siliconflowError || '⚠️ API 密钥未配置' }}
              <br>
              <span class="hint-text">💡 请在上方卡片中填写 API 密钥后再测试</span>
            </p>
            
            <!-- 失败状态 -->
            <p v-else-if="testResults.siliconflow === false" class="error-text">
              {{ testResults._siliconflowError || '❌ 连接失败，请检查配置' }}
            </p>
            
            <!-- 加载中 -->
            <p v-else class="loading-text">⏳ 正在测试连接...</p>

            <!-- 详细配置信息 -->
            <div class="config-info" v-if="testResults.siliconflow !== null">
              <span class="info-label">API 地址:</span>
              <code>{{ configs.siliconflow.baseUrl || '未配置' }}</code>
            </div>
          </div>
        </div>

        <!-- RunningHub 测试结果 -->
        <div class="result-item" :class="{ 
          success: testResults.runninghub === true, 
          error: testResults.runninghub === false,
          warning: testResults.runninghub === 'not_configured',
          loading: testResults.runninghub === null
        }">
          <div class="result-icon" :class="{
            success: testResults.runninghub === true,
            error: testResults.runninghub === false,
            warning: testResults.runninghub === 'not_configured',
            loading: testResults.runninghub === null
          }">
            <!-- 成功图标 -->
            <svg v-if="testResults.runninghub === true" viewBox="0 0 24 24" width="28" height="28" fill="#10b981"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <!-- 未配置图标 -->
            <svg v-else-if="testResults.runninghub === 'not_configured'" viewBox="0 0 24 24" width="28" height="28" fill="#f59e0b"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" opacity=".3"/></svg>
            <!-- 失败图标 -->
            <svg v-else-if="testResults.runninghub === false" viewBox="0 0 24 24" width="28" height="28" fill="#ef4444"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 7l5 5.59z"/></svg>
            <!-- 加载图标 -->
            <svg v-else viewBox="0 0 24 24" width="28" height="28" fill="#f59e0b" class="spin-icon"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8zm0 18a8 8 0 0 1-8-8H2A10 10 0 0 0 12 22v-2z"/><path d="M18 6l-4 4h3v6h-3l4 4 4-4h-3V10h-3z"/></svg>
          </div>
          <div class="result-details">
            <strong>RunningHub</strong>
            
            <!-- 成功状态 -->
            <p v-if="testResults.runninghub === true" class="success-text">
              ✅ {{ testResults._runninghubDetail || '连接成功，服务正常' }}
            </p>
            
            <!-- 未配置状态 -->
            <p v-else-if="testResults.runninghub === 'not_configured'" class="warning-text">
              {{ testResults._runninghubError || '⚠️ API 密钥未配置' }}
              <br>
              <span class="hint-text">💡 请在上方卡片中填写 API 密钥后再测试</span>
            </p>
            
            <!-- 失败状态 -->
            <p v-else-if="testResults.runninghub === false" class="error-text">
              {{ testResults._runninghubError || '❌ 连接失败，请检查配置' }}
            </p>
            
            <!-- 加载中 -->
            <p v-else class="loading-text">⏳ 正在测试连接...</p>

            <!-- 详细配置信息 -->
            <div class="config-info" v-if="testResults.runninghub !== null">
              <span class="info-label">平台地址:</span>
              <code>{{ configs.runninghub.baseUrl || '未配置' }}</code>
            </div>
          </div>
        </div>

        <!-- 测试建议 -->
        <div class="test-suggestions" v-if="!testResults.siliconflow || !testResults.runninghub">
          <h4>💡 排查建议：</h4>
          <ul>
            <li v-if="!configs.siliconflow.apiKey">请先填写硅基流动的 API 密钥</li>
            <li v-if="!configs.runninghub.apiKey">请先填写 RunningHub 的 API 密钥</li>
            <li>检查网络连接是否正常</li>
            <li>确认 API 地址是否正确（注意是否包含 /v1 等路径）</li>
            <li>检查 API 密钥是否有效且未过期</li>
            <li>如果遇到 CORS 错误，建议通过后端代理进行测试</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <el-button @click="showTestResult = false">关闭</el-button>
        <el-button type="primary" @click="testConnection" :loading="testing">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          重新测试
        </el-button>
      </template>
    </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const API_BASE = '/api/cloud-config'

const saving = ref(false)
const testing = ref(false)
const showTestResult = ref(false)
const lastSyncTime = ref(null)
const changeCount = ref(0)

const configs = reactive({
  siliconflow: {
    apiKey: '',
    baseUrl: 'https://api.siliconflow.cn/v1',        // ⚠️ 注意：没有 's' (siliconflow.cn 不是 https)
    defaultModel: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'     // ✅ 项目实际使用的模型
  },
  runninghub: {
    apiKey: '',
    baseUrl: 'https://www.runninghub.cn',
    apps: {
      asr: '2049522529517182978',           // 音频转文字 (ASR)
      tts: '2049527678209892354',             // 文字转音频 (TTS) ⚠️ 与配音为同一功能
      dubbing: '2049527678209892354',        // 配音生成 ⭐ (与 TTS 同一功能)
      imageToVideo: '2050230386843762690',  // 图片生成视频/数字人
      videoToVideo: '2050226856238043137',  // 视频生成视频
      subtitle: '2050542479962849282'       // SRT字幕生成
    }
  }
})

const testResults = reactive({
  siliconflow: null,  // null=未测试, true=成功, false=失败
  runninghub: null,   // null=未测试, true=成功, false=失败
  
  // 详细错误信息
  _siliconflowError: null,
  _siliconflowDetail: null,
  _runninghubError: null,
  _runninghubDetail: null
})

const hasChanges = computed(() => {
  const result = changeCount.value > 0
  console.log('🔍 检测更改状态:', { changeCount: changeCount.value, hasChanges: result })
  return result
})

onMounted(() => {
  console.log('🚀 组件已挂载，开始加载配置...')
  loadConfigs()
})

function markChanged(field) {
  console.log('✏️ 字段已修改:', field)
  changeCount.value++
  console.log('📊 当前更改计数:', changeCount.value, '→ 按钮应', changeCount.value > 0 ? '✅ 启用' : '❌ 禁用')
}

/**
 * TTS 输入变化处理 - 自动同步到配音
 * ⚠️ 本项目中 TTS 和配音为同一功能，修改任一即可
 */
function handleTtsChange(value) {
  markChanged('runninghub_app_tts')
  
  // 自动同步到配音配置（保持一致）
  if (value && value !== configs.runninghub.apps.dubbing) {
    configs.runninghub.apps.dubbing = value
    markChanged('runninghub_app_dubbing')
    
    console.log('🔄 TTS 已自动同步到配音:', value)
  }
}

/**
 * 配音输入变化处理 - 自动同步到 TTS
 * ⚠️ 本项目中配音和 TTS 为同一功能，修改任一即可
 */
function handleDubbingChange(value) {
  markChanged('runninghub_app_dubbing')
  
  // 自动同步到 TTS 配置（保持一致）
  if (value && value !== configs.runninghub.apps.tts) {
    configs.runninghub.apps.tts = value
    markChanged('runninghub_app_tts')
    
    console.log('🔄 配音已自动同步到 TTS:', value)
  }
}

async function loadConfigs() {
  try {
    const response = await fetch(API_BASE)
    const data = await response.json()

    if (data.success && data.data) {
      const configMap = {}
      
      // 构建配置映射表
      data.data.forEach(item => {
        configMap[item.configKey] = item.configValue || ''  // 确保值为字符串
      })

      console.log('📦 从后端加载的原始配置:', configMap)
      
      // 映射到本地配置对象（只在值非空时覆盖默认值）
      if (configMap['siliconflow_api_key']) {
        configs.siliconflow.apiKey = configMap['siliconflow_api_key']
        console.log('   ✅ 已加载硅基流动 API Key')
      } else {
        console.log('   ⚠️ 硅基流动 API Key 未配置（使用默认空值）')
      }
      
      if (configMap['siliconflow_base_url']) {
        configs.siliconflow.baseUrl = configMap['siliconflow_base_url']
      }
      if (configMap['siliconflow_default_model']) {
        configs.siliconflow.defaultModel = configMap['siliconflow_default_model']
      }

      if (configMap['runninghub_api_key']) {
        configs.runninghub.apiKey = configMap['runninghub_api_key']
        console.log('   ✅ 已加载 RunningHub API Key')
      } else {
        console.log('   ⚠️ RunningHub API Key 未配置（使用默认空值）')
      }
      
      if (configMap['runninghub_base_url']) {
        configs.runninghub.baseUrl = configMap['runninghub_base_url']
      }
      
      // 加载应用 ID 配置（保留默认值如果后端数据为空）
      if (configMap['runninghub_app_asr']) {
        configs.runninghub.apps.asr = configMap['runninghub_app_asr']
        console.log(`   ✅ ASR App ID: ${configMap['runninghub_app_asr']}`)
      }
      
      if (configMap['runninghub_app_tts']) {
        configs.runninghub.apps.tts = configMap['runninghub_app_tts']
        console.log(`   ✅ TTS App ID: ${configMap['runninghub_app_tts']}`)
      } else {
        console.log(`   ⚠️ TTS 使用默认值: ${configs.runninghub.apps.tts}`)
      }
      
      if (configMap['runninghub_app_image_to_video']) {
        configs.runninghub.apps.imageToVideo = configMap['runninghub_app_image_to_video']
        console.log(`   ✅ I2V App ID: ${configMap['runninghub_app_image_to_video']}`)
      }
      
      if (configMap['runninghub_app_video_to_video']) {
        configs.runninghub.apps.videoToVideo = configMap['runninghub_app_video_to_video']
        console.log(`   ✅ V2V App ID: ${configMap['runninghub_app_video_to_video']}`)
      }

      if (configMap['runninghub_app_subtitle']) {
        configs.runninghub.apps.subtitle = configMap['runninghub_app_subtitle']
        console.log(`   ✅ Subtitle App ID: ${configMap['runninghub_app_subtitle']}`)
      }
      
      if (configMap['runninghub_app_dubbing']) {
        configs.runninghub.apps.dubbing = configMap['runninghub_app_dubbing']
        console.log(`   ✅ 配音 App ID: ${configMap['runninghub_app_dubbing']}`)
      } else {
        console.log(`   ⚠️ 配音使用默认值: ${configs.runninghub.apps.dubbing}`)
      }

      lastSyncTime.value = new Date()
      changeCount.value = 0
      
      console.log('\n📊 当前配置状态:')
      console.log(`   硅基流动 API Key: ${configs.siliconflow.apiKey ? '✅ 已配置' : '❌ 未配置'}`)
      console.log(`   RunningHub API Key: ${configs.runninghub.apiKey ? '✅ 已配置' : '❌ 未配置'}`)
      console.log(`   TTS App ID: ${configs.runninghub.apps.tts || '(空)'}`)
      console.log(`   配音 App ID: ${configs.runninghub.apps.dubbing || '(空)'}`)
      console.log('✅ 配置加载完成')
    }
  } catch (error) {
    console.error('❌ 加载配置失败:', error)
    ElMessage.error('加载配置失败')
  }
}

async function handleSaveAll() {
  if (!hasChanges.value) {
    ElMessage.info('没有需要保存的更改')
    return
  }

  saving.value = true

  try {
    const configData = [
      // 硅基流动配置
      {
        category: 'api_provider',
        configKey: 'siliconflow_api_key',
        displayName: '硅基流动 API 密钥',
        configValue: configs.siliconflow.apiKey,
        isSensitive: true,
        valueType: 'string',
        description: 'SiliconFlow 平台的 API 访问密钥'
      },
      {
        category: 'api_provider',
        configKey: 'siliconflow_base_url',
        displayName: '硅基流动 API 地址',
        configValue: configs.siliconflow.baseUrl,
        isSensitive: false,
        valueType: 'string',
        description: 'SiliconFlow API 的基础 URL'
      },
      {
        category: 'model_config',
        configKey: 'siliconflow_default_model',
        displayName: '默认大语言模型',
        configValue: configs.siliconflow.defaultModel,
        isSensitive: false,
        valueType: 'string',
        description: '用于文案处理的默认 AI 模型'
      },

      // RunningHub 配置
      {
        category: 'api_provider',
        configKey: 'runninghub_api_key',
        displayName: 'RunningHub API 密钥',
        configValue: configs.runninghub.apiKey,
        isSensitive: true,
        valueType: 'string',
        description: 'RunningHub 平台的 API 访问密钥'
      },
      {
        category: 'api_provider',
        configKey: 'runninghub_base_url',
        displayName: 'RunningHub 平台地址',
        configValue: configs.runninghub.baseUrl,
        isSensitive: false,
        valueType: 'string',
        description: 'RunningHub 平台的基础 URL'
      },

      // AI 应用 ID 配置
      {
        category: 'app_config',
        configKey: 'runninghub_app_asr',
        displayName: '音频转文字应用 ID',
        configValue: configs.runninghub.apps.asr,
        isSensitive: false,
        valueType: 'string',
        description: 'ASR 应用的唯一标识符'
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_tts',
        displayName: '文字转音频应用 ID',
        configValue: configs.runninghub.apps.tts,
        isSensitive: false,
        valueType: 'string',
        description: 'TTS 应用的唯一标识符'
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_image_to_video',
        displayName: '图片生成视频应用 ID',
        configValue: configs.runninghub.apps.imageToVideo,
        isSensitive: false,
        valueType: 'string',
        description: 'I2V 应用的唯一标识符'
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_video_to_video',
        displayName: '视频生成视频应用 ID',
        configValue: configs.runninghub.apps.videoToVideo,
        isSensitive: false,
        valueType: 'string',
        description: 'V2V 应用的唯一标识符'
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_subtitle',
        displayName: '语音转字幕应用 ID',
        configValue: configs.runninghub.apps.subtitle,
        isSensitive: false,
        valueType: 'string',
        description: '语音转字幕应用的唯一标识符'
      },
      {
        category: 'app_config',
        configKey: 'runninghub_app_dubbing',
        displayName: '配音生成应用 ID',
        configValue: configs.runninghub.apps.dubbing,
        isSensitive: false,
        valueType: 'string',
        description: '配音生成应用的唯一标识符'
      }
    ]

    let successCount = 0
    
    for (const config of configData) {
      try {
        // 查找是否已存在
        const listResponse = await fetch(`${API_BASE}?configKey=${config.configKey}`)
        const listData = await listResponse.json()
        
        let saveResponse
        
        if (listData.success && listData.data.length > 0) {
          // 更新已有配置
          const existingId = listData.data[0].id
          saveResponse = await fetch(`${API_BASE}/${existingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          })
        } else {
          // 创建新配置
          saveResponse = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          })
        }

        if (saveResponse.ok) {
          successCount++
        } else {
          const errorData = await saveResponse.json().catch(() => ({}))
          console.error(`保存配置 ${config.configKey} 失败:`, saveResponse.status, errorData)
        }
      } catch (error) {
        console.error(`保存配置 ${config.configKey} 失败:`, error)
      }
    }

    if (successCount === configData.length) {
      ElMessage.success(`✅ 成功保存 ${successCount} 个配置项`)
      changeCount.value = 0
      lastSyncTime.value = new Date()
    } else {
      ElMessage.warning(`⚠️ 部分配置保存成功 (${successCount}/${configData.length})`)
    }
    
  } catch (error) {
    console.error('❌ 保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  
  // 重置结果
  testResults.siliconflow = null  // null 表示正在测试
  testResults.runninghub = null
  
  // 统计结果
  let successCount = 0
  let notConfiguredCount = 0
  let errorCount = 0
  
  try {
    // ========== 测试硅基流动 (SiliconFlow) ==========
    console.log('🔍 开始测试硅基流动连接...')
    
    if (!configs.siliconflow.apiKey) {
      testResults.siliconflow = 'not_configured'  // 特殊状态：未配置
      testResults._siliconflowError = '⚠️ API 密钥未配置'
      notConfiguredCount++
      console.warn('⚠️ 硅基流动：API 密钥未配置（请在上方填写）')
    } else if (!configs.siliconflow.baseUrl) {
      testResults.siliconflow = 'not_configured'
      testResults._siliconflowError = '⚠️ API 地址未配置'
      notConfiguredCount++
      console.warn('⚠️ 硅基流动：API 地址未配置')
    } else {
      try {
        // 使用 /models 端点测试（这是 OpenAI 兼容的标准端点）
        const sfUrl = configs.siliconflow.baseUrl.replace(/\/$/, '')  // 移除末尾斜杠
        
        console.log(`   请求地址: ${sfUrl}/models`)
        console.log(`   API Key: ${configs.siliconflow.apiKey.substring(0, 10)}...`)
        
        const response = await fetch(`${sfUrl}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${configs.siliconflow.apiKey}`,
            'Content-Type': 'application/json'
          },
          // 设置超时时间为 10 秒
          signal: AbortSignal.timeout(10000)
        })
        
        console.log(`   响应状态: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`   ✅ 成功！获取到 ${data.data?.length || 0} 个模型`)
          testResults.siliconflow = true
          testResults._siliconflowError = null
          testResults._siliconflowDetail = `连接成功，可用 ${data.data?.length || 0} 个模型`
        } else if (response.status === 401) {
          testResults.siliconflow = false
          testResults._siliconflowError = '❌ 认证失败 (401)：API 密钥无效或已过期'
          console.error('   ❌ 认证失败')
        } else if (response.status === 403) {
          testResults.siliconflow = false
          testResults._siliconflowError = '❌ 权限不足 (403)：该密钥无权访问此接口'
          console.error('   ❌ 权限不足')
        } else if (response.status === 429) {
          testResults.siliconflow = false
          testResults._siliconflowError = '⚠️ 请求过于频繁 (429)：请稍后重试'
          console.warn('   ⚠️ 请求频率限制')
        } else {
          const errorText = await response.text().catch(() => '')
          testResults.siliconflow = false
          testResults._siliconflowError = `❌ 请求失败 (${response.status}): ${errorText.substring(0, 100)}`
          console.error(`   ❌ HTTP ${response.status}:`, errorText)
        }
        
      } catch (error) {
        console.error('   ❌ 请求异常:', error.message)
        
        if (error.name === 'TimeoutError') {
          testResults.siliconflow = false
          testResults._siliconflowError = '❌ 连接超时：服务器响应时间过长（>10秒）'
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          testResults.siliconflow = false
          testResults._siliconflowError = '❌ 网络错误：无法连接到服务器，请检查网络或 URL 是否正确'
        } else if (error.message.includes('CORS')) {
          testResults.siliconflow = false
          testResults._siliconflowError = '❌ 跨域错误 (CORS)：浏览器阻止了跨域请求，建议通过后端代理测试'
        } else {
          testResults.siliconflow = false
          testResults._siliconflowError = `❌ 未知错误: ${error.message}`
        }
      }
    }

    // ========== 测试 RunningHub ==========
    console.log('\n🔍 开始测试 RunningHub 连接...')
    
    if (!configs.runninghub.apiKey) {
      testResults.runninghub = 'not_configured'  // 特殊状态：未配置
      testResults._runninghubError = '⚠️ API 密钥未配置'
      notConfiguredCount++
      console.warn('⚠️ RunningHub：API 密钥未配置（请在上方填写）')
    } else if (!configs.runninghub.baseUrl) {
      testResults.runninghub = 'not_configured'
      testResults._runninghubError = '⚠️ 平台地址未配置'
      notConfiguredCount++
      console.warn('⚠️ RunningHub：平台地址未配置')
    } else {
      try {
        // 使用 ai-app/info 端点测试（需要一个有效的 appId）
        const rhBaseUrl = configs.runninghub.baseUrl.replace(/\/$/, '')  // 移除末尾斜杠
        const testAppId = configs.runninghub.apps.dubbing || '2049527678209892354'  // 使用配音应用ID作为测试
        
        console.log(`   请求地址: ${rhBaseUrl}/task/openapi/ai-app/info`)
        console.log(`   API Key: ${configs.runninghub.apiKey.substring(0, 10)}...`)
        console.log(`   测试 App ID: ${testAppId}`)
        
        const response = await fetch(
          `${rhBaseUrl}/task/openapi/ai-app/info?apiKey=${configs.runninghub.apiKey}&webappId=${testAppId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${configs.runninghub.apiKey}`,  // ⚠️ 添加 Authorization 头
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
          }
        )
        
        console.log(`   响应状态: ${response.status} ${response.statusText}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`   ✅ 成功！应用名称: ${data.success?.appName || data.appName || '未知'}`)
          testResults.runninghub = true
          testResults._runninghubError = null
          testResults._runninghubDetail = `连接成功，应用 "${data.success?.appName || data.appName || '未知'}" 可用`
        } else if (response.status === 401) {
          testResults.runninghub = false
          testResults._runninghubError = '❌ 认证失败 (401)：API 密钥无效或已过期'
          console.error('   ❌ 认证失败')
        } else if (response.status === 403) {
          testResults.runninghub = false
          testResults._runninghubError = '❌ 权限不足 (403)：无权访问此应用'
          console.error('   ❌ 权限不足')
        } else if (response.status === 404) {
          testResults.runninghub = false
          testResults._runninghubError = '⚠️ 应用未找到 (404)：App ID 可能不正确，但平台连接正常'
          console.warn('   ⚠️ 应用未找到，但平台可访问')
          // 应用未找到说明平台是通的，只是 App ID 不对
          testResults.runninghub = true  // 标记为部分成功
          testResults._runninghubDetail = '平台连接正常，但测试的 App ID 无效'
        } else {
          const errorText = await response.text().catch(() => '')
          testResults.runninghub = false
          testResults._runninghubError = `❌ 请求失败 (${response.status}): ${errorText.substring(0, 100)}`
          console.error(`   ❌ HTTP ${response.status}:`, errorText)
        }
        
      } catch (error) {
        console.error('   ❌ 请求异常:', error.message)
        
        if (error.name === 'TimeoutError') {
          testResults.runninghub = false
          testResults._runninghubError = '❌ 连接超时：服务器响应时间过长（>10秒）'
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          testResults.runninghub = false
          testResults._runninghubError = '❌ 网络错误：无法连接到服务器，请检查网络或 URL 是否正确'
        } else if (error.message.includes('CORS')) {
          testResults.runninghub = false
          testResults._runninghubError = '❌ 跨域错误 (CORS)：浏览器阻止了跨域请求，建议通过后端代理测试'
        } else {
          testResults.runninghub = false
          testResults._runninghubError = `❌ 未知错误: ${error.message}`
        }
      }
    }

    // 显示结果对话框
    showTestResult.value = true
    
    // 智能总结提示
    const sfStatus = testResults.siliconflow
    const rhStatus = testResults.runninghub
    
    if (sfStatus === true && rhStatus === true) {
      ElMessage.success('✅ 所有服务连接正常！')
      successCount = 2
    } else if (sfStatus === 'not_configured' && rhStatus === 'not_configured') {
      ElMessage.warning('⚠️ 所有服务的 API 密钥未配置，请先填写配置后再测试')
    } else if (sfStatus === true || rhStatus === true || sfStatus === 'not_configured' || rhStatus === 'not_configured') {
      const messages = []
      
      if (sfStatus === true) messages.push('硅基流动 ✅')
      else if (sfStatus === 'not_configured') messages.push('硅基流动 ⚠️ 未配置')
      else if (sfStatus === false) { messages.push('硅基流动 ❌'); errorCount++ }
      
      if (rhStatus === true) messages.push('RunningHub ✅')
      else if (rhStatus === 'not_configured') messages.push('RunningHub ⚠️ 未配置')
      else if (rhStatus === false) { messages.push('RunningHub ❌'); errorCount++ }
      
      ElMessage.warning(`⚠️ ${messages.join('、')} - ${errorCount > 0 ? '有错误需要处理' : '部分服务未配置'}`)
    } else {
      ElMessage.error('❌ 所有服务连接失败，请检查 API 密钥和网络设置')
      errorCount = 2
    }
    
    console.log('\n📊 测试完成:')
    console.log(`   硅基流动: ${sfStatus === true ? '✅ 正常' : sfStatus === 'not_configured' ? '⚠️ 未配置' : '❌ 失败'}`)
    console.log(`   RunningHub: ${rhStatus === true ? '✅ 正常' : rhStatus === 'not_configured' ? '⚠️ 未配置' : '❌ 失败'}`)
    console.log(`   统计: 成功=${successCount}, 未配置=${notConfiguredCount}, 错误=${errorCount}`)
    
  } catch (error) {
    console.error('💥 测试连接过程发生严重错误:', error)
    ElMessage.error('测试连接过程发生异常，请查看控制台')
  } finally {
    testing.value = false
  }
}

function exportConfig() {
  const exportData = {
    version: '1.0.0',
    exportTime: new Date().toISOString(),
    providers: {
      siliconflow: {
        apiKey: configs.siliconflow.apiKey ? '[已配置]' : '[未配置]',
        baseUrl: configs.siliconflow.baseUrl,
        defaultModel: configs.siliconflow.defaultModel
      },
      runninghub: {
        apiKey: configs.runninghub.apiKey ? '[已配置]' : '[未配置]',
        baseUrl: configs.runninghub.baseUrl,
        apps: {
          asr: configs.runninghub.apps.asr || '[未配置]',
          tts: configs.runninghub.apps.tts || '[未配置]',
          dubbing: configs.runninghub.apps.dubbing || '[未配置]',
          imageToVideo: configs.runninghub.apps.imageToVideo || '[未配置]',
          videoToVideo: configs.runninghub.apps.videoToVideo || '[未配置]',
          subtitle: configs.runninghub.apps.subtitle || '[未配置]'
        }
      }
    }
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cloud-config-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('✅ 配置已导出')
}

function formatTime(date) {
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.cloud-config-manager {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  box-sizing: border-box;
}

.manager-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  overflow: visible;
  padding: 24px 28px;
  box-sizing: border-box;
}

/* 页面头部 */
.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 20px;
  flex-wrap: wrap;
}

.header-left h1 {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 6px 0;
}

.header-left p {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 更改提示横幅 */
.changes-banner {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(245, 87, 108, 0.15));
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 12px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fbbf24;
  font-size: 14px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 配置卡片容器 */
.config-cards {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 单个配置卡片 */
.config-card {
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.25);
  overflow: hidden;
  transition: all 0.3s ease;
}

.config-card:hover {
  border-color: rgba(102, 126, 234, 0.5);
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15);
}

/* 卡片头部 */
.card-header {
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.15);
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.provider-logo {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  font-family: monospace;
}

.sf-logo {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.rh-logo {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
}

.provider-details h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.provider-desc {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

/* 卡片主体 */
.card-body {
  padding: 24px 28px;
}

/* 配置区块 */
.config-section {
  margin-bottom: 28px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.section-title {
  color: rgba(255, 255, 255, 0.85);
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title svg {
  opacity: 0.7;
}

/* 配置网格 */
.config-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-item.full-width {
  grid-column: 1 / -1;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.label-text {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
}

.config-tip {
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px;
  line-height: 1.4;
}

/* AI 应用区域 */
.apps-section {
  background: rgba(245, 158, 11, 0.03);
  border: 1px solid rgba(245, 158, 11, 0.12);
  border-radius: 12px;
  padding: 20px !important;
  margin-top: 24px !important;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

/* 单个应用配置项 */
.app-config-item {
  background: rgba(30, 30, 60, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.25s ease;
  position: relative;
}

.app-config-item:hover {
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.app-config-item.featured {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.05);
}

/* TTS / 配音联动提示样式 */
.app-config-item.tts-dubbing-notice,
.app-config-item.dubbing-tts-notice {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.03);
}

.notice-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 11px;
  color: #fbbf24;
  line-height: 1.4;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  position: relative;
}

.app-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.asr-icon { background: linear-gradient(135deg, #10b981, #059669); }
.tts-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.i2v-icon { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.v2v-icon { background: linear-gradient(135deg, #ec4899, #db2777); }
.dubbing-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }

.app-info h4 {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 2px 0;
}

.app-subtitle {
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
}

.featured-badge {
  position: absolute;
  top: -4px;
  right: -4px;
}

.app-body {
  margin-bottom: 8px;
}

.app-id-prefix {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  font-weight: 600;
}

.app-footer {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.usage-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  line-height: 1.4;
}

/* 卡片底部 */
.card-footer {
  padding: 16px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.1);
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
}

.footer-info strong {
  color: #fff;
}

/* 底部操作栏 */
.bottom-actions {
  margin-top: 24px;
  padding: 20px 28px;
  background: rgba(30, 30, 60, 0.5);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.actions-left {
  display: flex;
  gap: 10px;
}

.actions-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.last-sync-time {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

/* 测试结果对话框 */
.test-result-content {
  padding: 8px 0;
}

.result-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.result-item:last-child {
  margin-bottom: 0;
}

.result-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-icon.success {
  background: rgba(16, 185, 129, 0.15);
}

.result-icon.error {
  background: rgba(239, 68, 68, 0.15);
}

.result-icon.warning {
  background: rgba(245, 158, 11, 0.12);
}

.result-details strong {
  color: #fff;
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

.result-details p {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  margin: 0;
}

/* 成功/失败/加载状态文本 */
.result-details .success-text {
  color: #10b981;
  font-weight: 500;
}

.result-details .error-text {
  color: #f87171;
  font-size: 12.5px;
  line-height: 1.5;
}

.result-details .warning-text {
  color: #fbbf24;
  font-size: 13px;
  line-height: 1.6;
}

.result-details .hint-text {
  display: inline-block;
  margin-top: 4px;
  padding: 4px 10px;
  background: rgba(245, 158, 11, 0.08);
  border-left: 3px solid #fbbf24;
  border-radius: 0 6px 6px 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.result-details .loading-text {
  color: #fbbf24;
  font-style: italic;
}

/* 配置信息显示 */
.config-info {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-label {
  color: rgba(255, 255, 255, 0.5);
}

.config-info code {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  word-break: break-all;
}

/* 加载中图标动画 */
.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 测试建议区域 */
.test-suggestions {
  margin-top: 16px;
  padding: 14px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 10px;
}

.test-suggestions h4 {
  color: #fbbf24;
  font-size: 13px;
  margin: 0 0 8px 0;
}

.test-suggestions ul {
  margin: 0;
  padding-left: 18px;
  list-style-type: disc;
}

.test-suggestions li {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  line-height: 1.7;
}

/* Element Plus 样式覆盖 */
:deep(.el-input__wrapper),
:deep(.el-select .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  box-shadow: none;
  transition: all 0.25s ease;
}

:deep(.el-input__wrapper:hover),
:deep(.el-select .el-input__wrapper:hover) {
  border-color: rgba(255, 255, 255, 0.25);
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-select .el-input.is-focus .el-input__wrapper) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}

:deep(.el-input__inner),
:deep(.el-select .el-input__inner) {
  color: #fff;
  font-size: 14px;
}

:deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.35);
}

:deep(.el-dialog) {
  background: rgba(25, 25, 55, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 16px;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: #fff;
  font-weight: 600;
  font-size: 16px;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .apps-grid {
    grid-template-columns: 1fr;
  }
  
  .config-header {
    flex-direction: column;
  }
  
  .header-right {
    width: 100%;
    justify-content: flex-start;
  }
  
  .bottom-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .actions-left,
  .actions-right {
    justify-content: center;
  }
}
</style>
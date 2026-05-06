const axios = require('axios');
const { getDynamicConfig } = require('../config/apiConfig');

class SiliconFlowAI {
  constructor(apiKey, baseUrl) {
    this._apiKey = apiKey;
    this._baseUrl = baseUrl;
    this._configPromise = null;
  }

  async _getConfig() {
    if (!this._configPromise) {
      this._configPromise = getDynamicConfig();
    }
    return this._configPromise;
  }

  async getApiKey() {
    if (this._apiKey) return this._apiKey;
    
    const config = await this._getConfig();
    return config.siliconFlow.apiKey || process.env.SILICONFLOW_API_KEY || '';
  }

  async getBaseUrl() {
    if (this._baseUrl) return this._baseUrl;
    
    const config = await this._getConfig();
    return config.siliconFlow.baseUrl || process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1';
  }

  async getDefaultModel() {
    const config = await this._getConfig();
    return config.siliconFlow.defaultModel || process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B';
  }

  async chatCompletion(messages, options = {}) {
    const model = options.model || await this.getDefaultModel();
    const maxTokens = options.maxTokens || 2048;
    const temperature = options.temperature ?? 0.7;
    const topP = options.topP ?? 0.7;
    const stream = options.stream || false;

    console.log(`🤖 硅基流动 Chat Completion`);
    console.log(`   模型: ${model}`);
    console.log(`   消息数: ${messages.length}`);
    console.log(`   temperature: ${temperature}`);
    console.log(`   maxTokens: ${maxTokens}`);

    try {
      const apiKey = await this.getApiKey();
      const baseUrl = await this.getBaseUrl();
      
      const response = await axios.post(`${baseUrl}/chat/completions`, {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        stream
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000,
        responseType: stream ? 'stream' : 'json'
      });

      if (stream) {
        return { success: true, stream: response.data };
      }

      const choice = response.data.choices?.[0];
      const usage = response.data.usage;

      console.log(`✅ 响应成功`);
      console.log(`   finish_reason: ${choice?.finish_reason}`);
      console.log(`   usage: prompt=${usage?.prompt_tokens}, completion=${usage?.completion_tokens}, total=${usage?.total_tokens}`);

      return {
        success: true,
        content: choice?.message?.content || '',
        role: choice?.message?.role || 'assistant',
        finishReason: choice?.finish_reason,
        usage: usage,
        model: response.data.model,
        id: response.data.id
      };
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      console.error(`❌ 硅基流动 API 调用失败: ${status}`);
      console.error(`   错误信息:`, data?.error?.message || error.message);

      return {
        success: false,
        error: data?.error?.message || error.message,
        status: status
      };
    }
  }

  async generateText(prompt, options = {}) {
    const systemPrompt = options.systemPrompt || '你是一个专业的文案助手，擅长创作和改写各种类型的文案。';
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const result = await this.chatCompletion(messages, options);

    if (result.success) {
      return {
        success: true,
        text: result.content,
        usage: result.usage
      };
    }

    return result;
  }

  async rewriteText(originalText, options = {}) {
    const style = options.style || '自然流畅';
    const prompt = options.prompt || '';

    const systemPrompt = `你是一个专业的文案改写助手。请根据用户的要求改写文案，保持原意的同时使文案更加${style}。只输出改写后的文案，不要添加任何解释或说明。`;

    const userPrompt = prompt
      ? `请按照以下要求改写文案：\n要求：${prompt}\n\n原文：${originalText}`
      : `请改写以下文案，使其更加${style}：\n\n${originalText}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const result = await this.chatCompletion(messages, {
      ...options,
      temperature: options.temperature ?? 0.8
    });

    if (result.success) {
      return {
        success: true,
        originalText,
        rewrittenText: result.content,
        usage: result.usage
      };
    }

    return result;
  }

  async checkForbidden(text, options = {}) {
    const systemPrompt = `你是一个内容安全审核助手。请检查以下文案是否包含违禁词、敏感内容或不当表述。只返回JSON格式的结果，不要添加任何解释。
格式：{"passed": true/false, "issues": ["问题1", "问题2"], "suggestion": "修改建议（如有问题）"}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ];

    const result = await this.chatCompletion(messages, {
      ...options,
      temperature: 0.1,
      maxTokens: 512
    });

    if (result.success) {
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            passed: parsed.passed ?? true,
            issues: parsed.issues || [],
            suggestion: parsed.suggestion || '',
            usage: result.usage
          };
        }
      } catch (parseError) {
        console.warn('⚠️ 解析审核结果失败:', parseError.message);
      }

      return {
        success: true,
        passed: true,
        issues: [],
        usage: result.usage
      };
    }

    return result;
  }

  async extractTopics(text, options = {}) {
    const systemPrompt = `你是一个文案分析助手。请从以下文案中提取关键主题和标签。只返回JSON格式的结果。
格式：{"topics": ["主题1", "主题2"], "tags": ["标签1", "标签2"], "summary": "一句话摘要"}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ];

    const result = await this.chatCompletion(messages, {
      ...options,
      temperature: 0.3,
      maxTokens: 512
    });

    if (result.success) {
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            topics: parsed.topics || [],
            tags: parsed.tags || [],
            summary: parsed.summary || '',
            usage: result.usage
          };
        }
      } catch (parseError) {
        console.warn('⚠️ 解析主题提取结果失败:', parseError.message);
      }

      return {
        success: true,
        topics: [],
        tags: [],
        summary: result.content.substring(0, 100),
        usage: result.usage
      };
    }

    return result;
  }

  getAvailableModels() {
    return [
      { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5-7B', description: '通义千问2.5 7B，快速响应' },
      { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen2.5-32B', description: '通义千问2.5 32B，均衡性能' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5-72B', description: '通义千问2.5 72B，高性能' },
      { id: 'deepseek-ai/DeepSeek-V2.5', name: 'DeepSeek-V2.5', description: '深度求索V2.5，通用对话' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1', description: '深度求索R1，推理增强' },
      { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4-9B', description: '智谱GLM-4 9B，中文优化' },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama-3.1-8B', description: 'Meta Llama 3.1 8B' },
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Llama-3.1-70B', description: 'Meta Llama 3.1 70B' }
    ];
  }
}

module.exports = SiliconFlowAI;
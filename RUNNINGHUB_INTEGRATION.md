# RunningHub API 集成指南

## 概述

本项目已集成 RunningHub 云 API，支持通过 AI 应用调用云端算力实现文字、音频、视频生成。

## 两种 API 调用方式

### 1. AI 应用 API（推荐）
```
POST https://www.runninghub.cn/task/openapi/ai-app/run
```
- 需要 WebApp ID
- 预设好的 AI 应用，配置简单
- 支持获取节点信息

### 2. 工作流 API（备用）
```
POST https://www.runninghub.cn/task/openapi/workflow/execute
```
- 需要 Workflow ID
- 适合自定义 ComfyUI 工作流

## 前置准备

### 1. 获取 API Key
1. 注册 RunningHub 账号
2. 开通基础版及以上会员
3. 进入「API 控制台」获取 32 位 API KEY

### 2. 获取 WebApp ID
1. 打开 AI 应用详情页
2. 地址栏 URL：`https://www.runninghub.cn/ai-detail/1937084629516193794`
3. 末尾数字即为 WebApp ID：`1937084629516193794`
4. **重要：AI 应用必须先在网页手动运行成功至少一次**

### 3. 获取节点参数信息
```
GET https://www.runninghub.cn/api/webapp/apiCallDemo?apiKey=xxx&webappId=xxx
```

返回示例：
```json
{
  "code": 0,
  "data": {
    "webappName": "文字生成应用",
    "nodeInfoList": [
      {
        "nodeId": "39",
        "nodeName": "LoadAudio",
        "fieldName": "audio",
        "fieldValue": "example.wav",
        "fieldType": "AUDIO",
        "description": "上传音频文件"
      },
      {
        "nodeId": "40",
        "nodeName": "TextOutput",
        "fieldName": "text",
        "fieldValue": "",
        "fieldType": "TEXT",
        "description": "输出文字"
      }
    ]
  }
}
```

## 核心 API 接口

### 1. 获取 AI 应用信息
```
GET /api/runninghub/ai-app/info?webappId=xxx
```
获取应用的节点列表和参数信息。

### 2. 上传文件
```
POST /api/runninghub/ai-app/upload
Content-Type: multipart/form-data

file: [文件数据]
```
返回：
```json
{
  "fileName": "api/xxxx.jpg",
  "fileType": "image"
}
```

### 3. 发起 AI 应用任务
```
POST /api/runninghub/ai-app/run
Content-Type: application/json

{
  "webappId": 123456789,
  "nodeInfoList": [
    {
      "nodeId": "39",
      "fieldName": "audio",
      "fieldValue": "api/xxxx.wav"
    }
  ],
  "instanceType": "default"
}
```

返回：
```json
{
  "success": true,
  "taskId": "1907035719658053634",
  "clientId": "14caa1db2110a81629c101b9bb4cb0ce",
  "taskStatus": "RUNNING"
}
```

### 4. 查询任务状态
```
GET /api/runninghub/ai-app/status?taskId=xxx
```

返回：
```json
{
  "success": true,
  "status": "SUCCESS",
  "outputs": [
    {
      "type": "text",
      "url": "https://xxx.com/output/result.txt"
    },
    {
      "type": "image",
      "url": "https://xxx.com/output/result.jpg"
    }
  ]
}
```

## 任务状态

| 状态 | 说明 |
|------|------|
| CREATE | 任务已创建 |
| QUEUED | 排队中 |
| RUNNING | 运行中 |
| SUCCESS | 成功完成 |
| FAILED | 失败 |

## 文件输出处理

任务完成后，返回的 `outputs` 数组包含所有输出文件：

```javascript
const processedResults = await runningHubAI.processOutputs(outputs, './output');
// processedResults 包含：
// - type: 文件类型 (text/image/audio/video)
// - url: 原始 CDN 链接
// - localPath: 本地保存路径
// - content: 文本文件内容（如果有）
```

### 支持的文件类型

| 类型 | 说明 | 处理方式 |
|------|------|----------|
| text | 文本文件 | 读取内容返回 |
| transcript | 转录文本 | 读取内容返回 |
| image | 图片 | 下载到本地 |
| audio | 音频 | 下载到本地 |
| video | 视频 | 下载到本地 |
| segments | 分段数据 | JSON 解析 |

## 配置步骤

### 1. 复制环境配置
```bash
cp .env.example .env
```

### 2. 编辑 .env 文件
```env
RUNNINGHUB_API_KEY=your_32_character_api_key_here

# AI 应用 ID（从 AI 应用详情页获取）
TEXT_GENERATION_APP_ID=
AUDIO_GENERATION_APP_ID=
VIDEO_GENERATION_APP_ID=
```

## 项目文件结构

```
backend/
├── config/
│   └── apiConfig.js        # API 配置
├── services/
│   ├── runningHubAI.js     # RunningHub AI 类封装
│   ├── textService.js      # 文字服务
│   ├── audioService.js     # 音频服务
│   └── videoService.js     # 视频服务
└── routes/
    └── runningHub.js       # RunningHub 路由
```

## 使用示例

### 1. 获取 AI 应用节点信息
```javascript
const result = await runningHubAI.getAIAppInfo(webappId);
console.log(result.nodeInfoList);
```

### 2. 执行 AI 应用并获取结果
```javascript
const result = await runningHubAI.runAIApp(webappId, nodeInfoList);
if (result.success) {
  const taskResult = await runningHubAI.waitForCompletion(result.taskId);
  if (taskResult.success) {
    const outputs = await runningHubAI.processOutputs(taskResult.outputs, './output');
    // 处理输出文件
  }
}
```

### 3. 上传本地文件
```javascript
const uploadResult = await runningHubAI.uploadFile('./local/audio.wav');
console.log(uploadResult.fileName); // "api/xxxx.wav"
```

## 注意事项

1. **AI 应用必须先在网页手动运行成功至少一次**
2. API Key 请勿泄露给第三方
3. 根据账户类型有不同的并发限制
4. 超时设置：默认 10 分钟，视频生成可延长至 30 分钟
5. 返回的文件会自动下载到 `./output/` 目录
6. 文本文件会同时返回内容，便于直接使用

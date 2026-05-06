# 拾光引擎 - 前后端分离架构设计文档

> **文档版本**: v1.0.0
> **创建日期**: 2026-05-04
> **最后更新**: 2026-05-04
> **状态**: 待评审

---

## 📋 目录

1. [项目概述](#1-项目概述)
2. [现状分析](#2-现状分析)
3. [目标架构设计](#3-目标架构设计)
4. [包拆分详细方案](#4-包拆分详细方案)
5. [核心技术问题解决方案](#5-核心技术问题解决方案)
6. [数据流与通信机制](#6-数据流与通信机制)
7. [文件存储策略](#7-文件存储策略)
8. [数据库设计](#8-数据库设计)
9. [API接口规范](#9-api接口规范)
10. [安全架构](#10-安全架构)
11. [部署架构](#11-部署架构)
12. [分阶段实施计划](#12-分阶段实施计划)
13. [工作优先级排序](#13-工作优先级排序)
14. [风险评估与缓解措施](#14-风险评估与缓解措施)
15. [附录](#15-附录)

---

## 1. 项目概述

### 1.1 产品定位

**拾光引擎**是一款AI驱动的数字人视频生成平台，核心功能包括：

- ✍️ **文案生成** - AI智能写作，支持多种风格
- 🎙️ **配音生成** - 文本转语音（TTS），多音色支持
- 🎬 **视频生成** - 数字人肖像视频合成
- ✂️ **视频剪辑** - 智能视频裁剪和处理
- 📤 **多平台发布** - 一键分发到抖音、快手、B站、小红书等平台

### 1.2 目标用户群体

| 用户类型 | 使用场景 | 对应客户端 |
|---------|---------|-----------|
| **个人创作者** | 本地创作，离线可用 | 桌面客户端 (Electron) |
| **中小企业** | 团队协作，云端同步 | 在线PC Web端 |
| **内容运营** | 移动端管理，快速发布 | 小程序/APP |
| **系统管理员** | 用户管理，系统配置 | 管理后台 |

### 1.3 业务需求

#### 核心业务流程

```
用户登录 → 选择创作模式 → 输入/上传素材 → AI处理 → 预览编辑 → 保存作品 → 发布到多平台
```

#### 多端一致性要求

1. **数据同步**: 所有端共享同一套用户数据、素材库、作品库
2. **功能对等**: 核心创作功能在所有端均可使用
3. **体验适配**: 各端UI/UX需符合平台特性（桌面端功能完整，移动端简化）
4. **离线支持**: 桌面客户端需支持完全离线使用

---

## 2. 现状分析

### 2.1 当前架构概览

```
shuziren/                          # 单体仓库
├── backend/                       # Node.js 后端服务
│   ├── server.js                  # Express 入口 (端口:3000)
│   ├── models/                    # 15个Sequelize模型
│   ├── routes/                    # 18个API路由组
│   ├── services/                  # 12个业务服务
│   ├── repositories/              # 14个数据访问层
│   └── assets/                    # 本地文件存储
│
├── frontend/                      # Vue3 前端 (三合一)
│   ├── src/
│   │   ├── App.vue                # PC Web端主界面
│   │   ├── AdminApp.vue           # 管理后台
│   │   ├── MobileApp.vue          # 移动端界面(预留)
│   │   └── components/            # 14个业务组件
│   ├── electron/                  # Electron桌面客户端
│   └── dist/                      # 构建产物
│
└── social-auto-upload/            # Python多平台发布系统
```

### 2.2 技术栈清单

#### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时环境 |
| Express | 4.18.x | Web框架 |
| Sequelize | 6.37.x | ORM框架 |
| SQLite3 / PostgreSQL | - | 数据库 |
| Multer | 1.4.x | 文件上传中间件 |
| FFmpeg | - | 音视频处理 |
| WebSocket (ws) | 8.20.x | 实时通信 |

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.4.x | 前端框架 |
| Vite | 5.1.x | 构建工具 |
| Element Plus | 2.5.x | UI组件库 |
| Electron | 28.3.x | 桌面客户端 |
| Axios | 1.6.x | HTTP客户端 |

#### 第三方服务集成

| 服务 | 用途 | 配置方式 |
|------|------|---------|
| RunningHub | AI文案/音频/视频生成 | API Key + App ID |
| SiliconFlow | 备用AI模型服务 | API Key |
| 微信/抖音/B站等 | 视频发布平台 | Cookie/OAuth |

### 2.3 现有模块清单

#### 数据模型 (15个)

```javascript
// 核心业务模型
User                    // 用户账号
Voice                   // 音色（TTS声音）
WorkLibrary             // 作品库
Project                 // 项目
Task                    // 任务记录

// 素材库模型
VoiceLibrary            // 音色库
DubbingLibrary          // 配音库
MusicLibrary            // 音乐库
PortraitLibrary         // 肖像库（图片/视频）
CopyLibrary             // 文案库
PromptLibrary           // 提示词模板库

// 发布相关
PublishAccount          // 发布平台账号
PublishTask             // 发布任务

// 系统配置
CloudConfig             // 云端配置
ApiLog                  // API调用日志
Avatar                  // 数字人头像
```

#### API路由组 (18个)

```
/api/audio              → 音频处理接口
/api/video              → 视频处理接口
/api/text               → 文本生成接口
/api/clips              → 视频剪辑接口
/api/models             → 模型信息接口
/api/users              → 用户管理接口
/api/voice-library      → 音色库CRUD
/api/dubbing-library    → 配音库CRUD
/api/music-library      → 音乐库CRUD
/api/portrait-library   → 肖像库CRUD
/api/copy-library       → 文案库CRUD
/api/prompt-library     → 提示词库CRUD
/api/work-library       → 作品库CRUD
/api/publish            → 发布任务接口
/api/runninghub         → RunningHub AI接口
/api/cloud-config       → 云端配置同步
/api/api-logs           → API日志查询
/assets/*               → 静态资源访问
/output/*               → 生成结果访问
```

#### 前端组件 (14个)

```vue
// 创作核心组件
AudioToText.vue         // 文案生成器
TextToSpeech.vue        // 配音生成器
AvatarVideo.vue         // 视频生成器
VideoClip.vue           // 视频剪辑器
VideoPublish.vue        // 视频发布器

// 管理组件
UserManager.vue         // 用户管理
CloudConfigManager.vue  // API配置管理
ApiLogManager.vue       // 日志查看器
SystemSettings.vue      // 系统设置
MaterialLibrary.vue     // 素材库管理
CRUDTable.vue           // 通用数据表格

// 其他组件
LoginRegister.vue       // 登录注册
TaskProgressDialog.vue  // 任务进度弹窗
```

#### 特殊功能模块

| 模块 | 文件位置 | 功能描述 |
|------|---------|---------|
| **配置同步服务** | `frontend/src/services/configSync.js` | 云端配置自动同步，5分钟间隔，本地缓存 |
| **任务管理系统** | `frontend/src/composables/useTaskManager.js` | 全局任务状态管理，跨组件通信 |
| **Electron主进程** | `frontend/electron/main.js` | 自动启动后端，数据库迁移，本地化路径管理 |
| **多平台发布** | `social-auto-upload/` | Python实现的抖音/快手/B站/小红书发布工具 |

### 2.4 当前架构优缺点分析

#### ✅ 优点

1. **功能完整性高**
   - 已实现完整的AI创作工作流
   - 包含管理后台和桌面客户端
   - 支持多平台发布

2. **开发效率好**
   - 单体仓库，代码复用率高
   - 前后端联调方便
   - 一键打包Electron应用

3. **技术选型合理**
   - Vue3 + Element Plus成熟稳定
   - Sequelize ORM灵活可扩展
   - Electron生态完善

#### ❌ 缺点与痛点

1. **耦合度过高**
   ```
   问题: 前端三合一(App/AdminApp/MobileApp)在同一项目
   影响: 无法独立迭代，构建体积大
   ```

2. **文件存储局限**
   ```
   问题: 所有文件存储在backend/assets/相对路径
   影响:
   - 桌面端无法真正离线（依赖服务器路径）
   - 无法支持云端OSS存储
   - 多端无法共享文件（路径不一致）
   ```

3. **扩展性不足**
   ```
   问题: 无独立的API网关和微服务拆分
   影响: 
   - 无法按需扩容特定服务
   - 小程序/H5无法直接复用
   - 团队协作困难
   ```

4. **部署复杂度高**
   ```
   问题: Electron打包包含完整后端代码
   影响:
   - 安装包体积大（~200MB+）
   - 更新需要重新打包整个应用
   - 无法热更新前端UI
   ```

5. **缺乏标准化API**
   ```
   问题: API接口无版本控制，无统一鉴权
   影响:
   - 多端接入困难
   - 安全性不足
   - 向后兼容性差
   ```

---

## 3. 目标架构设计

### 3.1 架构原则

1. **高内聚低耦合**: 每个包职责单一，边界清晰
2. **前后端彻底分离**: 通过RESTful API通信
3. **多端适配**: 一套后端服务多端复用
4. **渐进式演进**: 支持平滑迁移，不中断现有功能
5. **云原生就绪**: 支持容器化部署和弹性伸缩

### 3.2 目标架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        云端基础设施                                  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  API Gateway  │  │   Load       │  │    CDN/      │               │
│  │  (Nginx/Kong) │  │  Balancer    │  │   OSS        │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
│  ┌──────┴─────────────────┴─────────────────┴───────┐               │
│  │                  Backend Cluster               │               │
│  │                                                  │               │
│  │  ┌─────────────────────────────────────────┐    │               │
│  │  │         API Server (Node.js)            │    │               │
│  │  │  ┌─────────┐ ┌─────────┐ ┌──────────┐  │    │               │
│  │  │  │Auth     │ │Business │ │File      │  │    │               │
│  │  │  │Service  │ │Logic    │ │Service   │  │    │               │
│  │  │  └─────────┘ └─────────┘ └──────────┘  │    │               │
│  │  └──────────────────┬──────────────────────┘    │               │
│  │                     │                            │               │
│  │  ┌──────────────────┴──────────────────────┐    │               │
│  │  │         Data Layer                      │    │               │
│  │  │  ┌──────────┐  ┌──────────┐  ┌───────┐│    │               │
│  │  │  │PostgreSQL│  │Redis     │  │MinIO  ││    │               │
│  │  │  │(主数据库) │  │(缓存)    │  │(文件) ││    │               │
│  │  │  └──────────┘  └──────────┘  └───────┘│    │               │
│  │  └────────────────────────────────────────┘    │               │
│  └────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS API
┌─────────────────────────────────────────────────────────────────────┐
│                         客户端层                                      │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │ PC Web端    │  │ 管理后台    │  │ 小程序/APP  │  │桌面客户端 │  │
│  │ (Vue3 SPA)  │  │ (Vue3 SPA)  │  │ (uni-app)   │  │(Electron) │  │
│  │             │  │             │  │             │  │          │  │
│  │ • 完整功能  │  │ • 用户管理  │  │ • 移动优化  │  │ • 离线   │  │
│  │ • 团队协作  │  │ • 系统配置  │  │ • 快速发布  │  │ • 本地   │  │
│  │ • 高性能    │  │ • 数据统计  │  │ • 社交分享  │  │ • 完整   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬─────┘  │
│         │                │                │              │        │
│         └────────────────┴────────────────┴──────────────┘        │
│                              ↕                                     │
│                    统一API层 (Axios/Fetch)                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 包职责定义

| 包名 | 职责 | 技术栈 | 部署方式 |
|------|------|--------|---------|
| **backend** | 提供RESTful API，业务逻辑，数据处理 | Node.js + Express + Sequelize | Docker容器 / 云服务器 |
| **frontend-pc** | 在线PC Web端，面向C端用户 | Vue3 + Vite + Pinia | Nginx静态托管 / Vercel |
| **admin-panel** | B端管理后台，运营管理工具 | Vue3 + Vite + Element Plus | Nginx静态托管 |
| **frontend-miniapp** | 跨平台移动端（小程序/H5/APP） | uni-app (Vue3) | 各平台发布渠道 |
| **desktop-app** | 桌面客户端，支持离线使用 | Electron + Vue3 | NSIS/DMG安装包 |

---

## 4. 包拆分详细方案

### 4.1 backend - 后端API服务

#### 4.1.1 目录结构

```
packages/backend/
├── package.json
├── server.js                    # Express入口
├── .env.example                 # 环境变量模板
├── .env.production              # 生产环境配置
│
├── config/                      # 配置层
│   ├── database.js              # 数据库连接（SQLite/PostgreSQL）
│   ├── dbTypes.js               # 自定义数据类型
│   ├── storage.js               # ⭐ 新增：存储策略配置
│   ├── auth.js                  # ⭐ 新增：JWT鉴权配置
│   └── cors.js                  # CORS配置
│
├── models/                      # Sequelize ORM模型（保持不变）
│   ├── User.js
│   ├── Voice.js
│   ├── WorkLibrary.js
│   └── ... (共15个)
│
├── routes/                      # API路由层
│   ├── index.js                 # ⭐ 新增：路由聚合
│   ├── v1/                      # ⭐ 新增：API版本控制
│   │   ├── auth.js              # ⭐ 新增：认证路由
│   │   ├── users.js
│   │   ├── audio.js
│   │   ├── video.js
│   │   ├── text.js
│   │   ├── clips.js
│   │   ├── voice-library.js
│   │   ├── dubbing-library.js
│   │   ├── music-library.js
│   │   ├── portrait-library.js
│   │   ├── copy-library.js
│   │   ├── prompt-library.js
│   │   ├── work-library.js
│   │   ├── publish.js
│   │   ├── cloud-config.js
│   │   ├── api-logs.js
│   │   ├── models.js
│   │   └── runninghub.js
│   └── admin/                   # ⭐ 新增：管理后台专用路由
│       ├── users.js             # 用户管理（批量操作）
│       ├── statistics.js        # ⭐ 新增：统计数据
│       ├── system.js            # ⭐ 新增：系统配置
│       └── audit.js             # ⭐ 新增：审核中心
│
├── services/                    # 业务逻辑层
│   ├── authService.js           # ⭐ 新增：认证服务
│   ├── fileService.js           # ⭐ 新增：统一文件管理
│   ├── audioService.js
│   ├── videoService.js
│   ├── textService.js
│   ├── clipsService.js
│   ├── modelService.js
│   ├── publishService.js
│   ├── configService.js
│   ├── apiLogService.js
│   ├── runningHubAI.js
│   ├── runningHubApi.js
│   ├── siliconFlowAI.js
│   └── mockASR.js
│
├── repositories/                # 数据访问层（保持不变）
│   ├── UserRepository.js
│   ├── VoiceRepository.js
│   └── ... (共14个)
│
├── middleware/                  # ⭐ 新增：中间件层
│   ├── auth.js                  # JWT验证中间件
│   ├── rbac.js                  # ⭐ 新增：角色权限控制
│   ├── rateLimit.js             # ⭐ 新增：限流中间件
│   ├── errorHandler.js          # ⭐ 新增：全局错误处理
│   └── requestLogger.js         # ⭐ 新增：请求日志
│
├── utils/                       # ⭐ 新增：工具函数
│   ├── fileHelper.js            # 文件操作工具
│   ├── responseHelper.js        # ⭐ 新增：统一响应格式
│   ├── validator.js             # ⭐ 新增：数据校验
│   └── logger.js                # 日志工具
│
├── assets/                      # 本地文件存储（开发用）
│   ├── voices/
│   ├── dubbings/
│   ├── musics/
│   ├── portraits/
│   ├── uploads/
│   └── works/
│
├── output/                      # AI生成结果
│   ├── audio/
│   ├── video/
│   ├── covers/
│   └── frames/
│
├── data/                        # SQLite数据库（开发用）
│   └── database.sqlite
│
├── scripts/                     # 工具脚本
│   ├── initDefaultConfigs.js
│   └── migrateData.js           # ⭐ 新增：数据迁移脚本
│
├── tests/                       # ⭐ 新增：测试目录
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── e2e/                     # 端到端测试
│
├── Dockerfile                   # ⭐ 新增：Docker镜像
├── docker-compose.yml           # ⭐ 新增：编排配置
└── docs/                        # API文档
    └── api.md
```

#### 4.1.2 核心新增模块说明

**FileService - 统一文件管理**

```javascript
// services/fileService.js
class FileService {
  constructor() {
    this.mode = process.env.STORAGE_MODE || 'local'; // 'local' | 'cloud' | 'hybrid'
    
    if (this.mode === 'local') {
      this.basePath = process.env.LOCAL_MEDIA_PATH || './assets';
    } else if (this.mode === 'cloud') {
      this.ossConfig = {
        provider: process.env.OSS_PROVIDER, // 'aliyun' | 'tencent' | 'aws' | 'minio'
        bucket: process.env.OSS_BUCKET,
        region: process.env.OSS_REGION,
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        cdnDomain: process.env.OSS_CDN_DOMAIN
      };
    }
  }

  async saveFile(file, category, options = {}) {
    const fileKey = `${category}/${Date.now()}-${options.originalname || 'file'}`;
    
    if (this.mode === 'local') {
      const filePath = path.join(this.basePath, fileKey);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.rename(file.path, filePath);
      return { fileKey, url: `/api/files/${fileKey}`, storage: 'local' };
    } else {
      // 上传到OSS
      const ossUrl = await this.uploadToCloud(file.path, fileKey);
      return { fileKey, url: ossUrl, storage: 'cloud' };
    }
  }

  getFileUrl(fileKey, storageLocation) {
    if (storageLocation === 'local') {
      return `/api/files/${fileKey}`;
    } else {
      return `${this.ossConfig.cdnDomain}/${fileKey}`;
    }
  }

  getLocalFilePath(fileKey) {
    return path.join(this.basePath, fileKey);
  }
}
```

**AuthService - 认证授权**

```javascript
// services/authService.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.adminJwtSecret = process.env.ADMIN_JWT_SECRET;
  }

  async generateToken(user) {
    return jwt.sign(
      { userId: user.id, role: user.role || 'user' },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  async generateAdminToken(admin) {
    return jwt.sign(
      { userId: admin.id, role: 'admin' },
      this.adminJwtSecret,
      { expiresIn: '24h' }
    );
  }

  verifyToken(token, isAdmin = false) {
    const secret = isAdmin ? this.adminJwtSecret : this.jwtSecret;
    return jwt.verify(token, secret);
  }

  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}
```

#### 4.1.3 API版本控制策略

```
/v1/api/*          → 公开API（用户端使用）
/v1/admin/api/*    → 管理API（需要管理员权限）
/files/*           → 文件访问（动态解析）
```

**示例路由结构**:

```javascript
// routes/index.js
const express = require('express');
const router = express.Router();

// v1 公开API
router.use('/v1', require('./v1'));

// 管理后台API
router.use('/admin', require('./admin'));

// 文件访问路由（无版本号，长期稳定）
router.use('/files', require('../middleware/fileAccess'));

module.exports = router;
```

---

### 4.2 frontend-pc - 在线PC Web端

#### 4.2.1 目录结构

```
packages/frontend-pc/
├── package.json
├── vite.config.js
├── index.html
├── .env.development
├── .env.production
│
├── public/
│   ├── favicon.ico
│   └── logo.png
│
├── src/
│   ├── main.js
│   ├── App.vue
│   │
│   ├── router/                    # Vue Router
│   │   ├── index.js
│   │   └── routes/
│   │       ├── home.js
│   │       ├── create.js         # 创作页面
│   │       ├── library.js        # 素材库
│   │       ├── profile.js        # 个人中心
│   │       └── auth.js            # 登录注册
│   │
│   ├── stores/                    # Pinia状态管理
│   │   ├── user.js
│   │   ├── project.js
│   │   ├── file.js                # 上传文件状态
│   │   └── app.js
│   │
│   ├── api/                       # API请求层
│   │   ├── request.js             # Axios实例（带拦截器）
│   │   ├── authApi.js
│   │   ├── audioApi.js
│   │   ├── videoApi.js
│   │   ├── textApi.js
│   │   ├── libraryApi.js          # 素材库统一接口
│   │   ├── publishApi.js
│   │   └── userApi.js
│   │
│   ├── views/                     # 页面视图
│   │   ├── home/
│   │   │   └── HomeView.vue
│   │   ├── create/
│   │   │   ├── CreateView.vue    # 创作工作台
│   │   │   ├── TextGenView.vue
│   │   │   ├── AudioGenView.vue
│   │   │   ├── VideoGenView.vue
│   │   │   ├── ClipView.vue
│   │   │   └── PublishView.vue
│   │   ├── library/
│   │   │   ├── VoiceLibView.vue
│   │   │   ├── MaterialView.vue
│   │   │   └── WorkListView.vue
│   │   ├── profile/
│   │   │   └── ProfileView.vue
│   │   └── auth/
│   │       ├── LoginView.vue
│   │       └── RegisterView.vue
│   │
│   ├── components/                # 可复用组件
│   │   ├── common/
│   │   │   ├── FileUploader.vue   # 文件上传（支持拖拽）
│   │   │   ├── AudioPlayer.vue
│   │   │   ├── VideoPlayer.vue
│   │   │   ├── ImagePreview.vue
│   │   │   └── LoadingSpinner.vue
│   │   │
│   │   ├── create/
│   │   │   ├── PromptInput.vue   # AI提示词输入
│   │   │   ├── ModelSelector.vue  # 模型选择器
│   │   │   ├── TaskProgress.vue  # 任务进度条
│   │   │   └── PreviewPanel.vue  # 预览面板
│   │   │
│   │   └── layout/
│   │       ├── HeaderBar.vue
│   │       ├── SideNav.vue
│   │       └── FooterBar.vue
│   │
│   ├── composables/               # 组合式函数
│   │   ├── useTaskManager.js      # 从原项目提取
│   │   ├── useUpload.js           # 上传逻辑
│   │   └── useWebSocket.js        # ⭐ 新增：实时通信
│   │
│   ├── services/
│   │   └── configSync.js          # 从原项目提取
│   │
│   ├── utils/
│   │   ├── auth.js                # Token管理
│   │   ├── format.js              # 格式化函数
│   │   └── validators.js          # 表单验证
│   │
│   └── styles/
│       ├── variables.css          # CSS变量
│       ├── global.css
│       └── themes/
│           ├── dark.css           # 暗色主题
│           └── light.css          # 亮色主题
│
├── Dockerfile                     # Nginx镜像
├── nginx.conf                     # Nginx配置
└── README.md
```

#### 4.2.2 从原项目迁移的组件映射

| 原组件 | 新位置 | 改动程度 |
|--------|--------|---------|
| `App.vue` | `src/views/create/CreateView.vue` | 中等（拆分为子页面） |
| `AudioToText.vue` | `src/components/create/TextGenView.vue` | 小 |
| `TextToSpeech.vue` | `src/components/create/AudioGenView.vue` | 小 |
| `AvatarVideo.vue` | `src/components/create/VideoGenView.vue` | 小 |
| `VideoClip.vue` | `src/components/create/ClipView.vue` | 小 |
| `VideoPublish.vue` | `src/components/create/PublishView.vue` | 小 |
| `CRUDTable.vue` | `src/components/common/DataTable.vue` | 中等（增强） |
| `LoginRegister.vue` | `src/views/auth/LoginView.vue` | 小 |
| `TaskProgressDialog.vue` | `src/components/create/TaskProgress.vue` | 小 |
| `configSync.js` | `services/configSync.js` | 无 |
| `useTaskManager.js` | `composables/useTaskManager.js` | 无 |

---

### 4.3 admin-panel - 管理后台

#### 4.3.1 目录结构

```
packages/admin-panel/
├── package.json
├── vite.config.js
├── index.html
├── .env.development
├── .env.production
│
├── public/
│
├── src/
│   ├── main.js
│   ├── App.vue
│   │
│   ├── router/
│   │   ├── index.js
│   │   └── routes/
│   │       ├── dashboard.js
│   │       ├── users.js
│   │       ├── content.js
│   │       ├── system.js
│   │       ├── statistics.js
│   │       └── audit.js
│   │
│   ├── layouts/
│   │   ├── AdminLayout.vue        # 主布局
│   │   ├── Sidebar.vue            # 左侧菜单
│   │   ├── HeaderBar.vue          # 顶栏
│   │   └── TagsView.vue           # 标签导航
│   │
│   ├── views/
│   │   ├── login/
│   │   │   └── Login.vue
│   │   │
│   │   ├── dashboard/
│   │   │   └── Dashboard.vue      # 数据概览
│   │   │
│   │   ├── users/
│   │   │   ├── UserList.vue       # 用户列表
│   │   │   ├── UserDetail.vue     # 用户详情
│   │   │   └── UserEdit.vue       # 编辑用户
│   │   │
│   │   ├── content/
│   │   │   ├── WorkLibrary.vue    # 作品管理
│   │   │   ├── MaterialManage.vue # 素材管理
│   │   │   └── PromptLib.vue      # 提示词管理
│   │   │
│   │   ├── system/
│   │   │   ├── ModelConfig.vue    # AI模型配置
│   │   │   ├── StorageConfig.vue  # 存储配置
│   │   │   ├── RolePermission.vue # 权限管理
│   │   │   └── SystemLog.vue      # 操作日志
│   │   │
│   │   ├── statistics/
│   │   │   ├── UserStats.vue      # 用户统计
│   │   │   ├── ContentStats.vue   # 内容统计
│   │   │   └── ApiCallStats.vue   # API调用量
│   │   │
│   │   └── audit/
│   │       ├── PendingReview.vue # 待审核
│   │       └── ReportedContent.vue# 举报处理
│   │
│   ├── components/
│   │   ├── DataTable.vue          # 通用表格
│   │   ├── SearchForm.vue         # 搜索表单
│   │   ├── StatCard.vue           # 统计卡片
│   │   ├── FilePreview.vue        # 文件预览
│   │   └── RichTextEditor.vue     # 富文本编辑器
│   │
│   ├── api/
│   │   ├── request.js
│   │   ├── userApi.js
│   │   ├── contentApi.js
│   │   ├── systemApi.js
│   │   ├── statsApi.js
│   │   └── auditApi.js
│   │
│   ├── stores/
│   │   ├── user.js
│   │   ├── permission.js          # 权限路由
│   │   └── app.js
│   │
│   ├── utils/
│   │   ├── auth.js
│   │   ├── permission.js          # 权限指令
│   │   └── download.js            # 导出工具
│   │
│   ├── directives/
│   │   ├── permission.js           # v-permission
│   │   └── clipboard.js            # v-copy
│   │
│   └── styles/
│       ├── variables.scss
│       └── admin.scss
│
├── Dockerfile
└── nginx.conf
```

#### 4.3.2 从原项目迁移的组件映射

| 原组件 | 新位置 | 改动程度 |
|--------|--------|---------|
| `AdminApp.vue` | `layouts/AdminLayout.vue` + 多个views | 大（重构为多页面） |
| `UserManager.vue` | `views/users/UserList.vue` | 中等（增强功能） |
| `CloudConfigManager.vue` | `views/system/ModelConfig.vue` | 中等（扩展配置项） |
| `ApiLogManager.vue` | `views/system/SystemLog.vue` | 小 |
| `SystemSettings.vue` | `views/system/` (多个页面) | 大（拆分） |

---

### 4.4 frontend-miniapp - 小程序/移动端

#### 4.4.1 目录结构

```
packages/frontend-miniapp/
├── package.json
├── manifest.json                 # uni-app配置
├── pages.json                    # 页面路由配置
├── uni.scss                      # 全局样式
│
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── pages.json
│   │
│   ├── api/
│   │   ├── request.js            # 封装uni.request
│   │   ├── index.js
│   │   └── modules/
│   │       ├── auth.js
│   │       ├── work.js
│   │       └── publish.js
│   │
│   ├── pages/
│   │   ├── index/
│   │   │   └── index.vue         # 首页
│   │   │
│   │   ├── create/
│   │   │   ├── create.vue        # 快速创作
│   │   │   ├── text.vue          # 文案生成
│   │   │   └── audio.vue         # 配音生成
│   │   │
│   │   ├── library/
│   │   │   ├── works.vue         # 我的作品
│   │   │   └── materials.vue     # 素材库
│   │   │
│   │   ├── publish/
│   │   │   └── publish.vue       # 发布页
│   │   │
│   │   └── profile/
│   │       ├── profile.vue       # 个人中心
│   │       └── settings.vue      # 设置
│   │
│   ├── components/
│   │   ├── MiniPlayer.vue        # 迷你播放器
│   │   ├── FilePicker.vue        # 文件选择器
│   │   ├── TaskCard.vue          # 任务卡片
│   │   └── ShareSheet.vue        # 分享面板
│   │
│   ├── stores/
│   │   ├── user.js
│   │   └── app.js
│   │
│   ├── utils/
│   │   ├── auth.js
│   │   ├── storage.js            # 本地存储封装
│   │   └── share.js              # 分享工具
│   │
│   └── styles/
│       ├── common.scss
│       └── variables.scss
│
├── static/                       # 静态资源
│
└── build/                        # 构建输出
    ├── mp-weixin/                # 微信小程序
    ├── mp-alipay/                # 支付宝小程序
    ├── h5/                       # H5版本
    └── app/                      # APP安装包
```

#### 4.4.2 平台特性适配

| 平台 | 特殊处理 | 限制 |
|------|---------|------|
| **微信小程序** | wx.login授权、wx.chooseMedia选择媒体 | 包大小≤2MB，必须HTTPS |
| **支付宝小程序** | my.login、my.chooseImage | 类似微信限制 |
| **H5** | 可使用完整Web API | 需要适配移动端布局 |
| **APP** | 可调用原生能力 | 需要原生插件支持 |

---

### 4.5 desktop-app - 桌面客户端

#### 4.5.1 目录结构

```
packages/desktop-app/
├── package.json
├── electron-builder.yml         # 打包配置（替代package.json中的build字段）
│
├── main/                        # Electron主进程
│   ├── index.js                 # 主入口
│   ├── ipcHandlers.js           # IPC通信处理
│   ├── updater.js               # ⭐ 新增：自动更新
│   ├── tray.js                  # ⭐ 新增：系统托盘
│   └── fileManager.js           # ⭐ 新增：本地文件管理
│
├── preload/                     # 预加载脚本
│   └── index.js
│
├── src/                         # 渲染进程（复用frontend-pc代码）
│   ├── main.js
│   ├── App.vue
│   ├── views/                   # 直接引用或适配pc端views
│   ├── electron/                # Electron专属功能
│   │   ├── useElectronAPI.js    # 组合式函数
│   │   ├── LocalFileAccess.vue  # 本地文件访问组件
│   │   └── OfflineIndicator.vue # 离线状态指示
│   ├── api/
│   │   ├── request.js           # 增强版（支持本地缓存）
│   │   └── localApi.js          # ⭐ 新增：本地API
│   └── stores/
│       └── offlineStore.js      # ⭐ 新增：离线状态管理
│
├── resources/                   # 打包资源
│   ├── icon.ico                 # Windows图标
│   ├── icon.icns                # macOS图标
│   ├── icon.png                 # Linux图标
│   └── installer.nsis           # NSIS安装脚本
│
├── release/                     # 输出目录
│   ├── *.exe                    # Windows安装包
│   ├── *.dmg                    # macOS安装包
│   └── *.AppImage               # Linux安装包
│
└── README.md
```

#### 4.5.2 Electron增强功能

**本地文件协议**

```javascript
// main/fileManager.js
const { protocol } = require('electron');

function registerLocalMediaProtocol(app) {
  protocol.registerBufferProtocol('local-media', (request, callback) => {
    const url = request.url.replace('local-media://', '');
    const filePath = path.join(app.getPath('userData'), 'media', url);
    
    fs.readFile(filePath).then(data => {
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = getMimeType(ext);
      callback({ mimeType, data });
    }).catch(err => {
      console.error('读取本地文件失败:', err);
      callback({ error: -324 }); // FILE_NOT_FOUND
    });
  });
}

function getLocalMediaURL(fileKey) {
  return `local-media://${fileKey}`;
}
```

**IPC通信接口**

```javascript
// main/ipcHandlers.js
ipcMain.handle('save-local-file', async (event, { buffer, filename, category }) => {
  const mediaDir = path.join(app.getPath('userData'), 'media', category);
  const filePath = path.join(mediaDir, filename);
  
  await fs.promises.mkdir(mediaDir, { recursive: true });
  await fs.promises.writeFile(filePath, Buffer.from(buffer));
  
  return { success: true, path: filePath, key: `${category}/${filename}` };
});

ipcMain.handle('read-local-file', async (event, fileKey) => {
  const filePath = path.join(app.getPath('userData'), 'media', fileKey);
  
  try {
    const data = await fs.promises.readFile(filePath);
    return { success: true, data: data.toString('base64') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});
```

---

## 5. 核心技术问题解决方案

### 5.1 文件存储与数据库路径问题

#### 问题本质

```
现状：
- 数据库存的是相对路径字符串: "voices/12345-audio.wav"
- 后端通过绝对路径拼接: path.join(__dirname, 'assets', audioPath)
- 前端通过HTTP访问: http://localhost:3000/assets/voices/xxx.wav

挑战：
- 桌面端文件在用户本地目录 %APPDATA%/media/
- Web端文件在服务器 /data/media/ 或 OSS
- 小程序只能通过临时URL访问
- 不同环境的绝对路径完全不同
```

#### 解决方案：三层抽象架构

```
┌─────────────────────────────────────────────────────┐
│                  应用层 (Application)                │
│  只关心 fileKey 和业务逻辑，不关心物理路径              │
│  例: work.audioFileKey = "audio/20260504-test.wav"   │
└──────────────────────┬──────────────────────────────┘
                       │ 调用
┌──────────────────────▼──────────────────────────────┐
│               服务层 (FileService)                   │
│  根据 storageLocation 字段决定使用哪种策略             │
│                                                      │
│  getFileUrl(fileKey, location):                      │
│    - location='local' → /api/files/{fileKey}         │
│    - location='cloud' → https://cdn.xxx/{fileKey}    │
│    - location='desktop' → local-media://{fileKey}    │
└──────────────────────┬──────────────────────────────┘
                       │ 执行
┌──────────────────────▼──────────────────────────────┐
│               存储层 (Storage Adapter)                │
│                                                      │
│  LocalAdapter:  → 文件系统读写                        │
│  CloudAdapter:  → OSS SDK上传下载                     │
│  DesktopAdapter → Electron IPC通信                   │
└─────────────────────────────────────────────────────┘
```

#### 数据库模型改造

```javascript
// models/WorkLibrary.js (改造后)
const WorkLibrary = sequelize.define('WorkLibrary', {
  // ... 其他字段保持不变
  
  // ⭐ 改造：增加存储位置标记
  audioFileKey: {
    type: DataTypes.STRING(500),
    comment: '文件标识key',
    example: 'audio/1777823577361.wav'
  },
  videoFileKey: {
    type: DataTypes.STRING(500),
    comment: '文件标识key'
  },
  coverFileKey: {
    type: DataTypes.STRING(500),
    comment: '文件标识key'
  },
  
  // ⭐ 新增：存储位置枚举
  storageLocation: {
    type: DataTypes.ENUM('local', 'cloud', 'desktop'),
    defaultValue: 'local',
    comment: '文件实际存储位置'
  },
  
  // 兼容旧字段（过渡期保留）
  audioPath: {
    type: DataTypes.STRING(500),
    comment: '[废弃] 兼容旧数据'
  }
});

// 数据迁移钩子：自动转换旧格式
WorkLibrary.afterFind((results) => {
  if (!Array.isArray(results)) results = [results];
  
  results.forEach(work => {
    // 如果有旧的audioPath但没新的audioFileKey，自动转换
    if (work.audioPath && !work.audioFileKey) {
      work.audioFileKey = work.audioPath.replace(/^\.\//, '');
      work.storageLocation = 'local';
    }
  });
});
```

#### 多端文件访问示例

```javascript
// 场景1：PC Web端播放音频
async function playAudioOnPC(fileKey, storageLocation) {
  const response = await fetch(`/api/files/${fileKey}`, {
    headers: { 'X-Client-Type': 'web' }
  });
  const blob = await response.blob();
  audioElement.src = URL.createObjectURL(blob);
}

// 场景2：桌面端播放本地音频
async function playAudioOnDesktop(fileKey) {
  // 使用自定义协议直接读取本地文件
  audioElement.src = `local-media://${fileKey}`;
}

// 场景3：小程序播放远程音频
async function playAudioOnMiniApp(fileKey, cdnUrl) {
  // 小程序必须使用HTTPS URL
  innerAudioContext.src = cdnUrl;
  innerAudioContext.play();
}

// 场景4：上传文件（根据客户端类型自动选择存储）
async function uploadFile(file, clientType) {
  let result;
  
  if (clientType === 'desktop') {
    // 桌面端：保存到本地
    result = await window.electronAPI.saveLocalFile(file);
  } else {
    // Web/小程序：上传到服务器
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    result = await res.json();
  }
  
  // 统一返回fileKey给数据库
  return result.fileKey;
}
```

---

## 6. 数据流与通信机制

### 6.1 统一API响应格式

```javascript
// 成功响应
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": 1714822800000
}

// 错误响应
{
  "code": 40001,
  "message": "参数错误：缺少必填字段title",
  "error": "ValidationError",
  "timestamp": 1714822800000
}

// 分页响应
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [...],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 6.2 错误码规范

| 错误码范围 | 含义 | 示例 |
|-----------|------|------|
| 20000-29999 | 成功 | 200: 操作成功 |
| 40000-49999 | 客户端错误 | 40001: 参数错误, 40100: 未认证, 40300: 无权限 |
| 50000-59999 | 服务端错误 | 50001: 内部错误, 50300: 服务不可用 |
| 60000-69999 | 业务错误 | 60001: 用户不存在, 60002: 文件不存在 |

### 6.3 WebSocket实时通信（可选）

```javascript
// 用于AI任务进度推送
// 连接地址: wss://api.shuziren.com/ws/tasks/{taskId}

// 服务端推送格式
{
  "type": "task_progress",
  "taskId": "uuid",
  "status": "processing",  // pending | processing | completed | failed
  "progress": 65,          // 0-100
  "message": "正在生成视频中...",
  "result": null
}

// 客户端监听
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateProgressBar(data.progress);
};
```

---

## 7. 文件存储策略

### 7.1 存储模式对比

| 特性 | Local模式 | Cloud模式 | Hybrid混合模式 |
|------|----------|----------|---------------|
| **适用场景** | 开发/桌面端 | 生产/Web端 | 多端并存 |
| **存储位置** | 服务器磁盘 | OSS/S3 | 按需选择 |
| **访问速度** | 最快 | 取决于CDN | 智能路由 |
| **成本** | 低（硬件成本） | 按流量付费 | 灵活 |
| **离线支持** | ✅ 完全支持 | ❌ 不支持 | 部分支持 |
| **扩展性** | 差 | 优秀 | 良好 |
| **推荐度** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 7.2 推荐方案：Hybrid混合模式

```
规则：
1. 桌面端上传的文件 → 存储到本地 (storageLocation='desktop')
2. Web端上传的小文件(<10MB) → 存储到服务器本地 ('local')
3. Web端上传的大文件(≥10MB) → 直接上传到OSS ('cloud')
4. 小程序上传的文件 → 必须走OSS ('cloud')
5. AI生成的结果文件 → 默认服务器本地，可配置转存OSS
```

### 7.3 OSS配置示例

```env
# .env.production (云存储配置)
STORAGE_MODE=hybrid

# 阿里云OSS配置
OSS_PROVIDER=aliyun
OSS_BUCKET=shuziren-media
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=LTAI***
OSS_ACCESS_KEY_SECRET=***
OSS_CDN_URL=https://cdn.shuziren.com

# 文件分类存储路径
OSS_PATH_AUDIO=audio/
OSS_PATH_VIDEO=video/
OSS_PATH_IMAGE=image/
OSS_PATH_DOCUMENT=document/

# 本地存储配置（用于桌面端和小文件）
LOCAL_MEDIA_PATH=/data/shuziren/media
MAX_LOCAL_FILE_SIZE=10485760  # 10MB
```

---

## 8. 数据库设计

### 8.1 数据库选型

| 环境 | 推荐数据库 | 原因 |
|------|-----------|------|
| **开发/桌面端** | SQLite | 零配置、嵌入式、单文件 |
| **生产环境** | PostgreSQL | 并发性能好、JSON支持、地理空间 |
| **缓存层** | Redis | 会话存储、限流计数、热点数据 |

### 8.2 ER关系图（核心实体）

```
User (用户)
├── id, username, password, phone, email, nickname, avatar
├── status, lightParticles, lastLoginAt, createdAt
├── 1:N → Voice (音色)
├── 1:N → WorkLibrary (作品)
├── 1:N → Project (项目)
└── 1:N → PublishAccount (发布账号)

WorkLibrary (作品)
├── id, userId, title, description, content
├── audioFileKey, videoFileKey, coverFileKey  ← ⭐ 改造后
├── storageLocation                             ← ⭐ 新增
├── status, duration, size, tags, category
├── viewCount, likeCount, shareCount, wordCount
├── sourceType, voiceId, portraitId
└── N:1 → User

VoiceLibrary (素材库基类)
├── id, userId, fileName, fileSize, fileUrl/fileKey
├── duration, description, isPublic, usageCount
├── storageLocation                              ← ⭐ 新增
└── 继承: VoiceLibrary, DubbingLibrary, MusicLibrary, PortraitLibrary
```

### 8.3 数据库迁移策略

```bash
# Phase 1: 保持SQLite兼容（过渡期）
# 不改变表结构，只增加新字段

# Phase 2: 生产环境切换PostgreSQL
# 使用Sequelize的sync({ alter: true })自动迁移

# Phase 3: 数据量增大后考虑分库分表
# 按userId哈希分片
```

---

## 9. API接口规范

### 9.1 RESTful API设计原则

```
GET    /v1/api/resources       → 获取资源列表
GET    /v1/api/resources/:id   → 获取单个资源
POST   /v1/api/resources       → 创建资源
PUT    /v1/api/resources/:id   → 更新资源
DELETE /v1/api/resources/:id   → 删除资源
```

### 9.2 核心API清单（V1版本）

#### 认证模块 (`/v1/auth`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | 否 |
| POST | `/login` | 用户登录 | 否 |
| POST | `/logout` | 退出登录 | 是 |
| GET | `/me` | 获取当前用户信息 | 是 |
| PUT | `/me/password` | 修改密码 | 是 |

#### 文件模块 (`/v1/files`) ⭐ 新增

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/upload` | 上传文件（返回fileKey） | 是 |
| GET | `/:category/:filename` | 获取文件（动态解析） | 是 |
| DELETE | `/:fileKey` | 删除文件 | 是 |

#### 作品模块 (`/v1/work-library`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/` | 获取作品列表（支持分页筛选） | 是 |
| POST | `/` | 创建作品 | 是 |
| GET | `/:id` | 获取作品详情 | 是 |
| PUT | `/:id` | 更新作品 | 是 |
| DELETE | `/:id` | 删除作品 | 是 |

#### 管理后台API (`/admin`) ⭐ 新增

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/users` | 用户列表（含统计） | admin |
| PUT | `/users/:id/status` | 启用/禁用用户 | admin |
| GET | `/statistics/overview` | 数据总览 | admin |
| GET | `/statistics/users` | 用户增长趋势 | admin |
| GET | `/system/storage` | 存储用量统计 | super_admin |
| PUT | `/system/config` | 修改系统配置 | super_admin |

---

## 10. 安全架构

### 10.1 认证方案

#### JWT Token认证流程

```
1. 用户登录 → 后端验证 → 签发JWT Token（有效期7天）
2. 前端存储Token（localStorage / cookie）
3. 每次请求携带Header: Authorization: Bearer <token>
4. 后端中间件验证Token → 注入req.user → 放行/拒绝
5. Token过期 → 返回401 → 前端跳转登录页
```

#### Token结构

```json
{
  "userId": "uuid",
  "username": "zhangsan",
  "role": "user",           // user | admin | super_admin
  "iat": 1714822800,        // 签发时间
  "exp": 1715427600         // 过期时间
}
```

### 10.2 权限控制（RBAC）

#### 角色定义

| 角色 | 权限范围 | 适用场景 |
|------|---------|---------|
| **user** | 只能操作自己的数据 | 普通用户 |
| **vip_user** | user权限 + 高级功能 | 付费用户 |
| **operator** | 用户管理 + 内容审核 | 运营人员 |
| **admin** | 全部配置（除危险操作） | 系统管理员 |
| **super_admin** | 所有权限（含删除） | 超级管理员 |

#### 权限中间件示例

```javascript
// middleware/rbac.js
const rbac = {
  'user': ['read:own', 'create:own', 'update:own'],
  'vip_user': ['user', 'export:data'],
  'operator': ['read:all', 'update:user_status', 'audit:content'],
  'admin': ['operator', 'config:system', 'view:stats'],
  'super_admin': ['admin', 'delete:any', 'danger:operations']
};

function requireRole(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        code: 40300,
        message: '权限不足，需要角色: ' + allowedRoles.join(',')
      });
    }
    
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const rolePermissions = rbac[userRole] || [];
    
    if (!rolePermissions.includes(permission)) {
      return res.status(403).json({
        code: 40301,
        message: '缺少权限: ' + permission
      });
    }
    
    next();
  };
}
```

### 10.3 其他安全措施

| 措施 | 实现方式 | 重要级别 |
|------|---------|---------|
| **HTTPS强制** | Nginx配置SSL证书 | 🔴 必须 |
| **CORS限制** | 仅允许信任域名 | 🔴 必须 |
| **SQL注入防护** | Sequelize参数化查询 | 🔴 必须 |
| **XSS防护** | 前端输入过滤 + CSP头 | 🟡 重要 |
| **CSRF防护** | SameSite Cookie + Token | 🟡 重要 |
| **速率限制** | express-rate-limit | 🟡 重要 |
| **文件上传限制** | 类型白名单 + 大小限制 | 🔴 必须 |
| **敏感数据加密** | 密码bcrypt、Token加密存储 | 🔴 必须 |
| **操作日志** | 记录关键操作 | 🟡 重要 |

---

## 11. 部署架构

### 11.1 开发环境部署

```bash
# 方案A：Monorepo本地开发（推荐初期）
git clone <repo>
cd shuziren-monorepo

# 终端1: 启动后端
cd packages/backend
npm install
npm run dev  # → http://localhost:3000

# 终端2: 启动PC前端
cd packages/frontend-pc
npm install
npm run dev  # → http://localhost:5173

# 终端3: 启动管理后台
cd packages/admin-panel
npm install
npm run dev  # → http://localhost:5174
```

### 11.2 生产环境部署（Docker Compose）

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 后端API服务
  backend:
    build: ./packages/backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_DIALECT=postgres
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=shuziren
      - DB_USER=postgres
      - DB_PASS=${DB_PASSWORD}
      - STORAGE_MODE=hybrid
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data/media:/app/assets  # 本地文件存储
    restart: unless-stopped

  # PostgreSQL数据库
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: shuziren
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Redis缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # MinIO对象存储（可选，替代商业OSS）
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"   # API端口
      - "9001:9001"   # 管理界面
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    restart: unless-stopped

  # PC前端（Nginx）
  frontend-pc:
    build: ./packages/frontend-pc
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  # 管理后台（Nginx）
  admin-panel:
    build: ./packages/admin-panel
    ports:
      - "81:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 11.3 桌面客户端打包

```bash
# Windows
cd packages/desktop-app
npm run build:win
# → release/拾光引擎-Setup-x64.exe

# macOS
npm run build:mac
# → release/拾光引擎.dmg

# Linux
npm run build:linux
# → release/拾光引擎.AppImage
```

---

## 12. 分阶段实施计划

### 总体时间估算：8-12周（2-3个月）

```
时间轴 →

Week 1-2    Week 3-4    Week 5-6    Week 7-8    Week 9-10   Week 11-12
   │           │           │           │           │           │
   ▼           ▼           ▼           ▼           ▼           ▼
┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐
│Phase│   │Phase│   │Phase│   │Phase│   │Phase│   │Phase│
│  1  │   │  2  │   │  3  │   │  4  │   │  5  │   │  6  │
└─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘
基础     核心       增强       移动端    桌面端    优化
设施     功能       功能       开发      完善      上线
```

---

## 13. 工作优先级排序

### 🔴 P0 - 最高优先级（必须先完成）

> **目标**: 解决核心痛点，建立基础设施

| 序号 | 任务 | 预估工时 | 依赖关系 | 交付物 |
|------|------|---------|---------|--------|
| **P0-1** | **创建Monorepo项目骨架** | 4h | 无 | Git仓库初始化、workspace配置、TurboRepo设置 |
| **P0-2** | **后端FileService实现** | 8h | P0-1 | 统一文件管理服务、Local/Cloud双适配器 |
| **P0-3** | **后端AuthService实现** | 6h | P0-1 | JWT签发验证、密码加密、中间件 |
| **P0-4** | **数据库模型改造（增加fileKey字段）** | 6h | P0-2 | WorkLibrary等模型增加storageLocation字段 |
| **P0-5** | **统一API响应格式 + 错误处理中间件** | 4h | P0-1 | responseHelper.js、errorHandler.js |
| **P0-6** | **Docker化后端服务** | 4h | P0-1~5 | Dockerfile、docker-compose.yml（基础版） |

**小计**: 32小时（约4个工作日）

**验收标准**:
- ✅ 后端可通过Docker一键启动
- ✅ API返回统一的JSON格式
- ✅ 文件上传返回fileKey而非硬编码路径
- ✅ JWT认证流程跑通

---

### 🟠 P1 - 高优先级（核心功能迁移）

> **目标**: 完成PC Web端和管理后台的基本功能

| 序号 | 任务 | 预估工时 | 依赖关系 | 交付物 |
|------|------|---------|---------|--------|
| **P1-1** | **提取frontend-pc项目** | 8h | P0完成 | Vue3+Vite脚手架、路由配置、API层 |
| **P1-2** | **迁移核心创作组件** (AudioToText, TextToSpeech, AvatarVideo) | 16h | P1-1 | 5个Views页面 + 通用组件 |
| **P1-3** | **提取admin-panel项目** | 8h | P0完成 | 管理后台脚手架、布局框架 |
| **P1-4** | **迁移管理后台组件** (UserManager, CloudConfigManager, ApiLogManager) | 12h | P1-3 | 5个管理页面 + CRUDTable增强 |
| **P1-5** | **对接后端API（联调测试）** | 8h | P1-2, P1-4 | 前后端联调、Bug修复 |
| **P1-6** | **配置管理功能完善** | 4h | P1-4 | 管理后台可在线修改AI模型配置 |

**小计**: 56小时（约7个工作日）

**验收标准**:
- ✅ PC Web端可完成完整的创作流程（文案→配音→视频→发布）
- ✅ 管理后台可管理用户、查看日志、配置API
- ✅ 前后端分离部署成功

---

### 🟡 P2 - 中优先级（增强功能）

> **目标**: 提升用户体验和系统能力

| 序号 | 任务 | 预估工时 | 依赖关系 | 交付物 |
|------|------|---------|---------|--------|
| **P2-1** | **实现RBAC权限系统** | 8h | P1-4 | Role模型、权限中间件、管理后台角色分配 |
| **P2-2** | **数据统计仪表盘** | 12h | P2-1 | ECharts图表、用户增长曲线、内容统计 |
| **P2-3** | **OSS云存储集成** | 8h | P0-2 | 阿里云OSS SDK、文件直传、CDN配置 |
| **P2-4** | **文件访问API优化（Range请求、缓存）** | 6h | P0-2 | 断点续传、浏览器缓存、CDN加速 |
| **P2-5** | **WebSocket实时任务推送** | 8h | P0-1 | 任务进度实时更新、连接管理 |
| **P2-6** | **操作审计日志** | 6h | P2-1 | 记录管理员操作、用户敏感行为 |

**小计**: 48小时（约6个工作日）

**验收标准**:
- ✅ 不同角色看到不同菜单和按钮
- ✅ 管理后台有可视化数据报表
- ✅ 大文件上传到OSS，访问速度提升
- ✅ AI任务进度实时显示，无需轮询

---

### 🟢 P3 - 低优先级（移动端开发） ✅ 已完成

> **目标**: 覆盖移动端用户场景

| 序号 | 任务 | 状态 | 交付物 |
|------|------|------|--------|
| **P3-1** | **搭建uni-app项目** | ✅ 完成 | 项目初始化、TabBar配置、页面骨架、rollup兼容性修复 |
| **P3-2** | **实现核心页面（首页、创作、作品、我的）** | ✅ 完成 | 4个主要页面、移动端适配UI、任务进度、统计数据 |
| **P3-3** | **小程序特有功能（微信登录、分享）** | ✅ 完成 | 微信一键登录、onShareAppMessage、onShareTimeline |
| **P3-4** | **H5版本适配** | ✅ 完成 | 响应式布局、浏览器兼容、安全区域适配、PC端最大宽度 |
| **P3-5** | **各平台打包发布** | ✅ 完成 | 微信小程序包、H5部署、Dockerfile、Nginx配置 |

**验收标准**:
- ✅ 微信小程序可正常使用核心功能
- ✅ H5版本可在手机浏览器访问
- ✅ 支持微信授权登录
- ✅ H5构建成功（`npx uni build -p h5`）
- ✅ 微信小程序构建成功（`npx uni build -p mp-weixin`）
- ✅ Docker部署配置就绪

---

### 🔵 P4 - 桌面端增强 ✅ 已完成

> **目标**: 打造完整的桌面客户端体验

| 序号 | 任务 | 状态 | 交付物 |
|------|------|------|--------|
| **P4-1** | **完善Electron桌面端项目** | ✅ 完成 | 主进程/渲染进程分离、窗口管理、后端端口冲突处理 |
| **P4-2** | **实现本地文件管理系统** | ✅ 完成 | local-media://协议、IPC通信、copyToMediaDir、数据库迁移 |
| **P4-3** | **离线模式支持** | ✅ 完成 | 离线队列（JSON持久化）、API拦截自动入队、启动时自动同步 |
| **P4-4** | **自动更新机制** | ✅ 完成 | electron-updater、下载进度、安装提示、版本检查 |
| **P4-5** | **系统托盘 + 开机自启** | ✅ 完成 | 托盘菜单、双击恢复、最小化到托盘、开机自启设置 |
| **P4-6** | **安装包打包优化** | ✅ 完成 | NSIS中文安装、文件关联、macOS entitlements、portable版、包体积优化 |

**验收标准**:
- ✅ 桌面端支持离线操作队列（自动保存+恢复同步）
- ✅ 音视频文件保存在用户目录，重装不丢失
- ✅ 支持自动更新，无需手动下载
- ✅ 关闭窗口最小化到托盘，支持开机自启
- ✅ NSIS安装器支持中文、文件关联、自定义协议

---

### ⚪ P5 - 优化与上线 ✅ 已完成

> **目标**: 生产环境准备和性能优化

| 序号 | 任务 | 状态 | 交付物 |
|------|------|------|--------|
| **P5-1** | **性能优化** | ✅ 完成 | Terser压缩+代码分割（vue-vendor/element-plus/shared-components/axios独立chunk）、CSS代码分割、生产环境关闭sourcemap |
| **P5-2** | **数据库优化** | ✅ 完成 | 连接池配置（SQLite 5/PostgreSQL 20）、17个索引覆盖核心表、ANALYZE统计更新、生产环境关闭SQL日志 |
| **P5-3** | **监控告警系统** | ✅ 完成 | PM2进程管理（ecosystem.config.js）、增强健康检查（CPU/内存/数据库/WS在线数）、日志管理 |
| **P5-4** | **CI/CD流水线** | ✅ 完成 | GitHub Actions（lint+test→并行构建→Docker推送→SSH部署）、artifact缓存 |
| **P5-5** | **生产环境部署** | ✅ 完成 | docker-compose.prod.yml（PostgreSQL+健康检查）、Nginx反向代理（SSL+HTTP2+4域名路由+Gzip+安全头）、部署脚本 |
| **P5-6** | **运维手册与部署指南** | ✅ 完成 | 一键部署脚本（deploy.sh）、生产环境.env模板、SSL配置模板 |

**验收标准**:
- ✅ 前端代码分割，首屏加载优化
- ✅ 数据库索引优化，查询性能提升
- ✅ PM2进程管理+健康检查端点
- ✅ CI/CD自动化构建部署
- ✅ 生产环境Docker+Nginx+SSL配置就绪
- ✅ 一键部署脚本

---

### 📊 优先级总结

| 优先级 | 任务数 | 总工时 | 占比 | 建议时间 |
|--------|-------|--------|------|---------|
| **P0** | 6个 | 32h | 10% | 第1周 |
| **P1** | 6个 | 56h | 18% | 第2-3周 |
| **P2** | 6个 | 48h | 15% | 第4-5周 |
| **P3** | 5个 | 52h | 16% | 第6-7周 |
| **P4** | 6个 | 54h | 17% | 第8-9周 |
| **P5** | 6个 | 48h | 15% | 第10-11周 |
| **合计** | **35个** | **290h** | **100%** | **约11-12周** |

---

## 14. 风险评估与缓解措施

### 14.1 技术风险

| 风险 | 可能性 | 影响程度 | 缓解措施 |
|------|--------|---------|---------|
| **数据迁移丢失** | 中 | 🔴 高 | 先备份、写迁移脚本、灰度验证 |
| **前后端接口不兼容** | 高 | 🟠 中 | API版本控制、契约测试、Mock数据 |
| **性能下降** | 中 | 🟠 中 | 压力测试、缓存策略、数据库优化 |
| **Electron兼容性问题** | 中 | 🟡 低 | 多平台测试、降级方案 |
| **OSS费用超预期** | 低 | 🟡 低 | 设置配额报警、定期清理、生命周期策略 |

### 14.2 进度风险

| 风险 | 可能性 | 缓解措施 |
|------|--------|---------|
| **工期延期** | 高 | 敏捷开发、每两周一个Milestone、及时调整范围 |
| **需求变更** | 中 | 变更评估流程、影响分析、优先级重排 |
| **人员变动** | 低 | 代码规范、充分文档、知识共享 |

### 14.3 回滚方案

每个Phase完成后打Git Tag：

```bash
git tag -a v1.0.0-phase1 -m "完成P0: 基础设施"
git tag -a v1.1.0-phase2 -m "完成P1: 核心功能"

# 如需回滚
git checkout v1.0.0-phase1
docker-compose down
docker-compose up -d  # 回退到上一稳定版本
```

---

## 15. 附录

### 15.1 技术栈对比参考

| 维度 | Vue3 + Vite | React + Next.js | Angular |
|------|-------------|-----------------|---------|
| 学习曲线 | ⭐⭐ 平缓 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 陡峭 |
| 生态丰富度 | ⭐⭐⭐⭐ 丰富 | ⭐⭐⭐⭐⭐ 最丰富 | ⭐⭐⭐ 一般 |
| 性能 | ⭐⭐⭐⭐⭐ 极快 | ⭐⭐⭐⭐ 很快 | ⭐⭐⭐ 较快 |
| 适合场景 | 中小型项目 | 大型复杂应用 | 企业级应用 |
| **推荐度** | ✅ **首选** | 备选 | 不推荐 |

### 15.2 推荐学习资源

- **Vue3官方文档**: https://cn.vuejs.org/
- **Electron文档**: https://www.electronjs.org/docs
- **uni-app文档**: https://uniapp.dcloud.net.cn/
- **Sequelize文档**: https://sequelize.org/master/
- **Docker最佳实践**: https://docs.docker.com/

### 15.3 术语表

| 术语 | 解释 |
|------|------|
| **Monorepo** | 单一仓库管理多个包的项目组织方式 |
| **FileKey** | 文件的唯一标识符，如 "audio/20260504-test.wav" |
| **Storage Location** | 文件实际存储位置枚举值：local/cloud/desktop |
| **RBAC** | 基于角色的访问控制（Role-Based Access Control） |
| **JWT** | JSON Web Token，一种轻量级的身份认证方案 |
| **OSS** | Object Storage Service，对象存储服务 |
| **IPC** | Inter-Process Communication，进程间通信（Electron主进程与渲染进程） |

### 15.4 变更记录

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|---------|
| v1.0.0 | 2026-05-04 | AI Assistant | 初始版本，完整架构设计 |

---

## 📝 文档结束

> **下一步行动**: 
> 1. 组织团队评审此架构文档
> 2. 确认优先级排序是否合理
> 3. 开始执行P0阶段任务
> 4. 每周更新进度并调整计划

**联系方式**: 如有问题请查阅代码仓库或联系项目负责人

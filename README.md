# 拾光引擎 (ShiGuang Engine) - Monorepo

> AI驱动的数字人视频生成平台 - 前后端分离架构

## 📦 项目结构

```
shuziren-monorepo/
├── packages/                    # 所有子包
│   ├── backend/                 # 后端API服务 (Node.js + Express)
│   ├── frontend-pc/             # PC Web前端 (Vue3 + Vite)
│   ├── admin-panel/             # 管理后台 (Vue3 + Element Plus)
│   ├── frontend-miniapp/        # 移动端 (uni-app)
│   └── desktop-app/             # 桌面客户端 (Electron)
├── docker/                      # Docker配置
├── docs/                        # 项目文档
├── ARCHITECTURE.md              # 架构设计文档
└── package.json                 # 根package.json (workspaces)
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm run install:all
```

### 开发模式

```bash
# 启动后端服务 (端口: 3000)
npm run dev:backend

# 启动PC Web端 (端口: 5173)
npm run dev:pc

# 启动管理后台 (端口: 5174)
npm run dev:admin

# 启动移动端H5版本
npm run dev:miniapp

# 启动桌面客户端
npm run dev:desktop
```

### 生产构建

```bash
# 构建所有包
npm run build:all

# 单独构建某个包
npm run build:backend
npm run build:pc
npm run build:admin
npm run build:miniapp
npm run build:desktop
```

### Docker部署

```bash
# 启动所有服务
npm run docker:up

# 停止所有服务
npm run docker:down
```

## 📚 文档

- [架构设计文档](./ARCHITECTURE.md) - 完整的架构说明和实施计划
- [API接口文档](./docs/api.md) - API接口规范（待补充）
- [部署指南](./docs/deploy.md) - 部署和运维指南（待补充）

## 🛠️ 技术栈

| 层级 | 技术选型 |
|------|---------|
| **后端** | Node.js, Express, Sequelize, SQLite/PostgreSQL |
| **PC前端** | Vue3, Vite, Pinia, Element Plus |
| **管理后台** | Vue3, Vite, Element Plus, ECharts |
| **移动端** | uni-app, Vue3 |
| **桌面端** | Electron, Vue3 |
| **数据库** | SQLite (开发), PostgreSQL (生产) |
| **缓存** | Redis |
| **文件存储** | 本地 / OSS (阿里云/腾讯云/AWS S3) |

## 📝 开发规范

### Git提交规范

- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具链变更

### 分支策略

- `main` - 主分支，生产环境代码
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复分支

## 👥 团队协作

- 代码审查：所有PR需要至少1人review
- CI/CD：自动化测试和构建
- 文档优先：新功能必须同步更新文档

## 📄 License

MIT License

---

**维护团队**: ShuZiRen Team  
**最后更新**: 2026-05-04

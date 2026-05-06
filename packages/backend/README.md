# 拾光引擎后端API服务

## 描述

Node.js + Express + Sequelize 构建的RESTful API服务，为所有前端提供统一的数据接口。

## 目录结构

```
packages/backend/
├── server.js              # Express入口
├── config/                # 配置层
│   ├── database.js        # 数据库连接
│   ├── storage.js         # 存储策略配置
│   └── auth.js            # JWT配置
├── models/                # Sequelize ORM模型 (15个)
├── routes/                # API路由层
│   ├── v1/               # V1版本公开API
│   └── admin/            # 管理后台专用API
├── services/              # 业务逻辑层
├── repositories/          # 数据访问层
├── middleware/            # 中间件 (认证、限流、错误处理)
├── utils/                 # 工具函数
├── assets/                # 本地文件存储
└── output/                # AI生成结果
```

## 快速开始

```bash
cd packages/backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库等信息
npm run dev
```

服务将在 http://localhost:3000 启动

## API文档

- 公开API: `/v1/api/*`
- 管理API: `/admin/api/*`
- 文件访问: `/files/*`

详细接口文档请查看 [ARCHITECTURE.md](../../ARCHITECTURE.md)

## 环境变量

详见 `.env.example` 文件

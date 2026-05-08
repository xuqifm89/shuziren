# 拾光引擎 - 服务器部署指南 (Ubuntu 22.04 + Docker 26)

## 架构概览

```
                    ┌─────────────────────────────────────────┐
                    │           Ubuntu 22.04 Server           │
                    │              Docker 26                  │
                    │                                         │
  :80  ──────────► │  ┌─────────┐   ┌──────────────┐        │
                    │  │  Nginx  │──►│ frontend-pc  │        │
  :8080 ─────────► │  │(reverse │──►│ admin-panel  │        │
  :8081 ─────────► │  │  proxy) │──►│ frontend-h5  │        │
                    │  │         │──►│ backend:3001 │        │
                    │  └─────────┘   └──────────────┘        │
                    │       │                                │
                    │       ▼                                │
                    │  ┌──────────────┐                      │
                    │  │   Volumes    │                      │
                    │  │  assets/     │                      │
                    │  │  output/     │                      │
                    │  │  data/       │                      │
                    │  └──────────────┘                      │
                    └─────────────────────────────────────────┘
```

## 部署流程

```
本地代码 → git push → GitHub → GitHub Actions → SSH → 服务器 git pull → docker compose build → docker compose up
```

---

## 快速开始

### 第一步：服务器环境准备 (Ubuntu 22.04)

```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Docker 26
curl -fsSL https://get.docker.com | sh

# 验证安装
docker --version        # 应显示 Docker 26.x
docker compose version  # 应显示 Docker Compose V2

# 将当前用户加入 docker 组（免 sudo）
usermod -aG docker $USER

# 重新登录使组生效
exit
# 重新 SSH 登录

# 安装 Git
apt install -y git curl
```

### 第二步：克隆项目代码

```bash
cd /opt
git clone https://github.com/xuqifm89/shuziren.git
cd shuziren
```

### 第三步：配置环境变量

```bash
# 复制环境变量配置文件
cp docker/.env.production docker/.env.local

# 编辑环境变量（必须修改密钥！）
nano docker/.env.local
```

**必须修改的配置：**
```env
# 数据库密码
DB_PASSWORD=your_strong_password_here

# JWT 密钥（至少 32 字符随机字符串）
JWT_SECRET=your_random_jwt_secret_key_at_least_32_chars
ADMIN_JWT_SECRET=your_admin_jwt_secret_key_at_least_32_chars
CONFIG_ENCRYPTION_KEY=your_config_encryption_key_here

# CORS 允许的域名
CORS_ORIGINS=http://your-server-ip,http://your-server-ip:8080,http://your-server-ip:8081
```

**生成随机密钥：**
```bash
openssl rand -hex 32
```

### 第四步：启动服务

```bash
cd /opt/shuziren

# 方式一：使用部署脚本（推荐）
bash docker/deploy.sh docker/.env.local

# 方式二：手动启动
docker compose -f docker/docker-compose.simple.yml --env-file docker/.env.local up -d --build
```

### 第五步：验证服务

```bash
# 查看容器状态
docker compose -f docker/docker-compose.simple.yml ps

# 检查后端健康
curl http://localhost:3001/api/health

# 查看日志
docker compose -f docker/docker-compose.simple.yml logs -f
```

### 第六步：访问服务

| 服务 | 地址 |
|------|------|
| PC 前端 | http://your-server-ip |
| 管理后台 | http://your-server-ip:8080 |
| H5 移动端 | http://your-server-ip:8081 |
| 后端 API | http://your-server-ip:3001 |

---

## GitHub Actions 自动部署

### 配置 Secrets

在 GitHub 仓库 → Settings → Secrets and variables → Actions 中添加：

| Secret 名称 | 说明 |
|-------------|------|
| `DEPLOY_HOST` | 服务器 IP 地址 |
| `DEPLOY_USER` | SSH 用户名（如 root） |
| `DEPLOY_SSH_KEY` | SSH 私钥 |

### 生成 SSH 密钥

```bash
# 在服务器上生成密钥对
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# 将公钥加入 authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# 将私钥内容复制到 GitHub Secrets（DEPLOY_SSH_KEY）
cat ~/.ssh/github_actions
```

### 部署触发

- 推送到 `main` 分支自动触发部署
- 推送到 `develop` 分支只运行测试
- PR 到 `main` 只运行测试

---

## 三种部署模式

### 1. Simple 模式（推荐入门）

- SQLite 数据库
- 无 Redis/MinIO
- 统一 Nginx 反向代理
- 适合：小型部署、测试环境

```bash
docker compose -f docker/docker-compose.simple.yml --env-file docker/.env.local up -d --build
```

### 2. Full 模式（推荐生产）

- PostgreSQL 数据库
- Redis 缓存
- MinIO 对象存储
- 各服务独立端口
- 适合：正式生产环境

```bash
docker compose -f docker/docker-compose.yml --env-file docker/.env.local up -d --build
```

### 3. Prod 模式（镜像仓库）

- 使用预构建镜像
- 统一 Nginx + SSL
- 适合：CI/CD 流水线 + 镜像仓库

```bash
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.local pull
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.local up -d
```

---

## 常用管理命令

```bash
cd /opt/shuziren

# 查看服务状态
docker compose -f docker/docker-compose.simple.yml ps

# 查看日志
docker compose -f docker/docker-compose.simple.yml logs -f
docker compose -f docker/docker-compose.simple.yml logs -f backend

# 重启服务
docker compose -f docker/docker-compose.simple.yml restart
docker compose -f docker/docker-compose.simple.yml restart backend

# 停止服务
docker compose -f docker/docker-compose.simple.yml down

# 停止并删除数据（危险！）
docker compose -f docker/docker-compose.simple.yml down -v

# 更新并重新部署
git pull origin main
docker compose -f docker/docker-compose.simple.yml up -d --build

# 进入后端容器
docker exec -it shuziren-backend sh

# 清理旧镜像
docker image prune -f
```

---

## 防火墙配置

```bash
# Ubuntu UFW
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # PC 前端
ufw allow 8080/tcp  # 管理后台
ufw allow 8081/tcp  # H5 移动端
ufw allow 3001/tcp  # API（可选，通过 Nginx 代理后可不开放）
ufw enable

# 查看状态
ufw status
```

---

## 数据备份

```bash
# 备份数据卷
docker run --rm -v shuziren_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/data_backup_$(date +%Y%m%d).tar.gz /data

docker run --rm -v shuziren_assets:/data -v $(pwd):/backup alpine \
  tar czf /backup/assets_backup_$(date +%Y%m%d).tar.gz /data

# 恢复数据
docker run --rm -v shuziren_data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/data_backup_YYYYMMDD.tar.gz -C /
```

---

## 常见问题

### 1. Docker 命令需要 sudo

```bash
# 将用户加入 docker 组
sudo usermod -aG docker $USER
# 重新登录
```

### 2. 端口被占用

修改 `docker/.env.local` 中的端口：
```env
FRONTEND_PORT=8082
ADMIN_PORT=8083
H5_PORT=8084
BACKEND_PORT=3002
```

### 3. 构建失败 / 内存不足

```bash
# 清理缓存重新构建
docker compose -f docker/docker-compose.simple.yml build --no-cache

# 查看系统资源
free -h
df -h

# 清理 Docker 空间
docker system prune -a
```

### 4. 查看详细日志排查问题

```bash
# 后端日志
docker compose -f docker/docker-compose.simple.yml logs --tail 100 backend

# Nginx 日志
docker compose -f docker/docker-compose.simple.yml logs --tail 100 nginx

# 实时跟踪
docker compose -f docker/docker-compose.simple.yml logs -f --tail 50
```

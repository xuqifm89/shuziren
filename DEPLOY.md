# 拾光引擎 - 服务器部署指南

## 🚀 快速开始（推荐使用简化版）

### 第一步：连接到服务器

```bash
ssh root@43.155.188.118
```

### 第二步：检查 Docker 环境

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本
docker compose version

# 如果没有 Docker Compose，安装它
apt update && apt install -y docker-compose
```

### 第三步：克隆项目代码

```bash
cd /opt
git clone https://github.com/xuqifm89/shuziren.git
cd shuziren
```

### 第四步：配置环境变量

```bash
# 复制环境变量配置文件
cp docker/.env.production docker/.env

# 编辑环境变量（可选，大部分已配置好）
nano docker/.env
```

**可选修改的内容：**
```env
# JWT 密钥（建议修改为更安全的值）
JWT_SECRET=your_random_jwt_secret_key_here_at_least_32_chars
ADMIN_JWT_SECRET=your_admin_jwt_secret_key_here

# 修改 CORS 允许的域名（如果有自定义域名）
CORS_ORIGINS=http://your-domain.com,http://admin.your-domain.com
```

### 第五步：启动服务（简化版，使用 SQLite）

```bash
# 进入 docker 目录
cd docker

# 构建并启动所有服务（后台运行，使用简化版配置）
docker compose -f docker-compose.simple.yml up -d --build

# 查看服务状态
docker compose -f docker-compose.simple.yml ps

# 查看日志
docker compose -f docker-compose.simple.yml logs -f
```

### 第六步：访问服务

部署成功后，可以通过以下地址访问：

| 服务 | 地址 |
|------|------|
| PC 前端 | http://43.155.188.118 |
| 管理后台 | http://43.155.188.118:8080 |
| H5 移动端 | http://43.155.188.118:8081 |
| 后端 API | http://43.155.188.118:3001 |

---

## 📋 常用管理命令

### 查看服务状态
```bash
cd /opt/shuziren/docker
docker compose -f docker-compose.simple.yml ps
```

### 查看日志
```bash
# 查看所有服务日志
docker compose -f docker-compose.simple.yml logs -f

# 查看特定服务日志
docker compose -f docker-compose.simple.yml logs -f backend
docker compose -f docker-compose.simple.yml logs -f frontend-pc
```

### 重启服务
```bash
# 重启所有服务
docker compose -f docker-compose.simple.yml restart

# 重启单个服务
docker compose -f docker-compose.simple.yml restart backend
```

### 停止服务
```bash
# 停止但保留数据
docker compose -f docker-compose.simple.yml stop

# 停止并删除容器（数据保留）
docker compose -f docker-compose.simple.yml down

# 停止并删除所有（包括数据，谨慎使用！）
docker compose -f docker-compose.simple.yml down -v
```

### 更新代码并重新部署
```bash
cd /opt/shuziren

# 拉取最新代码
git pull

# 重新构建并启动
cd docker
docker compose -f docker-compose.simple.yml up -d --build
```

---

## 🔒 防火墙配置

### 开放必要端口
```bash
# Ubuntu 使用 ufw
ufw allow 80/tcp
ufw allow 8080/tcp
ufw allow 8081/tcp
ufw allow 3001/tcp
ufw enable
```

或者使用 iptables：
```bash
iptables -I INPUT -p tcp --dport 80 -j ACCEPT
iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
iptables -I INPUT -p tcp --dport 8081 -j ACCEPT
iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
```

---

## 💾 数据备份

### 备份数据库
```bash
# 备份 Postgres 数据
docker exec shuziren-postgres pg_dump -U postgres shuziren > backup.sql

# 或者备份整个数据卷
docker run --rm -v shuziren_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

### 备份上传文件
```bash
docker run --rm -v shuziren_assets:/data -v $(pwd):/backup alpine tar czf /backup/assets_backup.tar.gz /data
```

---

## ⚠️ 常见问题

### 1. 端口被占用
如果端口被占用，可以修改 `docker/.env` 文件中的端口：
```env
FRONTEND_PORT=8080
ADMIN_PORT=8081
H5_PORT=8082
BACKEND_PORT=3002
```

### 2. 内存不足
如果服务器内存小于 2GB，可能需要关闭一些服务，修改 `docker-compose.yml` 注释掉不需要的服务。

### 3. 构建失败
如果构建过程中出现问题，可以尝试：
```bash
# 清理缓存重新构建
docker compose build --no-cache
docker compose up -d
```

---

## 📞 需要帮助？

查看日志找问题：
```bash
docker compose logs backend
```

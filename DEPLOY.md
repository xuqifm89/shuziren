# 拾光引擎 - 云端部署指南

> AI驱动的数字人视频生成平台 - 完整的容器化部署方案

---

## 📋 项目全景图

| 组件 | 技术栈 | 端口 |
|------|--------|------|
| **后端 API** | Node.js + Express | 3001 |
| **PC Web 前端** | Vue3 + Vite | 80 |
| **管理后台** | Vue3 + Element Plus | 8080 |
| **H5 移动端** | uni-app + Vue3 | 8081 |
| **PostgreSQL** | 关系数据库 | 5432 |
| **Redis** | 缓存 | 6379 |
| **MinIO** | 对象存储 | 9000/9001 |

---

## 🚀 云端部署完整流程

### 阶段一：准备工作

#### 1. 准备云服务器
推荐配置：
- **CPU**: 4核+
- **内存**: 8GB+
- **硬盘**: 100GB+ SSD（存储视频文件）
- **系统**: Ubuntu 20.04+ / CentOS 8+

#### 2. 安装必要环境（在云服务器上执行）
```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

#### 3. 准备域名（可选但推荐）
购买域名并配置 DNS 解析：
- `your-domain.com` → PC 前端
- `admin.your-domain.com` → 管理后台
- `m.your-domain.com` → H5 移动端
- `api.your-domain.com` → 后端 API

---

### 阶段二：项目代码上传到服务器

#### 方式 A：使用 Git（推荐）
```bash
# 1. 在本地初始化 Git（如果还没有）
cd /Users/ahs/Downloads/shuziren
git init
git add .
git commit -m "Initial commit"

# 2. 推送到 GitHub/GitLab/Gitee（创建仓库后）
git remote add origin https://github.com/your-username/shuziren.git
git branch -M main
git push -u origin main

# 3. 在云服务器上拉取代码
ssh root@your-server-ip
cd /opt
git clone https://github.com/your-username/shuziren.git
cd shuziren
```

#### 方式 B：直接上传文件（不使用 Git）
```bash
# 在本地使用 scp 或 rsync 上传到服务器
cd /Users/ahs/Downloads/shuziren
scp -r . root@your-server-ip:/opt/shuziren/
```

---

### 阶段三：配置环境变量（在云服务器上执行）

#### 1. 复制并编辑生产环境配置
```bash
# 进入服务器上的项目目录
cd /opt/shuziren

# 复制示例配置文件
cp docker/.env.production .env
```

#### 2. 修改 `.env` 文件的关键配置
```bash
# 使用编辑器打开 .env 文件
nano .env
```

```env
# ==========================================
# 必填配置（必须修改！）
# ==========================================

# 1. 数据库密码（强密码）
DB_PASSWORD=your_strong_password_here

# 2. JWT密钥（至少32位随机字符串）
JWT_SECRET=your_very_long_random_secret_key_here_at_least_32_chars
ADMIN_JWT_SECRET=another_very_long_random_secret_key_here

# 3. MinIO 对象存储密钥
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=minio_strong_password_here

# 4. CORS 允许的域名（改为你的实际域名）
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com,https://m.your-domain.com,https://api.your-domain.com

# ==========================================
# 可选配置
# ==========================================

# 端口映射（根据需要调整）
BACKEND_PORT=3001
FRONTEND_PORT=80
ADMIN_PORT=8080
H5_PORT=8081
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001

# 微信小程序（如需要）
WX_APPID=your_wx_appid
WX_APPSECRET=your_wx_appsecret
```

#### 3. ⚠️ 重要：确保 .env 不被提交到 Git
```bash
# 检查 .gitignore 是否包含 .env
cat .gitignore

# 如果没有，添加 .env 到 .gitignore
echo ".env" >> .gitignore
```

---

### 阶段四：构建并启动 Docker 服务

#### 1. 在云服务器上执行
```bash
# 进入项目目录
cd /opt/shuziren

# 确保 .env 文件已正确配置
ls -la

# 构建并启动所有服务
cd docker
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看实时日志
docker compose logs -f
```

#### 2. 服务启动后的默认访问地址
| 服务 | 访问地址 |
|------|---------|
| **PC Web 前端** | `http://your-server-ip/` |
| **管理后台** | `http://your-server-ip:8080/` |
| **H5 移动端** | `http://your-server-ip:8081/` |
| **后端 API** | `http://your-server-ip:3001/` |
| **MinIO 控制台** | `http://your-server-ip:9001/` |

---

### 阶段五：配置反向代理与 HTTPS（推荐使用 Nginx）

#### 1. 在云服务器上安装 Nginx
```bash
sudo apt-get update
sudo apt-get install nginx
```

#### 2. 配置 Nginx 反向代理（示例）
```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/shuziren
```

```nginx
# PC 前端
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 管理后台
server {
    listen 80;
    server_name admin.your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# H5 移动端
server {
    listen 80;
    server_name m.your-domain.com;
    
    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 后端 API
server {
    listen 80;
    server_name api.your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### 3. 启用配置并重启 Nginx
```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/shuziren /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 4. 配置 HTTPS（使用 Let's Encrypt 免费证书）
```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 自动申请并配置证书
sudo certbot --nginx -d your-domain.com -d admin.your-domain.com -d m.your-domain.com -d api.your-domain.com

# 证书会自动续期，无需手动操作
```

---

### 阶段六：数据持久化与备份

#### 1. Docker 数据卷位置
项目已配置好持久化数据卷：
- `shuziren_postgres_data` - PostgreSQL 数据
- `shuziren_redis_data` - Redis 数据
- `shuziren_minio_data` - MinIO 对象存储
- `shuziren_assets` - 上传的媒体文件
- `shuziren_output` - 生成的视频文件
- `shuziren_data` - 其他数据

#### 2. 定期备份脚本（示例）
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR=/opt/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker exec shuziren-postgres pg_dump -U postgres shuziren > $BACKUP_DIR/db_$DATE.sql

# 备份媒体文件
docker run --rm -v shuziren_assets:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/assets_$DATE.tar.gz -C /data .

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

设置定时任务：
```bash
crontab -e
# 每天凌晨 2 点备份
0 2 * * * /opt/shuziren/backup.sh
```

---

### 阶段七：CI/CD 自动化（可选，推荐使用 GitHub Actions）

在项目根目录创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Server
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SERVER_SSH_KEY }}
        script: |
          cd /opt/shuziren
          git pull origin main
          cd docker
          docker compose up -d --build
```

---

## 🔧 常见运维命令

```bash
# 查看所有服务状态
cd /opt/shuziren/docker
docker compose ps

# 查看某个服务的日志
docker compose logs -f backend
docker compose logs -f postgres

# 重启所有服务
docker compose restart

# 停止所有服务
docker compose down

# 更新代码后重新构建
git pull
docker compose up -d --build

# 进入某个容器
docker compose exec backend sh
docker compose exec postgres psql -U postgres shuziren
```

---

## 📊 监控与维护

### 1. 健康检查
- 后端健康检查：`http://your-server-ip:3001/api/health`
- PostgreSQL：自动健康检查
- Redis：自动健康检查
- MinIO：自动健康检查

### 2. 日志查看
```bash
# 查看所有服务日志
docker compose logs -f --tail=100

# 查看特定服务日志
docker compose logs -f backend
```

---

## ⚠️ 安全注意事项

1. **不要提交 `.env` 文件到 Git** - 确保 `.gitignore` 包含 `.env`
2. **定期更新密码和密钥**
3. **配置防火墙**，只开放必要的端口（80, 443）
4. **启用 HTTPS**，不要使用 HTTP 传输敏感数据
5. **定期备份数据**

---

## 📚 相关文档

- [架构设计文档](./ARCHITECTURE.md)
- [API接口文档](./docs/api.md)
- [项目README](./README.md)

---

**维护团队**: ShuZiRen Team  
**最后更新**: 2026-05-06

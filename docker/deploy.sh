#!/bin/bash
set -e

echo "========================================="
echo "  拾光引擎 - 部署脚本 (Ubuntu 22.04 + Docker 26)"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.simple.yml}"
ENV_FILE="${1:-docker/.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "环境配置文件不存在: $ENV_FILE"
  echo "  请复制 docker/.env.production 并修改配置"
  echo "  cp docker/.env.production docker/.env.production.local"
  exit 1
fi

echo "使用配置文件: $ENV_FILE"
echo "使用 Compose: $COMPOSE_FILE"
echo ""

set -a
source <(grep -v '^#' "$ENV_FILE" | grep -v '^$')
set +a

echo "1. 检查 Docker..."
if ! command -v docker &> /dev/null; then
  echo "Docker 未安装，正在安装..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker $USER
  echo "Docker 安装完成，请重新登录以使 docker 组生效"
  exit 0
fi
echo "   Docker $(docker --version)"

echo ""
echo "2. 检查 Docker Compose..."
if ! docker compose version &> /dev/null; then
  echo "Docker Compose V2 未安装"
  echo "Docker 26 自带 Compose V2 插件，请检查安装"
  exit 1
fi
echo "   $(docker compose version)"

echo ""
echo "3. 拉取最新代码..."
if [ -d ".git" ]; then
  git pull origin main || echo "   代码拉取失败，使用本地代码继续"
fi

echo ""
echo "4. 停止旧容器..."
docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true

echo ""
echo "5. 构建镜像..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo ""
echo "6. 启动服务..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo ""
echo "7. 配置宿主机 Nginx..."
if command -v nginx &> /dev/null; then
  cp docker/nginx/host-shuziren.conf /etc/nginx/sites-available/shuziren
  ln -sf /etc/nginx/sites-available/shuziren /etc/nginx/sites-enabled/shuziren
  rm -f /etc/nginx/sites-enabled/default
  if nginx -t 2>/dev/null; then
    nginx -s reload
    echo "   Nginx 配置已更新并重载"
  else
    echo "   Nginx 配置测试失败，请手动检查"
  fi
else
  echo "   宿主机 Nginx 未安装，跳过配置"
  echo "   请安装: apt install -y nginx"
fi

echo ""
echo "8. 等待服务就绪..."
sleep 15

echo ""
echo "9. 健康检查..."
HEALTH_STATUS=$(curl -sf http://localhost:3001/api/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "failed")

if [ "$HEALTH_STATUS" = "ok" ]; then
  echo "   后端服务正常"
else
  echo "   后端服务可能未就绪 (status: $HEALTH_STATUS)"
  echo "   请检查日志: docker compose -f $COMPOSE_FILE logs backend"
fi

echo ""
echo "10. 清理旧镜像..."
docker image prune -f

echo ""
echo "========================================="
echo "  部署完成!"
echo "========================================="
echo ""
echo "  Docker 容器端口映射:"
echo "    后端 API:   http://localhost:3001"
echo "    PC 前端:    http://localhost:3080"
echo "    管理后台:   http://localhost:3081"
echo "    H5 移动端:  http://localhost:3082"
echo ""
echo "  通过宿主机 Nginx 访问 (如果已配置):"
echo "    dsface.com       -> PC 前端"
echo "    admin.dsface.com -> 管理后台"
echo "    m.dsface.com     -> H5 移动端"
echo "    IP:80            -> PC 前端 (默认)"
echo ""
echo "  常用命令:"
echo "  查看日志: docker compose -f $COMPOSE_FILE logs -f"
echo "  重启服务: docker compose -f $COMPOSE_FILE restart"
echo "  停止服务: docker compose -f $COMPOSE_FILE down"
echo ""

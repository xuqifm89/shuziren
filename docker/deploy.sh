#!/bin/bash
set -e

echo "========================================="
echo "  拾光引擎 - 部署脚本 (CI/CD 模式)"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.simple.yml}"

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
echo "2. 登录 GitHub Container Registry..."
if [ ! -f "$HOME/.docker/config.json" ] || ! grep -q "ghcr.io" "$HOME/.docker/config.json" 2>/dev/null; then
  echo "   需要登录 ghcr.io，请输入 GitHub 凭据"
  echo "   用户名: 你的GitHub用户名"
  echo "   密码: GitHub Personal Access Token (需要 read:packages 权限)"
  docker login ghcr.io -u xuqifm89 || {
    echo "   登录失败"
    exit 1
  }
else
  echo "   已登录 ghcr.io"
fi

echo ""
echo "3. 拉取最新镜像..."
docker compose -f "$COMPOSE_FILE" pull

echo ""
echo "4. 停止旧容器并启动新服务..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo ""
echo "5. 配置宿主机 Nginx..."
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
fi

echo ""
echo "6. 等待服务就绪..."
sleep 15

echo ""
echo "7. 健康检查..."
HEALTH_STATUS=$(curl -sf http://localhost:3001/api/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "failed")

if [ "$HEALTH_STATUS" = "ok" ]; then
  echo "   后端服务正常 ✅"
else
  echo "   后端服务可能未就绪 (status: $HEALTH_STATUS) ⚠️"
  echo "   查看日志: docker compose -f $COMPOSE_FILE logs backend"
fi

echo ""
echo "8. 清理旧镜像..."
docker image prune -f

echo ""
echo "========================================="
echo "  部署完成!"
echo "========================================="
echo ""
echo "  当前镜像版本:"
docker compose -f "$COMPOSE_FILE" images 2>/dev/null || true
echo ""
echo "  常用命令:"
echo "  查看日志: docker compose -f $COMPOSE_FILE logs -f"
echo "  重启服务: docker compose -f $COMPOSE_FILE restart"
echo "  停止服务: docker compose -f $COMPOSE_FILE down"
echo "  更新服务: bash docker/update.sh"
echo ""

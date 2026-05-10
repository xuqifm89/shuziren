#!/bin/bash
set -e

echo "========================================="
echo "  拾光引擎 - 一键更新 (CI/CD 模式)"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.simple.yml}"

echo "1. 登录 GitHub Container Registry..."
echo "   如果提示输入用户名密码，请使用 GitHub Personal Access Token"
echo "   用户名: 你的GitHub用户名"
echo "   密码: GitHub Settings > Developer settings > Personal access tokens > 生成一个有 read:packages 权限的 token"
echo ""

if [ ! -f "$HOME/.docker/config.json" ] || ! grep -q "ghcr.io" "$HOME/.docker/config.json" 2>/dev/null; then
  echo "   首次使用需要登录 ghcr.io..."
  docker login ghcr.io -u xuqifm89 || {
    echo "   登录失败，请确保有 read:packages 权限的 token"
    exit 1
  }
else
  echo "   已登录 ghcr.io"
fi

echo ""
echo "2. 拉取最新镜像..."
docker compose -f "$COMPOSE_FILE" pull

echo ""
echo "3. 重启服务（使用新镜像）..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo ""
echo "4. 等待服务就绪..."
sleep 10

echo ""
echo "5. 健康检查..."
HEALTH_STATUS=$(curl -sf http://localhost:3001/api/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "failed")

if [ "$HEALTH_STATUS" = "ok" ]; then
  echo "   后端服务正常 ✅"
else
  echo "   后端服务可能未就绪 (status: $HEALTH_STATUS) ⚠️"
  echo "   查看日志: docker compose -f $COMPOSE_FILE logs backend"
fi

echo ""
echo "6. 清理旧镜像..."
docker image prune -f

echo ""
echo "========================================="
echo "  更新完成!"
echo "========================================="
echo ""
echo "  当前运行的镜像版本:"
docker compose -f "$COMPOSE_FILE" images --format "table" 2>/dev/null || \
  docker compose -f "$COMPOSE_FILE" images
echo ""

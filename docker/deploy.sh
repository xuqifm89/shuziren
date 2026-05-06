#!/bin/bash
set -e

echo "========================================="
echo "  拾光引擎 - 部署脚本"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

ENV_FILE="${1:-docker/.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 环境配置文件不存在: $ENV_FILE"
  echo "   请复制 docker/.env.production 并修改配置"
  echo "   cp docker/.env.production docker/.env.production.local"
  exit 1
fi

echo "📋 使用配置文件: $ENV_FILE"
echo ""

export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

echo "1️⃣  检查 Docker..."
if ! command -v docker &> /dev/null; then
  echo "❌ Docker 未安装"
  exit 1
fi
echo "   ✅ Docker $(docker --version)"

echo ""
echo "2️⃣  检查 Docker Compose..."
if ! docker compose version &> /dev/null; then
  echo "❌ Docker Compose 未安装"
  exit 1
fi
echo "   ✅ $(docker compose version)"

echo ""
echo "3️⃣  拉取最新镜像..."
docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" pull

echo ""
echo "4️⃣  启动服务..."
docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" up -d --remove-orphans

echo ""
echo "5️⃣  等待服务就绪..."
sleep 10

echo ""
echo "6️⃣  健康检查..."
HEALTH_STATUS=$(curl -s http://localhost:${BACKEND_PORT:-3001}/api/health | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "failed")

if [ "$HEALTH_STATUS" = "ok" ]; then
  echo "   ✅ 后端服务正常"
else
  echo "   ⚠️  后端服务可能未就绪 (status: $HEALTH_STATUS)"
  echo "   请检查日志: docker compose -f docker/docker-compose.prod.yml logs backend"
fi

echo ""
echo "7️⃣  清理旧镜像..."
docker image prune -f

echo ""
echo "========================================="
echo "  ✅ 部署完成！"
echo "========================================="
echo ""
echo "  前端:     https://your-domain.com"
echo "  管理后台: https://admin.your-domain.com"
echo "  移动端:   https://m.your-domain.com"
echo "  API:      https://api.your-domain.com"
echo ""
echo "  常用命令:"
echo "  查看日志: docker compose -f docker/docker-compose.prod.yml logs -f"
echo "  重启服务: docker compose -f docker/docker-compose.prod.yml restart"
echo "  停止服务: docker compose -f docker/docker-compose.prod.yml down"
echo ""

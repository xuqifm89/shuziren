#!/bin/bash
set -e

echo "========================================="
echo "  拾光引擎 - 本地构建并推送镜像"
echo "========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

REGISTRY="ghcr.io/xuqifm89"
TAG="${1:-latest}"

if [ "$TAG" != "latest" ]; then
  echo "使用自定义标签: $TAG"
else
  TAG="$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"
  echo "使用 commit SHA 作为标签: $TAG"
fi

echo ""
echo "1. 检查 ghcr.io 登录状态..."
if ! docker login ghcr.io --username xuqifm89 --password-stdin </dev/null 2>/dev/null; then
  echo "   需要登录 ghcr.io"
  echo "   密码使用 GitHub Personal Access Token (需要 write:packages 权限)"
  docker login ghcr.io -u xuqifm89 || exit 1
fi

echo ""
echo "2. 构建后端镜像..."
docker build -t ${REGISTRY}/shuziren-backend:${TAG} \
             -t ${REGISTRY}/shuziren-backend:latest \
             -f packages/backend/Dockerfile \
             packages/backend/

echo ""
echo "3. 构建 PC 前端镜像..."
docker build -t ${REGISTRY}/shuziren-frontend-pc:${TAG} \
             -t ${REGISTRY}/shuziren-frontend-pc:latest \
             -f packages/frontend-pc/Dockerfile \
             .

echo ""
echo "4. 构建管理后台镜像..."
docker build -t ${REGISTRY}/shuziren-admin-panel:${TAG} \
             -t ${REGISTRY}/shuziren-admin-panel:latest \
             -f packages/admin-panel/Dockerfile \
             .

echo ""
echo "5. 构建 H5 前端镜像..."
docker build -t ${REGISTRY}/shuziren-frontend-h5:${TAG} \
             -t ${REGISTRY}/shuziren-frontend-h5:latest \
             -f packages/frontend-miniapp/Dockerfile \
             .

echo ""
echo "========================================="
echo "  构建完成！"
echo "========================================="
echo ""
echo "  本地镜像列表:"
docker images ${REGISTRY} --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | head -10
echo ""
echo "  接下来你可以:"
echo "  A. 本地测试:  docker compose -f docker/docker-compose.simple.yml up -d"
echo "  B. 推送镜像:  bash docker/push.sh"
echo ""

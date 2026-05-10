#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

RESTART_BACKEND=true
BUILD_PC=true
BUILD_H5=true
BUILD_ADMIN=true

for arg in "$@"; do
  case $arg in
    --no-restart) RESTART_BACKEND=false ;;
    --pc-only) BUILD_H5=false; BUILD_ADMIN=false ;;
    --h5-only) BUILD_PC=false; BUILD_ADMIN=false ;;
    --admin-only) BUILD_PC=false; BUILD_H5=false ;;
    --help|-h)
      echo "用法: bash docker/build-frontend.sh [选项]"
      echo ""
      echo "选项:"
      echo "  --no-restart   编译后不重启后端容器"
      echo "  --pc-only      只编译PC前端"
      echo "  --h5-only      只编译H5前端"
      echo "  --admin-only   只编译管理后台"
      echo "  --help         显示帮助"
      exit 0
      ;;
  esac
done

echo "========================================="
echo "  拾光引擎 - 前端编译部署"
echo "========================================="
echo ""

COMPOSE_FILE="docker/docker-compose.simple.yml"

build_and_extract() {
  local name=$1
  local dockerfile=$2
  local source_path=$3
  local dest_path=$4

  echo "📦 编译 ${name}..."
  local tmp_image="shuziren-build-${name,,}"

  docker build -t "$tmp_image" -f "$dockerfile" --target builder . > /dev/null 2>&1

  local tmp_container="extract-$(date +%s)"
  docker create --name "$tmp_container" "$tmp_image" > /dev/null 2>&1

  rm -rf "$dest_path" 2>/dev/null || true
  mkdir -p "$(dirname "$dest_path")"
  docker cp "$tmp_container:$source_path" "$dest_path" 2>/dev/null

  docker rm "$tmp_container" > /dev/null 2>&1
  docker rmi "$tmp_image" > /dev/null 2>&1

  if [ -f "${dest_path}/index.html" ]; then
    echo "   ✅ ${name} 编译成功"
  else
    echo "   ❌ ${name} 编译失败"
    return 1
  fi
}

START_TIME=$(date +%s)

if [ "$BUILD_PC" = true ]; then
  build_and_extract "PC" "packages/frontend-pc/Dockerfile" \
    "/app/packages/frontend-pc/dist" \
    "packages/frontend-pc/dist"
  echo ""
fi

if [ "$BUILD_H5" = true ]; then
  build_and_extract "H5" "packages/frontend-miniapp/Dockerfile" \
    "/app/packages/frontend-miniapp/dist/build/h5" \
    "packages/frontend-miniapp/dist/build/h5"
  echo ""
fi

if [ "$BUILD_ADMIN" = true ]; then
  build_and_extract "Admin" "packages/admin-panel/Dockerfile" \
    "/app/packages/admin-panel/dist" \
    "packages/admin-panel/dist"
  echo ""
fi

if [ "$RESTART_BACKEND" = true ]; then
  echo "🔄 重启后端容器..."
  docker compose -f "$COMPOSE_FILE" restart backend > /dev/null 2>&1
  sleep 5

  HEALTH=$(curl -sf http://localhost:3001/api/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "failed")
  if [ "$HEALTH" = "ok" ]; then
    echo "   ✅ 后端服务正常"
  else
    echo "   ⚠️ 后端服务可能未就绪"
  fi
fi

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "========================================="
echo "  编译部署完成! (${ELAPSED}秒)"
echo "========================================="
echo ""
echo "  访问地址:"
echo "  PC:     https://dsface.com/"
echo "  H5:     https://m.dsface.com/"
echo "  Admin:  https://admin.dsface.com/"
echo ""

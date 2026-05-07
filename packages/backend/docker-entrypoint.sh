#!/bin/sh

XVFB_PID=""

cleanup() {
  if [ -n "$XVFB_PID" ]; then
    kill $XVFB_PID 2>/dev/null || true
  fi
  if [ -n "$SAU_INSTALL_PID" ]; then
    kill $SAU_INSTALL_PID 2>/dev/null || true
  fi
  rm -f /tmp/.X99-lock
}
trap cleanup EXIT INT TERM

rm -f /tmp/.X99-lock

if command -v Xvfb > /dev/null 2>&1; then
  echo "Starting Xvfb on display :99..."
  Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
  XVFB_PID=$!
  export DISPLAY=:99
  sleep 1
  echo "Xvfb started (PID: $XVFB_PID)"
else
  echo "Xvfb not found, headed browser mode may not work"
fi

install_sau_deps() {
  if [ -n "$SAU_REPO_URL" ] && [ ! -d "/app/social-auto-upload" ]; then
    echo "Cloning social-auto-upload from $SAU_REPO_URL..."
    git clone "$SAU_REPO_URL" /app/social-auto-upload 2>/dev/null || true
  fi

  if [ -d "/app/social-auto-upload" ]; then
    echo "Installing social-auto-upload dependencies (background)..."
    cd /app/social-auto-upload
    sed -i 's/opencv-python>=.*/opencv-python-headless>=4.8.0",/' pyproject.toml 2>/dev/null || true
    pip3 install --break-system-packages opencv-python-headless 2>&1 || true
    pip3 install --break-system-packages -e . 2>&1 || true
    cd /app
    echo "social-auto-upload setup done"
  fi
}

install_sau_deps &
SAU_INSTALL_PID=$!

echo "Starting application: $@"
exec "$@"

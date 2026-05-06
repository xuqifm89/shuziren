FROM node:18-alpine AS base

RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    python3 \
    py3-pip \
    make \
    g++ \
    chromium \
    xvfb \
    dbus \
    git \
    && rm -rf /var/cache/apk/*

ENV CHROME_PATH=/usr/bin/chromium-browser
ENV DISPLAY=:99
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers

RUN npx playwright install chromium --with-deps 2>/dev/null || true

RUN curl -LsSf https://astral.sh/uv/install.sh | sh || true
ENV PATH="/root/.local/bin:/root/.cargo/bin:${PATH}"

WORKDIR /app

# 复制根目录和所有子包的 package.json
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared-components/package*.json ./packages/shared-components/

# 在根目录安装依赖（monorepo），跳过自动执行 postinstall
RUN npm install --ignore-scripts

# 复制所有源代码
COPY . .

WORKDIR /app/packages/backend

# 获取 social-auto-upload
RUN if [ ! -d "social-auto-upload" ]; then \
      git clone https://github.com/dreammis/social-auto-upload.git social-auto-upload 2>&1 || true; \
    fi; \
    if [ -d "social-auto-upload" ]; then \
      cd social-auto-upload && if command -v uv &> /dev/null; then uv sync 2>&1 || uv pip install -r requirements.txt 2>&1 || true; fi && cd /app/packages/backend; \
    fi

RUN mkdir -p \
  assets/voices \
  assets/dubbings \
  assets/musics \
  assets/portraits/videos \
  assets/portraits/images \
  assets/portraits/thumbnails \
  assets/uploads \
  assets/works \
  assets/covers \
  assets/avatars \
  output/audio \
  output/video \
  output/covers \
  output/frames \
  data

# 复制入口脚本
COPY packages/backend/docker-entrypoint.sh /app/packages/backend/docker-entrypoint.sh
RUN chmod +x /app/packages/backend/docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/app/packages/backend/docker-entrypoint.sh"]
CMD ["node", "server.js"]

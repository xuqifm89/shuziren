FROM node:18-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    imagemagick \
    python3 \
    python3-pip \
    python3-venv \
    make \
    g++ \
    chromium \
    xvfb \
    dbus \
    git \
    curl \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

ENV CHROME_PATH=/usr/bin/chromium
ENV DISPLAY=:99
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers

RUN npx playwright install chromium --with-deps 2>/dev/null || true

WORKDIR /app

COPY . .

RUN npm install --ignore-scripts

RUN npm rebuild sqlite3 --build-from-source

RUN if [ ! -d "social-auto-upload" ]; then \
      git clone https://github.com/dreammis/social-auto-upload.git social-auto-upload 2>&1 || true; \
    fi; \
    if [ -d "social-auto-upload" ]; then \
      cd social-auto-upload \
      && sed -i 's/opencv-python>=.*/opencv-python-headless>=4.8.0",/' pyproject.toml 2>/dev/null || true \
      && pip3 install --break-system-packages opencv-python-headless 2>&1 || true \
      && pip3 install --break-system-packages -e . 2>&1 || true \
      && cd /app; \
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
  data \
  social-auto-upload/cookies

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]

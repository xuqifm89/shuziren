FROM node:18-bookworm AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    imagemagick \
    python3 \
    python3-pip \
    python3-venv \
    make \
    g++ \
    xvfb \
    dbus \
    git \
    curl \
    wget \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

ENV CHROME_PATH=/usr/bin/chromium
ENV DISPLAY=:99
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers

RUN npx playwright install --with-deps chromium 2>/dev/null; \
    if [ ! -f /usr/bin/chromium ]; then \
      ln -sf /opt/playwright-browsers/chromium-*/chrome-linux/chromium /usr/bin/chromium 2>/dev/null || true; \
    fi

RUN curl -LsSf https://astral.sh/uv/install.sh | sh || true
ENV PATH="/root/.local/bin:/root/.cargo/bin:${PATH}"

WORKDIR /app

COPY . .

RUN npm install --ignore-scripts

RUN npm rebuild sqlite3

RUN if [ ! -d "social-auto-upload" ]; then \
      git clone https://github.com/dreammis/social-auto-upload.git social-auto-upload 2>&1 || true; \
    fi; \
    if [ -d "social-auto-upload" ]; then \
      cd social-auto-upload \
      && sed -i 's/opencv-python>=.*/opencv-python-headless>=4.8.0",/' pyproject.toml 2>/dev/null || true \
      && if command -v uv > /dev/null 2>&1; then \
           uv sync 2>&1 || uv pip install -r requirements.txt 2>&1 || true; \
         fi \
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
  data

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]

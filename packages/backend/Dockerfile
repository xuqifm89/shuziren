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
    && rm -rf /var/cache/apk/*

ENV CHROME_PATH=/usr/bin/chromium-browser
ENV DISPLAY=:99
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers

RUN npx playwright install chromium --with-deps 2>/dev/null || true

RUN curl -LsSf https://astral.sh/uv/install.sh | sh || true
ENV PATH="/root/.local/bin:/root/.cargo/bin:${PATH}"

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN if [ ! -d "social-auto-upload" ]; then \
      git clone https://github.com/dreammis/social-auto-upload.git social-auto-upload 2>/dev/null || true; \
    fi \
    && cd social-auto-upload \
    && if command -v uv &> /dev/null; then uv sync 2>/dev/null || uv pip install -r requirements.txt 2>/dev/null || true; fi \
    && cd /app

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

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]

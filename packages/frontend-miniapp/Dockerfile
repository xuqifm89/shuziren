FROM node:18-alpine AS builder
WORKDIR /app

# 先复制所有源代码
COPY . .

# 在根目录安装依赖（monorepo），跳过自动执行 postinstall
RUN npm install --ignore-scripts

# 构建 h5 前端
RUN npm run build:h5

FROM nginx:alpine
COPY --from=builder /app/packages/frontend-miniapp/dist/build/h5 /usr/share/nginx/html
COPY packages/frontend-miniapp/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

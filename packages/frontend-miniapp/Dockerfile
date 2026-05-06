FROM node:18-alpine AS builder
WORKDIR /app

# 复制根目录配置文件和所有子包的 package.json
COPY package*.json ./
COPY packages/shared-components/package*.json ./packages/shared-components/
COPY packages/frontend-miniapp/package*.json ./packages/frontend-miniapp/

# 在根目录安装依赖（monorepo）
RUN npm install

# 复制所有源代码
COPY . .

# 构建 h5 前端
RUN npm run build:h5

FROM nginx:alpine
COPY --from=builder /app/packages/frontend-miniapp/dist/build/h5 /usr/share/nginx/html
COPY packages/frontend-miniapp/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

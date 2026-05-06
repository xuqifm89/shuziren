FROM node:18-alpine AS build

WORKDIR /app

# 复制根目录配置文件和所有子包的 package.json
COPY package*.json ./
COPY packages/shared-components/package*.json ./packages/shared-components/
COPY packages/frontend-pc/package*.json ./packages/frontend-pc/

# 在根目录安装依赖（monorepo），跳过自动执行 postinstall
RUN npm install --ignore-scripts

# 复制所有源代码
COPY . .

# 构建 pc 前端
RUN npm run build:pc

FROM nginx:alpine

COPY --from=build /app/packages/frontend-pc/dist /usr/share/nginx/html
COPY packages/frontend-pc/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

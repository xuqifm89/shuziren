FROM node:18-alpine AS build

WORKDIR /app

# 先复制所有源代码
COPY . .

# 在根目录安装依赖（monorepo），跳过自动执行 postinstall
RUN npm install --ignore-scripts

# 构建 admin panel
RUN npm run build:admin

FROM nginx:alpine

COPY --from=build /app/packages/admin-panel/dist /usr/share/nginx/html
COPY packages/admin-panel/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

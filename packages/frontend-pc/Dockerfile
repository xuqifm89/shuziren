FROM node:18-alpine AS build

WORKDIR /app

# 先复制所有源代码
COPY . .

# 在根目录安装依赖（monorepo），跳过自动执行 postinstall
RUN npm install --ignore-scripts

# 构建 pc 前端
RUN npm run build:pc

FROM nginx:alpine

COPY --from=build /app/packages/frontend-pc/dist /usr/share/nginx/html
COPY packages/frontend-pc/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

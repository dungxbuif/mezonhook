FROM node:20-alpine AS build

ARG TARGETARCH

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/schema/package.json packages/schema/package.json
RUN npm ci && npm install --no-save --package-lock=false "@rollup/rollup-linux-${TARGETARCH}-musl@4.63.1"

COPY . .
RUN npm run build --workspace @mezonhook/web

FROM nginxinc/nginx-unprivileged:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

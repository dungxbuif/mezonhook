FROM node:20-alpine AS build

ARG TARGETARCH

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/schema/package.json packages/schema/package.json
RUN npm ci \
    && case "${TARGETARCH}" in \
      amd64) rollup_arch=x64 ;; \
      arm64) rollup_arch=arm64 ;; \
      *) echo "Unsupported Docker target architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac \
    && npm install --no-save --package-lock=false "@rollup/rollup-linux-${rollup_arch}-musl@4.63.1"

COPY . .
RUN npm run build --workspace @mezonhook/web

FROM nginxinc/nginx-unprivileged:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

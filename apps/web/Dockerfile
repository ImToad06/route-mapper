# syntax=docker/dockerfile:1
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --ignore-scripts
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
WORKDIR /app/apps/web
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

FROM nginx:1.27-alpine AS runner
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY infra/docker/hsts-map.conf /etc/nginx/conf.d/00-hsts.conf
COPY infra/docker/seguridad.conf infra/docker/ubicaciones.conf /etc/nginx/snippets/
COPY infra/docker/40-recarga-certificados.sh /docker-entrypoint.d/40-recarga-certificados.sh
RUN chmod +x /docker-entrypoint.d/40-recarga-certificados.sh
# Plantilla de producción: se activa con NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/tls (docker-compose.prod.yml).
COPY infra/docker/nginx.tls.conf.template /etc/nginx/tls/default.conf.template
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

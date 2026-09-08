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
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

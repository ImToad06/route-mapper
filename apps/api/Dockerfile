# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules packages/shared/node_modules
COPY package.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /app/apps/api
USER bun
EXPOSE 3000
CMD ["sh", "-c", "bun src/db/migrate.ts && bun src/index.ts"]

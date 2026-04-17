FROM oven/bun:latest as base
WORKDIR /usr/src/app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY apps/web/package.json /temp/dev/apps/web/
COPY packages/db/package.json /temp/dev/packages/db/
COPY packages/types/package.json /temp/dev/packages/types/
RUN cd /temp/dev && bun install --frozen-lockfile

# Build
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN cd apps/web && bun run build

# Release
FROM base AS release
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=build /usr/src/app/apps/web/build apps/web/build
COPY --from=build /usr/src/app/apps/web/package.json apps/web/
COPY packages/db packages/db
COPY packages/types packages/types
COPY package.json .

# Run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "apps/web/build/index.js" ]

FROM oven/bun:latest as base
WORKDIR /usr/src/app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY apps/api/package.json /temp/dev/apps/api/
COPY packages/db/package.json /temp/dev/packages/db/
COPY packages/types/package.json /temp/dev/packages/types/
RUN cd /temp/dev && bun install --frozen-lockfile

# Release
FROM base AS release
COPY --from=install /temp/dev/node_modules node_modules
COPY apps/api apps/api
COPY packages/db packages/db
COPY packages/types packages/types
COPY package.json .

# Run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "apps/api/index.ts" ]

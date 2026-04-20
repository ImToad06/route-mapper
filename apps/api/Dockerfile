FROM oven/bun:latest as base
WORKDIR /usr/src/app

# Copiamos todo el monorepo para resolver dependencias de workspaces
COPY . .

# Instalamos dependencias de todo el monorepo
RUN bun install --frozen-lockfile

# Exponemos el puerto de la API
EXPOSE 3000/tcp

# Ejecutamos la API
CMD [ "bun", "run", "apps/api/index.ts" ]

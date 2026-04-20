FROM oven/bun:latest as base
WORKDIR /usr/src/app

# Copiamos todo el monorepo para resolver dependencias de workspaces
COPY . .

# Instalamos dependencias
RUN bun install --frozen-lockfile

# Construimos la aplicación de SvelteKit
RUN cd apps/web && bun run build

# Exponemos el puerto del frontend
EXPOSE 3000/tcp

# Ejecutamos la aplicación construida con svelte-adapter-bun
CMD [ "bun", "run", "apps/web/build/index.js" ]

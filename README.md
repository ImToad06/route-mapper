# Rutas L&H Distribuciones

Sistema de información logística para la gestión y asignación de rutas de distribución
(Universidad Simón Bolívar · Investigación II). Plan completo en `../PLAN-DESARROLLO.md`.

## Estructura

```
apps/api        API REST (Bun + Elysia + Drizzle + PostgreSQL)
apps/web        Interfaz (React 19 + Vite + Tailwind + shadcn/ui)
packages/shared Tipos, enums y esquemas Zod compartidos
infra/          Docker, Nginx, OSRM, VROOM, copias de seguridad
docs/           ADRs, runbook, manuales
```

## Requisitos

- [Bun](https://bun.sh) ≥ 1.2
- Docker y Docker Compose

## Puesta en marcha (desarrollo)

```bash
bun install
cp .env.example .env            # ajustar POSTGRES_PASSWORD y JWT_SECRET
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
bun run db:migrate
bun run db:seed                 # crea admin@lh.local / Admin12345 y datos de ejemplo
bun run dev                     # API en :3000, web en :5173
```

- Web: http://localhost:5173
- API: http://localhost:3000/api/salud · Documentación: http://localhost:3000/api/docs

## Comandos

| Comando | Qué hace |
|---|---|
| `bun run lint` / `lint:fix` | Biome (formato + lint) |
| `bun run typecheck` | `tsc --noEmit` en todos los paquetes |
| `bun run test` | `bun test` (api, shared) y Vitest (web) |
| `bun run build` | Build de producción de api y web |
| `bun run db:generate` | Genera una migración a partir del esquema Drizzle |
| `bun run db:migrate` | Aplica migraciones pendientes |
| `bun run db:seed` | Datos iniciales (idempotente) |

## Producción

```bash
cp .env.example .env && editar
docker compose up -d --build              # web en :8080, api, db, backup
bash infra/osrm/prepare.sh                # una vez, en una máquina con ≥ 4 GB RAM (Fase 3)
docker compose --profile mapas up -d      # osrm + vroom
```

## Flujo de trabajo con Git

- `main`: producción. `dev`: integración. Ramas de trabajo desde `dev`: `feat/p<N>-<tema>`, `fix/…`, `chore/…`, `docs/…`.
- Commits con [Conventional Commits](https://www.conventionalcommits.org/es/) (validados por commitlint):
  `feat(api): validar capacidad del vehículo`.
- PR a `dev` con CI en verde y una revisión. Squash merge. Al cerrar cada fase: checklist de revisión,
  tag `v0.<fase>.0` y PR `dev → main`.

## Convenciones

- Toda la interfaz, mensajes y documentación de usuario en **español**. Código y commits en inglés.
- API en capas: `controller` (rutas Elysia) → `service` (reglas de negocio) → `repository` (Drizzle).
- Cada endpoint con guard de rol y esquema Zod de `@lh/shared`.

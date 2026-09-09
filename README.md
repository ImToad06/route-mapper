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

Al ingresar por primera vez con la contraseña temporal del seed, el sistema exige crear una nueva.

## Autenticación (Fase 1)

- Token de acceso JWT (15 min) enviado en `Authorization: Bearer` y guardado solo en memoria en el navegador.
- Token de refresco opaco y rotativo en cookie `httpOnly` (`lh_refresco`, ruta `/api/auth`, 7 días). Reusar un
  token ya rotado invalida todas las sesiones del usuario.
- Contraseñas con argon2id (`Bun.password`). Máximo 10 intentos de ingreso por IP cada 15 minutos.
- Roles: `administrador` (incluye todo lo de `coordinador`), `coordinador`, `conductor`. Guards con
  `{ auth: true }` o `{ roles: [...] }` en cada ruta de la API.
- El administrador crea usuarios y restablece contraseñas; el sistema genera una contraseña temporal que se
  muestra una sola vez. Toda operación queda en la `bitacora` (`GET /api/bitacora`, solo administrador).

## Comandos

| Comando | Qué hace |
|---|---|
| `bun run lint` / `lint:fix` | Biome (formato + lint) |
| `bun run typecheck` | `tsc --noEmit` en todos los paquetes |
| `bun run test` | `bun test` (api, shared) y Vitest (web) |
| `bun run test:e2e` | Playwright (requiere `bunx playwright install chromium` la primera vez) |
| `bun run build` | Build de producción de api y web |
| `bun run db:generate` | Genera una migración a partir del esquema Drizzle |
| `bun run db:migrate` | Aplica migraciones pendientes |
| `bun run db:seed` | Datos iniciales (idempotente) |

## Catálogos y mapa (Fase 2)

- Módulos `vehiculos`, `conductores`, `productos`, `zonas` y `destinos` con la misma forma
  (controller → service → Drizzle) y filtros comunes: `buscar`, `pagina`, `porPagina`, `activo`.
- Vehículos y conductores los administra el rol `administrador`; productos, zonas y destinos también el `coordinador`.
- Crear un conductor crea su usuario con rol `conductor` y una contraseña temporal.
- Mapa: MapLibre GL con teselas vectoriales de [OpenFreeMap](https://openfreemap.org) (sin clave).
- Geocodificación: `GET /api/geocodificar?direccion=…` consulta Nominatim (1 req/s, `NOMINATIM_USER_AGENT`)
  con caché en `geocodificacion_cache`. Las direcciones de Barranquilla se resuelven mal con frecuencia,
  por eso el formulario de destino exige confirmar o arrastrar el marcador (`ubicacion_verificada`).
- Importación de destinos: `POST /api/destinos/importar` (máx. 100 filas, todas con coordenadas). Columnas CSV
  aceptadas: `cliente`, `direccion`, `zona` (obligatorias), `horario`, `telefono`, `latitud`, `longitud`.
  El navegador geocodifica una a una las filas sin coordenadas antes de enviarlas (con progreso) y esas
  quedan "por verificar" hasta que el coordinador confirme el marcador.
- Las violaciones de unicidad de PostgreSQL (23505) se traducen a 409 con mensaje en español en `plugins/errores.ts`.

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

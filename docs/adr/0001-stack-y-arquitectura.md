# ADR 0001 — Stack y arquitectura base

Fecha: 2026-09-08 · Estado: aceptada

## Contexto
El artículo de investigación fija una arquitectura cliente-servidor en monorepo (Bun + TypeScript),
web en React/Vite/Tailwind/shadcn, API REST con Elysia y Drizzle sobre PostgreSQL, todo en Docker.
Faltaba decidir mapas, geocodificación, optimización, herramientas de calidad y flujo de trabajo.

## Decisión
Ver `PLAN-DESARROLLO.md` §2. Resumen:
- Validación con **Zod** en `packages/shared`, consumida por Elysia (Standard Schema) y React Hook Form.
- Cliente de API tipado con **Eden Treaty** (sin generación de código).
- Mapas: **MapLibre GL** + teselas de **OpenFreeMap**; geocodificación con **Nominatim** y ajuste manual obligatorio.
- Rutas: **OSRM** autoalojado (extracto de Colombia) y **VROOM** para el VRP con capacidades.
- Calidad: **Biome**, **Lefthook**, **commitlint**, `bun test`, Vitest, Playwright.
- Estados de ruta: borrador → planificada → pendiente_aceptacion → asignada → en_curso → completada | incompleta; cancelada.

## Consecuencias
- Costo cero en servicios externos; los proveedores quedan detrás de interfaces para poder cambiar a Google Maps.
- El artículo debe actualizarse: la optimización automática pasa a estar dentro del alcance; el GPS sigue fuera.

# ADR 0004 — Reportes agregados en SQL e índices por periodo

Fecha: 2026-10-14 · Estado: aceptada

## Contexto
RNF-05/06 piden respuestas por debajo de 3 s con 10 usuarios concurrentes. Los reportes de la fase 5 traían una
fila por parada y contaban en JavaScript: correcto con pocos datos, pero memoria y tiempo crecen con el historial.

## Decisión
- Los reportes agregan en PostgreSQL con `GROUP BY` y `count(*) FILTER (WHERE …)`; la API solo recibe una fila
  por estado, conductor o zona. La forma de las respuestas no cambia, así que el cliente y las pruebas siguen igual.
- Índices para las consultas por periodo, conductor, estado, bitácora y notificaciones (migración `0004`).
- Medición reproducible: `infra/carga/carga.ts` (10 usuarios, mezcla de pantallas) sobre una base sintética de
  ~18 meses (`db/seed-carga.ts`, solo corre en bases cuyo nombre contiene `perf`). Resultados en
  `docs/rendimiento/README.md`: el peor p95 pasó de 389 ms a 78 ms.

## Consecuencias
- Con el volumen actual PostgreSQL aún elige recorrer algunas tablas completas; los índices protegen el
  crecimiento, no el estado actual.
- La optimización de rutas (OSRM + VROOM) queda fuera de esta medición: su tiempo depende del número de paradas y
  se mide en el piloto con rutas reales.

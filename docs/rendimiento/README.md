# Rendimiento (RNF-05 / RNF-06)

Criterio: respuesta por debajo de **3 s** con **10 usuarios concurrentes**.

## Cómo reproducir

```bash
# 1. Base aparte (el script de carga se niega a correr si el nombre no contiene "perf")
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
docker exec lh-rutas-db-1 psql -U lh -d postgres -c 'CREATE DATABASE lh_rutas_perf'
export DATABASE_URL=postgres://lh:<clave>@localhost:5432/lh_rutas_perf
bun run db:migrate && bun run db:seed
bun apps/api/src/db/seed-carga.ts          # ~8 100 rutas, ~97 000 paradas, ~16 000 eventos de bitácora

# 2. API contra esa base y prueba de carga
API_PORT=3900 bun apps/api/src/index.ts &
bun run test:carga -- --url http://localhost:3900 --usuarios 10 --segundos 30
```

El volumen equivale a ~18 meses de operación de 15 rutas diarias de 12 paradas. La prueba sale con
código 1 si algún endpoint supera el límite en p95 o devuelve errores.

## Resultados (2026-10-14, PostgreSQL 17 local, API en Bun, 10 usuarios × 30 s)

| Endpoint | p95 antes (ms) | p95 después (ms) |
|---|---:|---:|
| `GET /reportes/resumen-hoy` | 147 | 26 |
| `GET /rutas` (30 días) | 109 | 26 |
| `GET /rutas/:id` | 129 | 37 |
| `GET /destinos` | 103 | 20 |
| `GET /destinos/mapa` | 124 | 52 |
| `GET /reportes/rutas` (1 año) | 225 | 52 |
| `GET /reportes/conductores` (1 año) | 313 | 62 |
| `GET /reportes/zonas` (1 año) | 192 | 78 |
| `GET /bitacora` | 109 | 24 |
| `GET /reportes/rutas/exportar` (1 año) | 389 | 66 |

El peor p95 pasó de 389 ms a 78 ms; todo queda ~40 veces por debajo del límite.

## Qué se cambió

1. **Agregaciones en SQL.** Los reportes traían una fila por parada y contaban en JavaScript. Ahora usan
   `GROUP BY` + `count(*) FILTER (...)` (`apps/api/src/modules/reportes/reportes.service.ts`): la memoria
   y el tiempo ya no crecen con el número de paradas.
2. **Índices** (`0004_indices_rendimiento.sql`): `ruta(fecha)`, `ruta(conductor_id)`, `ruta(estado)`,
   `ruta_parada(destino_id)`, `ruta_historial_estado(ruta_id, fecha_hora)`, `bitacora(fecha_hora)`,
   `bitacora(usuario_id)`, `notificacion(usuario_id, creado_en)`, `parada_producto(producto_id)`.
   Con el volumen actual PostgreSQL aún prefiere recorrer la tabla en varias consultas (son pocas filas);
   los índices evitan que la degradación aparezca al crecer los datos.

## Fuera de esta medición

`POST /rutas/optimizar` depende de OSRM + VROOM y su tiempo crece con el número de paradas; se mide aparte
en el piloto con rutas reales. La geocodificación depende de Nominatim público (1 req/s).

# Piloto con L&H Distribuciones

Objetivo: obtener los resultados que el artículo marca como `[PENDIENTE]` comparando la planificación manual
actual con la hecha en el sistema, sobre los mismos tipos de jornada.

## Qué se mide

| Indicador | Cómo se mide | Dónde se anota |
|---|---|---|
| Tiempo de planificación por ruta (min) | cronómetro desde que el coordinador empieza a armar la ruta hasta que queda lista para entregar al conductor. En el sistema: de `creadoEn` a la planificación; en manual: cronómetro | `mediciones.csv` |
| Errores de asignación | por ruta, contados por el coordinador al revisar la jornada: **solapamientos** (un conductor o vehículo en dos rutas a la vez), **sobrecapacidad** (carga mayor que la del vehículo) y **otros** (parada olvidada o repetida, dirección equivocada) | `mediciones.csv` |
| Entregas realizadas / fallidas | del sistema (`Reportes → Rutas`); en manual, de la planilla del día | `mediciones.csv` |
| Percepción | cuestionario corto al coordinador y a los conductores al final (1–5): facilidad de uso, utilidad del mapa, confianza en el orden de paradas | `docs/piloto/encuestas/` |

## Protocolo

1. **Línea base (manual), 3 a 5 jornadas típicas** antes de usar el sistema: el coordinador planifica como
   siempre y anota tiempos y errores. Si la empresa no puede esperar, se usan las planillas anteriores para
   contar errores y se cronometra una planificación rehecha con el método manual.
2. **Capacitación** de 1 hora al coordinador y 30 minutos a cada conductor (el manual está en
   `docs/manual-usuario.md`). Cargar antes la bodega, zonas, vehículos, conductores, productos y destinos
   (importación CSV de las planillas).
3. **Periodo con el sistema, mismo número de jornadas** (mínimo 5, ideal 10). Mismas reglas de conteo. El
   coordinador sigue pudiendo usar el método manual; cada ruta se anota con su método.
4. **Comparación** con `bun docs/piloto/resumen.ts docs/piloto/mediciones.csv` (tabla lista para el artículo).
5. **Registro de problemas** del piloto en `docs/piloto/incidencias.md` (fecha, qué pasó, cómo se resolvió).

## Reglas para que los datos sirvan

- Una fila por ruta. No promediar a mano: el script calcula todo.
- Anote también las rutas con errores graves o cancelaciones; omitirlas sesga el resultado.
- No mezclar cargas muy distintas: anote el número de paradas para poder comparar por tamaño de ruta.
- Datos personales: nombres de clientes y conductores no van en este archivo, solo el código de la ruta.

## Archivos

- `mediciones.csv`: plantilla vacía (solo encabezado). Es el único archivo con datos reales; no hay datos de ejemplo.
- `resumen.ts`: calcula por método (manual / sistema) el número de rutas, tiempo medio y mediano, errores por
  100 rutas, entregas fallidas y la variación porcentual. Prueba en `resumen.test.ts`.

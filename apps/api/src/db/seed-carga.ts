/**
 * Datos sintéticos de volumen para medir rendimiento (RNF-05/06). Solo corre contra una base cuyo
 * nombre contenga `perf` para no ensuciar desarrollo ni producción.
 * Uso: DATABASE_URL=postgres://…/lh_rutas_perf bun src/db/seed-carga.ts
 * Orden: db:migrate → db:seed → este script.
 */
import { sql } from './client.ts'

const nombreBase = new URL(process.env.DATABASE_URL ?? '').pathname.slice(1)
if (!nombreBase.includes('perf')) {
  console.error(
    `Se niega a correr contra "${nombreBase}": el nombre de la base debe contener "perf".`,
  )
  process.exit(1)
}

const DIAS = Number(process.env.CARGA_DIAS ?? 540)
const RUTAS_POR_DIA = Number(process.env.CARGA_RUTAS_DIA ?? 15)
const PARADAS_POR_RUTA = Number(process.env.CARGA_PARADAS ?? 12)
const DESTINOS = Number(process.env.CARGA_DESTINOS ?? 1500)
const CONDUCTORES = RUTAS_POR_DIA

console.log(`Generando ${DIAS * RUTAS_POR_DIA} rutas × ${PARADAS_POR_RUTA} paradas…`)
const t0 = performance.now()

await sql.begin(async (tx) => {
  const [admin] = await tx`SELECT id FROM usuario ORDER BY id LIMIT 1`
  const [rolConductor] = await tx`SELECT id FROM rol WHERE nombre = 'conductor'`
  if (!admin || !rolConductor) throw new Error('Ejecute db:seed antes de este script')

  await tx`
    INSERT INTO usuario (rol_id, nombre, correo, contrasena_hash)
    SELECT ${rolConductor.id}, 'Conductor carga ' || g, 'carga' || g || '@lh.test', 'x'
    FROM generate_series(1, ${CONDUCTORES}) g
    ON CONFLICT DO NOTHING`
  await tx`
    INSERT INTO conductor (usuario_id, nombre, documento, licencia)
    SELECT u.id, u.nombre, 'DOC-' || u.id, 'LIC-' || u.id
    FROM usuario u WHERE u.correo LIKE 'carga%@lh.test'
    ON CONFLICT DO NOTHING`
  await tx`
    INSERT INTO destino (zona_id, nombre_cliente, direccion, latitud, longitud, ubicacion_verificada)
    SELECT (SELECT id FROM zona ORDER BY id OFFSET (g % 5) LIMIT 1),
           'Cliente carga ' || g, 'Calle ' || g || ' # 1-1',
           10.9 + random() * 0.15, -74.85 + random() * 0.12, true
    FROM generate_series(1, ${DESTINOS}) g`

  // Rutas históricas (terminales) repartidas entre los conductores de carga.
  await tx`
    INSERT INTO ruta (codigo, fecha, estado, conductor_id, creado_por, asignada_en, aceptada_en,
                      iniciada_en, finalizada_en)
    SELECT 'CARGA-' || d.n || '-' || c.n,
           (CURRENT_DATE - d.n),
           (ARRAY['completada','completada','completada','incompleta','cancelada'])[1 + (d.n + c.n) % 5]::estado_ruta,
           (SELECT id FROM conductor WHERE documento LIKE 'DOC-%' ORDER BY id OFFSET (c.n - 1) LIMIT 1),
           ${admin.id},
           (CURRENT_DATE - d.n) + time '06:00', (CURRENT_DATE - d.n) + time '06:10',
           (CURRENT_DATE - d.n) + time '07:00', (CURRENT_DATE - d.n) + time '15:00'
    FROM generate_series(1, ${DIAS}) d(n), generate_series(1, ${RUTAS_POR_DIA}) c(n)
    WHERE (SELECT id FROM conductor WHERE documento LIKE 'DOC-%' ORDER BY id OFFSET (c.n - 1) LIMIT 1) IS NOT NULL`

  await tx`
    INSERT INTO ruta_parada (ruta_id, destino_id, orden, estado_entrega, hora_confirmacion, novedad_tipo)
    SELECT r.id,
           d.id,
           s.n,
           (ARRAY['entregada','entregada','entregada','entregada','fallida','pendiente'])[1 + (r.id + s.n) % 6]::estado_parada,
           CASE WHEN (r.id + s.n) % 6 < 5 THEN r.fecha + time '10:00' END,
           CASE WHEN (r.id + s.n) % 6 = 4 THEN 'cliente_ausente'::tipo_novedad END
    FROM ruta r
    CROSS JOIN generate_series(1, ${PARADAS_POR_RUTA}) s(n)
    JOIN LATERAL (
      SELECT id FROM destino WHERE nombre_cliente LIKE 'Cliente carga %'
      ORDER BY id OFFSET ((r.id * 7 + s.n * 13) % ${DESTINOS}) LIMIT 1
    ) d ON true
    WHERE r.codigo LIKE 'CARGA-%'`

  await tx`
    INSERT INTO parada_producto (ruta_parada_id, producto_id, cantidad)
    SELECT p.id, pr.id, 1 + (p.id % 9)
    FROM ruta_parada p JOIN producto pr ON pr.id IN (
      (SELECT min(id) FROM producto) + (p.id % 3), (SELECT min(id) FROM producto) + 3 + (p.id % 3))
    WHERE p.ruta_id IN (SELECT id FROM ruta WHERE codigo LIKE 'CARGA-%')`

  await tx`
    INSERT INTO ruta_historial_estado (ruta_id, estado_anterior, estado_nuevo, usuario_id, fecha_hora)
    SELECT r.id, e.ant, e.nue, ${admin.id}, r.fecha + time '06:00' + (e.k || ' hours')::interval
    FROM ruta r CROSS JOIN (VALUES
      (0, NULL, 'borrador'), (1, 'borrador', 'planificada'), (2, 'planificada', 'pendiente_aceptacion'),
      (3, 'pendiente_aceptacion', 'asignada'), (4, 'asignada', 'en_curso')) e(k, ant, nue)
    WHERE r.codigo LIKE 'CARGA-%'`

  await tx`
    INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, descripcion, fecha_hora)
    SELECT ${admin.id}, (ARRAY['crear','editar','asignar','iniciar_sesion'])[1 + g % 4], 'ruta', g,
           'Evento sintético ' || g, now() - (g || ' minutes')::interval * 3
    FROM generate_series(1, ${DIAS * RUTAS_POR_DIA * 2}) g`
})

await sql`ANALYZE`
console.log(`Listo en ${((performance.now() - t0) / 1000).toFixed(1)} s.`)
await sql.end()

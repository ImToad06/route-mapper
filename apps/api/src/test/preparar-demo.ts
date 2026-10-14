/**
 * Prepara una base de DEMOSTRACIÓN para las capturas del manual (nunca contra producción):
 *   DATABASE_URL=postgres://…/lh_rutas_demo bun run db:migrate && bun run db:seed
 *   API_PORT=3901 DATABASE_URL=… OSRM_URL=… VROOM_URL=… bun apps/api/src/index.ts &
 *   bun apps/api/src/test/preparar-demo.ts http://localhost:3901
 * Crea por la API real conductores, rutas del día en distintos estados y, por SQL, un mes de historial
 * para los reportes. Los nombres son ficticios.
 */
import postgres from 'postgres'

const API = `${process.argv[2] ?? 'http://localhost:3901'}/api`
const BD = process.env.DATABASE_URL ?? ''
if (!new URL(BD).pathname.includes('demo')) {
  console.error('DATABASE_URL debe apuntar a una base cuyo nombre contenga "demo"')
  process.exit(1)
}
const sql = postgres(BD, { onnotice: () => {} })
const hoy = new Date()
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

await sql`UPDATE usuario SET debe_cambiar_contrasena = false, contrasena_hash = ${await Bun.password.hash('Demo12345', { algorithm: 'argon2id' })} WHERE correo = 'admin@lh.local'`

async function llamar<T = unknown>(
  token: string | null,
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
): Promise<T> {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status} ${await r.text()}`)
  return (await r.json()) as T
}

const { tokenAcceso: admin } = await llamar<{ tokenAcceso: string }>(null, 'POST', '/auth/login', {
  correo: 'admin@lh.local',
  contrasena: 'Demo12345',
})

const vehiculos = await llamar<{ datos: { id: number; placa: string }[] }>(
  admin,
  'GET',
  '/vehiculos?porPagina=50',
)
const veh = vehiculos.datos
const conductoresDemo = [
  {
    nombre: 'Carlos Pérez Rojas',
    documento: '1045678901',
    licencia: 'C2-4521897',
    telefono: '3015550142',
    correo: 'carlos.perez@lh.demo',
    veh: veh[0]?.id,
  },
  {
    nombre: 'Andrés Gómez Ruiz',
    documento: '1129384756',
    licencia: 'C2-3318402',
    telefono: '3125550177',
    correo: 'andres.gomez@lh.demo',
    veh: veh[1]?.id,
  },
  {
    nombre: 'Luis Martínez Cano',
    documento: '72938475',
    licencia: 'C1-2209315',
    telefono: '3205550163',
    correo: 'luis.martinez@lh.demo',
    veh: veh[2]?.id,
  },
]
const idsConductor: number[] = []
for (const c of conductoresDemo) {
  const r = await llamar<{ id?: number; conductor?: { id: number } }>(
    admin,
    'POST',
    '/conductores',
    {
      nombre: c.nombre,
      documento: c.documento,
      licencia: c.licencia,
      telefono: c.telefono,
      correo: c.correo,
      contrasena: 'Conductor12345',
      vehiculoId: c.veh ?? null,
    },
  )
  idsConductor.push((r.id ?? r.conductor?.id) as number)
}
await sql`UPDATE usuario SET debe_cambiar_contrasena = false WHERE correo LIKE '%@lh.demo'`

const destinos = (await llamar<{ datos: { id: number }[] }>(admin, 'GET', '/destinos?porPagina=50'))
  .datos
const productos = (
  await llamar<{ datos: { id: number }[] }>(admin, 'GET', '/productos?porPagina=50')
).datos
const paradasDe = (ids: number[]) => ({
  paradas: ids.map((destinoId, i) => ({
    destinoId,
    productos: [
      { productoId: (productos[i % productos.length] as { id: number }).id, cantidad: 2 + (i % 4) },
      {
        productoId: (productos[(i + 2) % productos.length] as { id: number }).id,
        cantidad: 1 + (i % 3),
      },
    ],
  })),
})

async function crearRuta(vehiculoId: number | undefined, ids: number[], observaciones: string) {
  const { id } = await llamar<{ id: number }>(admin, 'POST', '/rutas', {
    fecha: iso(hoy),
    vehiculoId: vehiculoId ?? null,
    observaciones,
  })
  await llamar(admin, 'PUT', `/rutas/${id}/paradas`, paradasDe(ids))
  await llamar(admin, 'POST', `/rutas/${id}/optimizar`)
  await llamar(admin, 'POST', `/rutas/${id}/planificar`)
  return id
}
const d = destinos.map((x) => x.id)
// Ruta 1: Norte y centro, en curso con dos entregas hechas.
const r1 = await crearRuta(veh[0]?.id, d.slice(0, 6), 'Pedidos de la mañana, zona norte')
await llamar(admin, 'POST', `/rutas/${r1}/asignar`, { conductorId: idsConductor[0] })
// Ruta 2: asignada y pendiente de aceptación.
const r2 = await crearRuta(veh[1]?.id, d.slice(4, 8), 'Reposición sur')
await llamar(admin, 'POST', `/rutas/${r2}/asignar`, { conductorId: idsConductor[1] })
// Ruta 3: planificada, lista para asignar.
await crearRuta(veh[2]?.id, d.slice(6, 10), 'Entregas del área metropolitana')

// El conductor 1 acepta, inicia y entrega dos paradas (por la API, como lo haría la app).
const { tokenAcceso: tc } = await llamar<{ tokenAcceso: string }>(null, 'POST', '/auth/login', {
  correo: conductoresDemo[0]?.correo,
  contrasena: 'Conductor12345',
})
await llamar(tc, 'POST', `/rutas/${r1}/aceptar`)
await llamar(tc, 'POST', `/rutas/${r1}/iniciar`)
const detalle = await llamar<{ paradas: { id: number }[] }>(tc, 'GET', `/rutas/${r1}`)
for (const p of detalle.paradas.slice(0, 2))
  await llamar(tc, 'POST', `/rutas/${r1}/paradas/${p.id}/entregar`)

// Historial de 30 días (SQL) para que los reportes muestren datos creíbles.
await sql`
  INSERT INTO ruta (codigo, fecha, estado, conductor_id, vehiculo_id, creado_por, asignada_en, aceptada_en, iniciada_en, finalizada_en)
  SELECT 'H-' || to_char(CURRENT_DATE - d.n, 'YYYYMMDD') || '-' || c.n, CURRENT_DATE - d.n,
         (ARRAY['completada','completada','completada','completada','incompleta'])[1 + (d.n + c.n) % 5]::estado_ruta,
         (SELECT id FROM conductor ORDER BY id OFFSET (c.n - 1) LIMIT 1), (SELECT id FROM vehiculo ORDER BY id OFFSET (c.n - 1) LIMIT 1),
         (SELECT id FROM usuario WHERE correo = 'admin@lh.local'),
         (CURRENT_DATE - d.n) + time '06:00', (CURRENT_DATE - d.n) + time '06:12', (CURRENT_DATE - d.n) + time '07:00', (CURRENT_DATE - d.n) + time '14:30'
  FROM generate_series(1, 30) d(n), generate_series(1, 3) c(n)`
await sql`
  INSERT INTO ruta_parada (ruta_id, destino_id, orden, estado_entrega, hora_confirmacion, novedad_tipo)
  SELECT r.id, (SELECT id FROM destino ORDER BY id OFFSET ((r.id + s.n * 3) % (SELECT count(*) FROM destino)) LIMIT 1), s.n,
         (CASE WHEN (r.id + s.n) % 9 = 0 THEN 'fallida' ELSE 'entregada' END)::estado_parada,
         r.fecha + time '10:00',
         CASE WHEN (r.id + s.n) % 9 = 0 THEN 'cliente_ausente'::tipo_novedad END
  FROM ruta r CROSS JOIN generate_series(1, 6) s(n) WHERE r.codigo LIKE 'H-%'`
console.log(
  'Demo lista. Admin: admin@lh.local / Demo12345 · Conductor: carlos.perez@lh.demo / Conductor12345',
)
await sql.end()

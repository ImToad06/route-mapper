/**
 * Prueba de carga de la API (RNF-05/06): N usuarios virtuales concurrentes recorren las pantallas
 * del panel y se reporta p50/p95/máximo por endpoint. Sin dependencias: solo Bun y fetch.
 *
 * Uso: bun infra/carga/carga.ts [--url http://localhost:3000] [--usuarios 10] [--segundos 30]
 *      [--correo admin@lh.local] [--clave Admin12345] [--limite-ms 3000]
 * Sale con código 1 si algún endpoint supera el límite en p95 o hay errores.
 */
const arg = (nombre: string, def: string) => {
  const i = process.argv.indexOf(`--${nombre}`)
  return i >= 0 ? (process.argv[i + 1] ?? def) : def
}
const URL_BASE = arg('url', 'http://localhost:3000').replace(/\/$/, '')
const USUARIOS = Number(arg('usuarios', '10'))
const SEGUNDOS = Number(arg('segundos', '30'))
const LIMITE_MS = Number(arg('limite-ms', '3000'))

const iso = (d: Date) => d.toISOString().slice(0, 10)
const hoy = new Date()
const hace = (dias: number) => iso(new Date(hoy.getTime() - dias * 86_400_000))

const login = await fetch(`${URL_BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    correo: arg('correo', 'admin@lh.local'),
    contrasena: arg('clave', 'Admin12345'),
  }),
})
if (!login.ok) {
  console.error(`No se pudo iniciar sesión (${login.status}): ${await login.text()}`)
  process.exit(2)
}
const { tokenAcceso } = (await login.json()) as { tokenAcceso: string }
const cabeceras = { authorization: `Bearer ${tokenAcceso}` }

const lista = (await (
  await fetch(`${URL_BASE}/api/rutas?porPagina=5`, { headers: cabeceras })
).json()) as {
  datos?: { id: number }[]
  items?: { id: number }[]
}
const idsRuta = (lista.datos ?? lista.items ?? []).map((r) => r.id)

/** Escenarios con peso: lo que más hace un coordinador es listar rutas, ver el panel y reportes. */
const escenarios: { nombre: string; peso: number; ruta: () => string }[] = [
  { nombre: 'GET /reportes/resumen-hoy', peso: 5, ruta: () => '/api/reportes/resumen-hoy' },
  {
    nombre: 'GET /rutas (30 días)',
    peso: 5,
    ruta: () => `/api/rutas?desde=${hace(30)}&hasta=${hace(0)}&porPagina=20`,
  },
  {
    nombre: 'GET /rutas/:id',
    peso: 4,
    ruta: () => `/api/rutas/${idsRuta[Math.floor(Math.random() * idsRuta.length)] ?? 1}`,
  },
  {
    nombre: 'GET /destinos',
    peso: 3,
    ruta: () => `/api/destinos?pagina=${1 + Math.floor(Math.random() * 20)}&porPagina=20`,
  },
  { nombre: 'GET /destinos/mapa', peso: 2, ruta: () => '/api/destinos/mapa' },
  {
    nombre: 'GET /reportes/rutas (30 días)',
    peso: 2,
    ruta: () => `/api/reportes/rutas?desde=${hace(30)}&hasta=${hace(0)}`,
  },
  {
    nombre: 'GET /reportes/rutas (1 año)',
    peso: 1,
    ruta: () => `/api/reportes/rutas?desde=${hace(365)}&hasta=${hace(0)}`,
  },
  {
    nombre: 'GET /reportes/conductores (90 días)',
    peso: 1,
    ruta: () => `/api/reportes/conductores?desde=${hace(90)}&hasta=${hace(0)}`,
  },
  {
    nombre: 'GET /reportes/conductores (1 año)',
    peso: 1,
    ruta: () => `/api/reportes/conductores?desde=${hace(365)}&hasta=${hace(0)}`,
  },
  {
    nombre: 'GET /reportes/zonas (1 año)',
    peso: 1,
    ruta: () => `/api/reportes/zonas?desde=${hace(365)}&hasta=${hace(0)}`,
  },
  {
    nombre: 'GET /bitacora',
    peso: 1,
    ruta: () => `/api/bitacora?pagina=${1 + Math.floor(Math.random() * 50)}&porPagina=50`,
  },
  {
    nombre: 'GET /reportes/rutas/exportar (1 año)',
    peso: 1,
    ruta: () => `/api/reportes/rutas/exportar?desde=${hace(365)}&hasta=${hace(0)}`,
  },
]
const bolsa = escenarios.flatMap((e) => Array<typeof e>(e.peso).fill(e))

const tiempos = new Map<string, number[]>()
const errores = new Map<string, number>()
const fin = Date.now() + SEGUNDOS * 1000

async function usuarioVirtual() {
  while (Date.now() < fin) {
    const esc = bolsa[Math.floor(Math.random() * bolsa.length)] as (typeof escenarios)[number]
    const t0 = performance.now()
    let ok = false
    try {
      const r = await fetch(`${URL_BASE}${esc.ruta()}`, { headers: cabeceras })
      await r.arrayBuffer()
      ok = r.ok
    } catch {}
    const ms = performance.now() - t0
    ok
      ? tiempos.set(esc.nombre, [...(tiempos.get(esc.nombre) ?? []), ms])
      : errores.set(esc.nombre, (errores.get(esc.nombre) ?? 0) + 1)
    // Pausa de lectura entre acciones: un coordinador no dispara peticiones sin parar.
    await Bun.sleep(100 + Math.random() * 300)
  }
}

console.log(`${USUARIOS} usuarios × ${SEGUNDOS} s contra ${URL_BASE}`)
await Promise.all(Array.from({ length: USUARIOS }, usuarioVirtual))

const pct = (v: number[], p: number) =>
  v.slice().sort((a, b) => a - b)[Math.min(v.length - 1, Math.floor((v.length * p) / 100))] ?? 0
let fallo = false
console.log(
  `\n${'endpoint'.padEnd(40)} ${'n'.padStart(5)} ${'p50'.padStart(7)} ${'p95'.padStart(7)} ${'máx'.padStart(7)} err`,
)
for (const e of escenarios) {
  const v = tiempos.get(e.nombre) ?? []
  const err = errores.get(e.nombre) ?? 0
  const p95 = pct(v, 95)
  if (err > 0 || p95 > LIMITE_MS) fallo = true
  console.log(
    `${e.nombre.padEnd(40)} ${String(v.length).padStart(5)} ${pct(v, 50).toFixed(0).padStart(7)} ${p95.toFixed(0).padStart(7)} ${Math.max(
      0,
      ...v,
    )
      .toFixed(0)
      .padStart(7)} ${err}${p95 > LIMITE_MS ? '  ← supera el límite' : ''}`,
  )
}
console.log(
  fallo
    ? `\nFALLA: algún endpoint superó ${LIMITE_MS} ms en p95 o dio errores.`
    : `\nOK: todos bajo ${LIMITE_MS} ms en p95.`,
)
process.exit(fallo ? 1 : 0)

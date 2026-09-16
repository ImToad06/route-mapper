import { describe, expect, test } from 'bun:test'
import { app } from '../app.ts'

/**
 * Rutas públicas a propósito (RF-01, apertura de sesión y documentación). Cualquier ruta nueva que no
 * esté aquí debe llevar `auth: true` o `roles: [...]`; si no, esta prueba falla — así se detecta en CI
 * el bug de la fase 4 donde un `.guard()` encadenado sin callback dejaba rutas sin proteger en silencio.
 */
const RUTAS_PUBLICAS = new Set([
  'GET /api/docs',
  'GET /api/docs/json',
  'GET /api/salud/',
  'POST /api/auth/login',
  'POST /api/auth/refrescar',
  'POST /api/auth/cerrar',
])

interface HookMacro {
  subType?: string
  fn?: { name?: string }
}

function tieneGuardia(route: { hooks?: { beforeHandle?: HookMacro[] } }): boolean {
  const beforeHandle = route.hooks?.beforeHandle ?? []
  return beforeHandle.some((h) => h.subType === 'resolve' || h.fn?.name === 'resolve')
}

describe('cobertura de guardias de autenticación', () => {
  const rutas = (
    app as unknown as { routes: { method: string; path: string; hooks?: unknown }[] }
  ).routes.filter((r) => r.method !== 'OPTIONS')

  test('hay rutas registradas para revisar', () => {
    expect(rutas.length).toBeGreaterThan(20)
  })

  for (const ruta of rutas) {
    const id = `${ruta.method} ${ruta.path}`
    const esPublica = RUTAS_PUBLICAS.has(id)
    test(`${id} — ${esPublica ? 'pública a propósito' : 'debe exigir auth o roles'}`, () => {
      expect(tieneGuardia(ruta as { hooks?: { beforeHandle?: HookMacro[] } })).toBe(!esPublica)
    })
  }

  test('toda ruta en RUTAS_PUBLICAS sigue existiendo (evita entradas obsoletas)', () => {
    const registradas = new Set(rutas.map((r) => `${r.method} ${r.path}`))
    for (const publica of RUTAS_PUBLICAS) expect(registradas.has(publica)).toBe(true)
  })
})

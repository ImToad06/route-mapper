import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, inArray, like } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { conductor, destino, ruta, vehiculo, zona } from '../../db/schema/index.ts'
import {
  bearer,
  crearUsuarioDePrueba,
  iniciarSesionComo,
  json,
  limpiarUsuariosDePrueba,
} from '../../test/helpers.ts'

let admin: { id: number; correo: string; contrasena: string }
let coord: { id: number; correo: string; contrasena: string }
let tokenAdmin: string
let tokenCoord: string
const sufijo = Date.now().toString(36).slice(-4).toUpperCase()

interface Conductor {
  usuarioId: number
  conductorId: number
  token: string
}
const usuarioIds: number[] = []

const ids = { zonaA: 0, zonaB: 0, destinoA: 0, destinoB: 0, vehiculo: 0 }
const DESDE = '2031-06-01'
const HASTA = '2031-06-02'
const FUERA_DE_PERIODO = '2031-05-01'

const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const placa = () =>
  `R${letras[Math.floor(Math.random() * 24)]}${letras[Math.floor(Math.random() * 24)]}${String(Date.now()).slice(-3)}`

async function crearConductorDePrueba(): Promise<Conductor> {
  const documento = String(Date.now()).slice(-9) + Math.floor(Math.random() * 90 + 10)
  const correo = `test-reportes-cond-${sufijo}-${Math.random().toString(36).slice(2, 6)}@lh.test`
  const res = await json(
    'POST',
    '/conductores',
    { nombre: `Reportes Cond ${sufijo}`, documento, licencia: `LIC-${documento}`, correo },
    bearer(tokenAdmin),
  )
  const body = (await res.json()) as {
    conductor: { id: number; usuarioId: number }
    contrasenaTemporal: string
  }
  usuarioIds.push(body.conductor.usuarioId)
  const sesion = await iniciarSesionComo(correo, body.contrasenaTemporal)
  return {
    usuarioId: body.conductor.usuarioId,
    conductorId: body.conductor.id,
    token: sesion.tokenAcceso,
  }
}

/** Crea, planifica y asigna una ruta con las paradas dadas (destinos, sin productos). */
async function crearRutaAsignada(fecha: string, destinoIds: number[], conductorId: number) {
  const res = await json('POST', '/rutas', { fecha, vehiculoId: ids.vehiculo }, bearer(tokenCoord))
  const { id, codigo } = (await res.json()) as { id: number; codigo: string }
  await json(
    'PUT',
    `/rutas/${id}/paradas`,
    { paradas: destinoIds.map((destinoId) => ({ destinoId, productos: [] })) },
    bearer(tokenCoord),
  )
  await json('POST', `/rutas/${id}/planificar`, undefined, bearer(tokenCoord))
  await json('POST', `/rutas/${id}/asignar`, { conductorId }, bearer(tokenCoord))
  return { id, codigo }
}

/** Ruta completa: asignada → aceptada → en curso, lista para entregar/fallar sus paradas. */
async function iniciarRuta(id: number, tokenConductor: string) {
  await json('POST', `/rutas/${id}/aceptar`, undefined, bearer(tokenConductor))
  await json('POST', `/rutas/${id}/iniciar`, undefined, bearer(tokenConductor))
}

async function paradasDe(id: number) {
  const detalle = (await (
    await json('GET', `/rutas/${id}`, undefined, bearer(tokenCoord))
  ).json()) as {
    paradas: { id: number; destino: { id: number } }[]
  }
  return detalle.paradas
}

beforeAll(async () => {
  admin = await crearUsuarioDePrueba({ rol: 'administrador' })
  coord = await crearUsuarioDePrueba({ rol: 'coordinador' })
  tokenAdmin = (await iniciarSesionComo(admin.correo, admin.contrasena)).tokenAcceso
  tokenCoord = (await iniciarSesionComo(coord.correo, coord.contrasena)).tokenAcceso

  const [zA] = await db
    .insert(zona)
    .values({ nombre: `Zona Reportes A ${sufijo}` })
    .returning({ id: zona.id })
  const [zB] = await db
    .insert(zona)
    .values({ nombre: `Zona Reportes B ${sufijo}` })
    .returning({ id: zona.id })
  ids.zonaA = zA?.id ?? 0
  ids.zonaB = zB?.id ?? 0
  const [dA] = await db
    .insert(destino)
    .values({
      zonaId: ids.zonaA,
      nombreCliente: `Cliente Reportes A ${sufijo}`,
      direccion: 'Calle Reportes 1',
      latitud: 10.9,
      longitud: -74.8,
      ubicacionVerificada: true,
    })
    .returning({ id: destino.id })
  const [dB] = await db
    .insert(destino)
    .values({
      zonaId: ids.zonaB,
      nombreCliente: `Cliente Reportes B ${sufijo}`,
      direccion: 'Calle Reportes 2',
      latitud: 10.95,
      longitud: -74.82,
      ubicacionVerificada: true,
    })
    .returning({ id: destino.id })
  ids.destinoA = dA?.id ?? 0
  ids.destinoB = dB?.id ?? 0
  const [v] = await db
    .insert(vehiculo)
    .values({ placa: placa(), tipo: 'Grande', capacidadKg: '5000' })
    .returning({ id: vehiculo.id })
  ids.vehiculo = v?.id ?? 0
})

afterAll(async () => {
  await db.delete(ruta).where(like(ruta.codigo, 'R-2031%'))
  await db.delete(conductor).where(inArray(conductor.usuarioId, usuarioIds))
  await db.delete(destino).where(inArray(destino.id, [ids.destinoA, ids.destinoB]))
  await db.delete(zona).where(inArray(zona.id, [ids.zonaA, ids.zonaB]))
  await db.delete(vehiculo).where(eq(vehiculo.id, ids.vehiculo))
  await limpiarUsuariosDePrueba([admin.id, coord.id, ...usuarioIds])
})

describe('reportes: rutas, conductores y zonas por periodo (RF-22, RF-23)', () => {
  test('con datos conocidos, los totales del periodo son exactos', async () => {
    const cond1 = await crearConductorDePrueba()
    const cond2 = await crearConductorDePrueba()

    // Ruta A (conductor 1, día 1): 2 paradas (zona A y zona B), ambas entregadas → completada.
    const rutaA = await crearRutaAsignada(DESDE, [ids.destinoA, ids.destinoB], cond1.conductorId)
    await iniciarRuta(rutaA.id, cond1.token)
    for (const p of await paradasDe(rutaA.id)) {
      await json(
        'POST',
        `/rutas/${rutaA.id}/paradas/${p.id}/entregar`,
        undefined,
        bearer(cond1.token),
      )
    }
    await json('POST', `/rutas/${rutaA.id}/finalizar`, undefined, bearer(cond1.token))

    // Ruta B (conductor 1, día 2): 1 parada (zona A), fallida → incompleta.
    const rutaB = await crearRutaAsignada(HASTA, [ids.destinoA], cond1.conductorId)
    await iniciarRuta(rutaB.id, cond1.token)
    const [paradaB] = await paradasDe(rutaB.id)
    await json(
      'POST',
      `/rutas/${rutaB.id}/paradas/${paradaB?.id}/fallar`,
      { tipo: 'cliente_ausente', nota: 'Prueba' },
      bearer(cond1.token),
    )
    await json('POST', `/rutas/${rutaB.id}/finalizar`, undefined, bearer(cond1.token))

    // Ruta C (conductor 2, día 1): 1 parada (zona B), entregada → completada.
    const rutaC = await crearRutaAsignada(DESDE, [ids.destinoB], cond2.conductorId)
    await iniciarRuta(rutaC.id, cond2.token)
    const [paradaC] = await paradasDe(rutaC.id)
    await json(
      'POST',
      `/rutas/${rutaC.id}/paradas/${paradaC?.id}/entregar`,
      undefined,
      bearer(cond2.token),
    )
    await json('POST', `/rutas/${rutaC.id}/finalizar`, undefined, bearer(cond2.token))

    // Ruta D: fuera del periodo consultado, no debe contarse en ningún reporte.
    await crearRutaAsignada(FUERA_DE_PERIODO, [ids.destinoA], cond2.conductorId)

    const rRutas = await json(
      'GET',
      `/reportes/rutas?desde=${DESDE}&hasta=${HASTA}`,
      undefined,
      bearer(tokenCoord),
    )
    expect(rRutas.status).toBe(200)
    const reporteRutas = (await rRutas.json()) as {
      totalRutas: number
      rutasPorEstado: Record<string, number>
      entregas: { realizadas: number; pendientes: number; fallidas: number }
    }
    expect(reporteRutas.totalRutas).toBe(3)
    expect(reporteRutas.rutasPorEstado.completada).toBe(2)
    expect(reporteRutas.rutasPorEstado.incompleta).toBe(1)
    expect(reporteRutas.entregas).toEqual({ realizadas: 3, pendientes: 0, fallidas: 1 })

    const rConductores = await json(
      'GET',
      `/reportes/conductores?desde=${DESDE}&hasta=${HASTA}`,
      undefined,
      bearer(tokenCoord),
    )
    const reporteConductores = (await rConductores.json()) as {
      conductorId: number
      totalRutas: number
      completadas: number
      incompletas: number
      paradasEntregadas: number
      paradasFallidas: number
      novedades: number
    }[]
    const c1 = reporteConductores.find((c) => c.conductorId === cond1.conductorId)
    const c2 = reporteConductores.find((c) => c.conductorId === cond2.conductorId)
    expect(c1).toMatchObject({
      totalRutas: 2,
      completadas: 1,
      incompletas: 1,
      paradasEntregadas: 2,
      paradasFallidas: 1,
      novedades: 1,
    })
    expect(c2).toMatchObject({
      totalRutas: 1,
      completadas: 1,
      incompletas: 0,
      paradasEntregadas: 1,
      paradasFallidas: 0,
      novedades: 0,
    })

    const rZonas = await json(
      'GET',
      `/reportes/zonas?desde=${DESDE}&hasta=${HASTA}`,
      undefined,
      bearer(tokenCoord),
    )
    const reporteZonas = (await rZonas.json()) as {
      zonaId: number
      totalParadas: number
      entregadas: number
      fallidas: number
    }[]
    const zA = reporteZonas.find((z) => z.zonaId === ids.zonaA)
    const zB = reporteZonas.find((z) => z.zonaId === ids.zonaB)
    expect(zA).toMatchObject({ totalParadas: 2, entregadas: 1, fallidas: 1 })
    expect(zB).toMatchObject({ totalParadas: 2, entregadas: 2, fallidas: 0 })
  })

  test('un conductor no puede consultar reportes', async () => {
    const cond = await crearConductorDePrueba()
    const res = await json(
      'GET',
      `/reportes/rutas?desde=${DESDE}&hasta=${HASTA}`,
      undefined,
      bearer(cond.token),
    )
    expect(res.status).toBe(403)
  })

  test('exportar el reporte de rutas devuelve un archivo Excel', async () => {
    const res = await json(
      'GET',
      `/reportes/rutas/exportar?desde=${DESDE}&hasta=${HASTA}`,
      undefined,
      bearer(tokenCoord),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('spreadsheetml')
    expect(res.headers.get('content-disposition')).toContain('.xlsx')
    const buffer = await res.arrayBuffer()
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  test('resumen-hoy responde con la forma esperada', async () => {
    const res = await json('GET', '/reportes/resumen-hoy', undefined, bearer(tokenCoord))
    expect(res.status).toBe(200)
    const r = (await res.json()) as {
      fecha: string
      rutasPorEstado: Record<string, number>
      paradas: { entregadas: number; pendientes: number; fallidas: number }
      conductoresEnRuta: number
      demoradas: unknown[]
    }
    expect(r.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(typeof r.conductoresEnRuta).toBe('number')
    expect(Array.isArray(r.demoradas)).toBe(true)
  })
})

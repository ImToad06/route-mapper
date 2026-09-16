import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, inArray, like } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { conductor, destino, producto, ruta, vehiculo, zona } from '../../db/schema/index.ts'
import {
  bearer,
  crearUsuarioDePrueba,
  iniciarSesionComo,
  json,
  limpiarUsuariosDePrueba,
} from '../../test/helpers.ts'
import { usarProveedorEnrutamiento } from '../enrutamiento/enrutamiento.service.ts'
import type { ProveedorEnrutamiento } from '../enrutamiento/proveedor.ts'

let admin: { id: number; correo: string; contrasena: string }
let coord: { id: number; correo: string; contrasena: string }
let tokenAdmin: string
let tokenCoord: string
const sufijo = Date.now().toString(36).slice(-4).toUpperCase()

interface Conductor {
  usuarioId: number
  conductorId: number
  correo: string
  contrasena: string
  token: string
  nombre: string
}
const conductores: Conductor[] = []
const usuarioIds: number[] = []

const ids = { zona: 0, destinos: [] as number[], productos: [] as number[], vehiculo: 0 }
const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const placa = () =>
  `A${letras[Math.floor(Math.random() * 24)]}${letras[Math.floor(Math.random() * 24)]}${String(Date.now()).slice(-3)}`

const proveedorFalso: ProveedorEnrutamiento = {
  async calcularRecorrido(puntos) {
    const tramos = puntos.slice(1).map(() => ({ distanciaM: 500, duracionS: 60 }))
    return {
      geometria: 'geom',
      distanciaM: 500 * tramos.length,
      duracionS: 60 * tramos.length,
      tramos,
    }
  },
  async optimizar(_deposito, paradas) {
    return {
      orden: paradas.map((p) => p.id),
      noAsignadas: [],
      recorrido: {
        geometria: 'geom',
        distanciaM: 500,
        duracionS: 60,
        tramos: paradas.map(() => ({ distanciaM: 500, duracionS: 60 })),
      },
    }
  },
}

/** Crea un conductor (usuario + ficha) autenticado, vía la API con un administrador. */
async function crearConductorDePrueba(nombre: string): Promise<Conductor> {
  const documento = String(Date.now()).slice(-9) + Math.floor(Math.random() * 90 + 10)
  const correo = `test-cond-${sufijo}-${conductores.length}@lh.test`
  const res = await json(
    'POST',
    '/conductores',
    { nombre, documento, licencia: `LIC-${documento}`, correo },
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
    correo,
    contrasena: body.contrasenaTemporal,
    token: sesion.tokenAcceso,
    nombre,
  }
}

/** Crea una ruta con 2 paradas (1 producto cada una) y la deja en `planificada`. */
async function crearRutaPlanificada(fecha: string) {
  const res = await json('POST', '/rutas', { fecha, vehiculoId: ids.vehiculo }, bearer(tokenCoord))
  const { id, codigo } = (await res.json()) as { id: number; codigo: string }
  await json(
    'PUT',
    `/rutas/${id}/paradas`,
    {
      paradas: [
        { destinoId: ids.destinos[0], productos: [{ productoId: ids.productos[0], cantidad: 1 }] },
        { destinoId: ids.destinos[1], productos: [{ productoId: ids.productos[0], cantidad: 1 }] },
      ],
    },
    bearer(tokenCoord),
  )
  const plan = await json('POST', `/rutas/${id}/planificar`, undefined, bearer(tokenCoord))
  expect(plan.status).toBe(200)
  return { id, codigo }
}

beforeAll(async () => {
  usarProveedorEnrutamiento(proveedorFalso)
  admin = await crearUsuarioDePrueba({ rol: 'administrador' })
  coord = await crearUsuarioDePrueba({ rol: 'coordinador' })
  tokenAdmin = (await iniciarSesionComo(admin.correo, admin.contrasena)).tokenAcceso
  tokenCoord = (await iniciarSesionComo(coord.correo, coord.contrasena)).tokenAcceso

  const [z] = await db
    .insert(zona)
    .values({ nombre: `Zona asignación ${sufijo}` })
    .returning({ id: zona.id })
  ids.zona = z?.id ?? 0
  const destinos = await db
    .insert(destino)
    .values(
      [1, 2].map((i) => ({
        zonaId: ids.zona,
        nombreCliente: `Cliente asignación ${sufijo} ${i}`,
        direccion: `Calle asignación ${i} # 1-1`,
        latitud: 10.9 + i / 100,
        longitud: -74.8 + i / 100,
        ubicacionVerificada: true,
      })),
    )
    .returning({ id: destino.id })
  ids.destinos = destinos.map((d) => d.id)
  const [prod] = await db
    .insert(producto)
    .values({ codigo: `ASG-${sufijo}`, descripcion: 'Producto liviano', pesoKg: '1' })
    .returning({ id: producto.id })
  ids.productos = [prod?.id ?? 0]
  const [v] = await db
    .insert(vehiculo)
    .values({ placa: placa(), tipo: 'Grande', capacidadKg: '5000' })
    .returning({ id: vehiculo.id })
  ids.vehiculo = v?.id ?? 0

  conductores.push(await crearConductorDePrueba('Conductor Uno'))
  conductores.push(await crearConductorDePrueba('Conductor Dos'))
})

afterAll(async () => {
  usarProveedorEnrutamiento(null)
  await db.delete(ruta).where(like(ruta.codigo, 'R-2031%'))
  await db.delete(conductor).where(inArray(conductor.usuarioId, usuarioIds))
  await db.delete(destino).where(inArray(destino.id, ids.destinos))
  await db.delete(zona).where(eq(zona.id, ids.zona))
  await db.delete(producto).where(inArray(producto.id, ids.productos))
  await db.delete(vehiculo).where(eq(vehiculo.id, ids.vehiculo))
  await limpiarUsuariosDePrueba([admin.id, coord.id, ...usuarioIds])
})

describe('asignación y ciclo de vida del conductor (RF-15 … RF-21)', () => {
  test('un conductor no puede asignar rutas', async () => {
    const r = await crearRutaPlanificada('2031-02-01')
    const res = await json(
      'POST',
      `/rutas/${r.id}/asignar`,
      { conductorId: conductores[0]?.conductorId },
      bearer(conductores[0]?.token ?? ''),
    )
    expect(res.status).toBe(403)
  })

  test('asignar deja la ruta pendiente de aceptación, ocupa al conductor y le notifica', async () => {
    const r = await crearRutaPlanificada('2031-02-02')
    const res = await json(
      'POST',
      `/rutas/${r.id}/asignar`,
      { conductorId: conductores[0]?.conductorId },
      bearer(tokenCoord),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { estado: string; conductor: { id: number } | null }
    expect(body.estado).toBe('pendiente_aceptacion')
    expect(body.conductor?.id).toBe(conductores[0]?.conductorId)

    const [c] = await db
      .select({ disponibilidad: conductor.disponibilidad })
      .from(conductor)
      .where(eq(conductor.id, conductores[0]?.conductorId ?? 0))
    expect(c?.disponibilidad).toBe('en_ruta')

    const notifs = await json(
      'GET',
      '/notificaciones',
      undefined,
      bearer(conductores[0]?.token ?? ''),
    )
    const lista = (await notifs.json()) as { rutaId: number | null; tipo: string }[]
    expect(lista.some((n) => n.rutaId === r.id && n.tipo === 'ruta_asignada')).toBe(true)

    // El conductor asignado puede ver el detalle y el historial de su propia ruta.
    const propio = await json(
      'GET',
      `/rutas/${r.id}`,
      undefined,
      bearer(conductores[0]?.token ?? ''),
    )
    expect(propio.status).toBe(200)
    expect(((await propio.json()) as { paradas: unknown[] }).paradas.length).toBe(2)
    const historialPropio = await json(
      'GET',
      `/rutas/${r.id}/historial`,
      undefined,
      bearer(conductores[0]?.token ?? ''),
    )
    expect(historialPropio.status).toBe(200)

    // Otro conductor no puede ver una ruta que no es suya.
    const ajeno = await json(
      'GET',
      `/rutas/${r.id}`,
      undefined,
      bearer(conductores[1]?.token ?? ''),
    )
    expect(ajeno.status).toBe(403)

    // Libera al conductor para el resto de las pruebas.
    await json('POST', `/rutas/${r.id}/cancelar`, undefined, bearer(tokenCoord))
  })

  test('RF-16: no se puede asignar al mismo conductor dos rutas activas el mismo día', async () => {
    const r1 = await crearRutaPlanificada('2031-02-03')
    const primera = await json(
      'POST',
      `/rutas/${r1.id}/asignar`,
      { conductorId: conductores[0]?.conductorId },
      bearer(tokenCoord),
    )
    expect(primera.status).toBe(200)
    const r2 = await crearRutaPlanificada('2031-02-03')
    // Ya no está "disponible" (quedó en_ruta al asignarlo), así que la segunda asignación
    // se rechaza antes de llegar a la validación de fecha; el índice único de BD es el
    // respaldo para la carrera entre dos peticiones concurrentes.
    const res = await json(
      'POST',
      `/rutas/${r2.id}/asignar`,
      { conductorId: conductores[0]?.conductorId },
      bearer(tokenCoord),
    )
    expect(res.status).toBe(400)

    // Libera al conductor para el resto de las pruebas.
    await json('POST', `/rutas/${r1.id}/cancelar`, undefined, bearer(tokenCoord))
  })

  test('no se puede asignar un conductor que no está disponible', async () => {
    await json(
      'PATCH',
      `/conductores/${conductores[1]?.conductorId}`,
      { disponibilidad: 'inactivo' },
      bearer(tokenAdmin),
    )
    const r = await crearRutaPlanificada('2031-02-04')
    const res = await json(
      'POST',
      `/rutas/${r.id}/asignar`,
      { conductorId: conductores[1]?.conductorId },
      bearer(tokenCoord),
    )
    expect(res.status).toBe(400)
    await json(
      'PATCH',
      `/conductores/${conductores[1]?.conductorId}`,
      { disponibilidad: 'disponible' },
      bearer(tokenAdmin),
    )
  })

  test('RF-17: reasignar libera al conductor anterior y ocupa al nuevo', async () => {
    const r = await crearRutaPlanificada('2031-02-05')
    const asignacion = await json(
      'POST',
      `/rutas/${r.id}/asignar`,
      { conductorId: conductores[0]?.conductorId },
      bearer(tokenCoord),
    )
    expect(asignacion.status).toBe(200)
    const res = await json(
      'POST',
      `/rutas/${r.id}/reasignar`,
      { conductorId: conductores[1]?.conductorId },
      bearer(tokenCoord),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { estado: string; conductor: { id: number } | null }
    expect(body.estado).toBe('pendiente_aceptacion')
    expect(body.conductor?.id).toBe(conductores[1]?.conductorId)

    const filas = await db
      .select({ id: conductor.id, disponibilidad: conductor.disponibilidad })
      .from(conductor)
      .where(
        inArray(conductor.id, [conductores[0]?.conductorId ?? 0, conductores[1]?.conductorId ?? 0]),
      )
    const uno = filas.find((f) => f.id === conductores[0]?.conductorId)
    const dos = filas.find((f) => f.id === conductores[1]?.conductorId)
    expect(uno?.disponibilidad).toBe('disponible')
    expect(dos?.disponibilidad).toBe('en_ruta')

    // Deja al conductor dos libre otra vez para el resto de las pruebas.
    await json('POST', `/rutas/${r.id}/cancelar`, undefined, bearer(tokenCoord))
  })

  test('RF-18: el conductor rechaza y la ruta vuelve a planificada', async () => {
    const r = await crearRutaPlanificada('2031-02-06')
    const asignacion = await json(
      'POST',
      `/rutas/${r.id}/asignar`,
      { conductorId: conductores[0]?.conductorId },
      bearer(tokenCoord),
    )
    expect(asignacion.status).toBe(200)
    const res = await json(
      'POST',
      `/rutas/${r.id}/rechazar`,
      { motivo: 'Vehículo en mantenimiento' },
      bearer(conductores[0]?.token ?? ''),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      estado: string
      conductor: { id: number } | null
      motivoRechazo: string | null
    }
    expect(body.estado).toBe('planificada')
    expect(body.conductor).toBeNull()
    expect(body.motivoRechazo).toBe('Vehículo en mantenimiento')

    const [c] = await db
      .select({ disponibilidad: conductor.disponibilidad })
      .from(conductor)
      .where(eq(conductor.id, conductores[0]?.conductorId ?? 0))
    expect(c?.disponibilidad).toBe('disponible')
  })

  test('flujo feliz: aceptar → iniciar → entregar/fallar paradas → finalizar (incompleta)', async () => {
    const r = await crearRutaPlanificada('2031-02-07')
    const detalle = (await (
      await json('GET', `/rutas/${r.id}`, undefined, bearer(tokenCoord))
    ).json()) as { paradas: { id: number }[] }
    const [p1, p2] = detalle.paradas
    const t = conductores[0]?.token ?? ''

    const asignacion = await json(
      'POST',
      `/rutas/${r.id}/asignar`,
      { conductorId: conductores[0]?.conductorId },
      bearer(tokenCoord),
    )
    expect(asignacion.status).toBe(200)
    expect((await json('POST', `/rutas/${r.id}/aceptar`, undefined, bearer(t))).status).toBe(200)
    expect((await json('POST', `/rutas/${r.id}/iniciar`, undefined, bearer(t))).status).toBe(200)

    const entregada = await json(
      'POST',
      `/rutas/${r.id}/paradas/${p1?.id}/entregar`,
      undefined,
      bearer(t),
    )
    expect(entregada.status).toBe(200)

    const noFinaliza = await json('POST', `/rutas/${r.id}/finalizar`, undefined, bearer(t))
    expect(noFinaliza.status).toBe(400)

    const fallida = await json(
      'POST',
      `/rutas/${r.id}/paradas/${p2?.id}/fallar`,
      { tipo: 'cliente_ausente', nota: 'No había nadie' },
      bearer(t),
    )
    expect(fallida.status).toBe(200)

    const fin = await json('POST', `/rutas/${r.id}/finalizar`, undefined, bearer(t))
    expect(fin.status).toBe(200)
    expect(((await fin.json()) as { estado: string }).estado).toBe('incompleta')

    const [c] = await db
      .select({ disponibilidad: conductor.disponibilidad })
      .from(conductor)
      .where(eq(conductor.id, conductores[0]?.conductorId ?? 0))
    expect(c?.disponibilidad).toBe('disponible')
  })
})

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, inArray, like } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { destino, producto, ruta, vehiculo, zona } from '../../db/schema/index.ts'
import {
  bearer,
  crearUsuarioDePrueba,
  iniciarSesionComo,
  json,
  limpiarUsuariosDePrueba,
} from '../../test/helpers.ts'
import { usarProveedorEnrutamiento } from '../enrutamiento/enrutamiento.service.ts'
import type { ProveedorEnrutamiento } from '../enrutamiento/proveedor.ts'

let coord: { id: number; correo: string; contrasena: string }
let conductorU: { id: number; correo: string; contrasena: string }
let token: string
const sufijo = Date.now().toString(36).slice(-4).toUpperCase()
const ids = {
  zona: 0,
  destinos: [] as number[],
  productos: [] as number[],
  vehiculoChico: 0,
  vehiculoGrande: 0,
  ruta: 0,
}
const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const placa = () =>
  `T${letras[Math.floor(Math.random() * 24)]}${letras[Math.floor(Math.random() * 24)]}${String(Date.now()).slice(-3)}`

/** Motor falso: recorrido en línea recta y optimización que invierte el orden y deja fuera lo que no cabe. */
const proveedorFalso: ProveedorEnrutamiento = {
  async calcularRecorrido(puntos) {
    const tramos = puntos.slice(1).map(() => ({ distanciaM: 1000, duracionS: 120 }))
    return {
      geometria: 'geom-falsa',
      distanciaM: 1000 * tramos.length,
      duracionS: 120 * tramos.length,
      tramos,
    }
  },
  async optimizar(_deposito, paradas, capacidadKg) {
    const orden: number[] = []
    const noAsignadas: number[] = []
    let carga = 0
    for (const p of [...paradas].reverse()) {
      if (capacidadKg !== undefined && carga + p.cargaKg > capacidadKg) noAsignadas.push(p.id)
      else {
        carga += p.cargaKg
        orden.push(p.id)
      }
    }
    const tramos = [...orden, 'vuelta'].map(() => ({ distanciaM: 500, duracionS: 60 }))
    return {
      orden,
      noAsignadas,
      recorrido: {
        geometria: 'geom-opt',
        distanciaM: 500 * tramos.length,
        duracionS: 60 * tramos.length,
        tramos,
      },
    }
  },
}

beforeAll(async () => {
  usarProveedorEnrutamiento(proveedorFalso)
  coord = await crearUsuarioDePrueba({ rol: 'coordinador' })
  conductorU = await crearUsuarioDePrueba({ rol: 'conductor' })
  token = (await iniciarSesionComo(coord.correo, coord.contrasena)).tokenAcceso
  const [z] = await db
    .insert(zona)
    .values({ nombre: `Zona rutas ${sufijo}` })
    .returning({ id: zona.id })
  ids.zona = z?.id ?? 0
  const filas = await db
    .insert(destino)
    .values(
      [1, 2, 3].map((i) => ({
        zonaId: ids.zona,
        nombreCliente: `Cliente rutas ${sufijo} ${i}`,
        direccion: `Calle ${i} # 1-1`,
        horarioAtencion: i === 2 ? '08:00-12:00' : null,
        latitud: 10.98 + i / 100,
        longitud: -74.8 + i / 100,
        ubicacionVerificada: i !== 3,
      })),
    )
    .returning({ id: destino.id })
  ids.destinos = filas.map((f) => f.id)
  const prods = await db
    .insert(producto)
    .values([
      {
        codigo: `RUT-${sufijo}-A`,
        descripcion: 'Bulto 25 kg',
        unidadMedida: 'unidad',
        pesoKg: '25',
      },
      { codigo: `RUT-${sufijo}-B`, descripcion: 'Caja 10 kg', unidadMedida: 'caja', pesoKg: '10' },
    ])
    .returning({ id: producto.id })
  ids.productos = prods.map((p) => p.id)
  const vs = await db
    .insert(vehiculo)
    .values([
      { placa: placa(), tipo: 'Chico', capacidadKg: '100' },
      { placa: placa(), tipo: 'Grande', capacidadKg: '5000' },
    ])
    .returning({ id: vehiculo.id })
  ids.vehiculoChico = vs[0]?.id ?? 0
  ids.vehiculoGrande = vs[1]?.id ?? 0
})

afterAll(async () => {
  usarProveedorEnrutamiento(null)
  await db.delete(ruta).where(like(ruta.codigo, 'R-2030%'))
  await db.delete(destino).where(inArray(destino.id, ids.destinos))
  await db.delete(zona).where(eq(zona.id, ids.zona))
  await db.delete(producto).where(inArray(producto.id, ids.productos))
  await db.delete(vehiculo).where(inArray(vehiculo.id, [ids.vehiculoChico, ids.vehiculoGrande]))
  await limpiarUsuariosDePrueba([coord.id, conductorU.id])
})

describe('rutas: creación y paradas (RF-12, RF-13)', () => {
  test('crear ruta genera un código por fecha y queda en borrador', async () => {
    const res = await json(
      'POST',
      '/rutas',
      { fecha: '2030-01-15', observaciones: '' },
      bearer(token),
    )
    expect(res.status).toBe(201)
    const r = (await res.json()) as {
      id: number
      codigo: string
      estado: string
      paradas: unknown[]
      cargaKg: number
    }
    ids.ruta = r.id
    expect(r.codigo).toMatch(/^R-20300115-\d{2}$/)
    expect(r.estado).toBe('borrador')
    expect(r.paradas).toEqual([])
    expect(r.cargaKg).toBe(0)
  })
  test('el conductor no puede crear rutas', async () => {
    const t = (await iniciarSesionComo(conductorU.correo, conductorU.contrasena)).tokenAcceso
    expect((await json('POST', '/rutas', { fecha: '2030-01-15' }, bearer(t))).status).toBe(403)
  })
  test('definir paradas con productos calcula la carga y el orden', async () => {
    const [d1, d2] = ids.destinos
    const [pA, pB] = ids.productos
    const res = await json(
      'PUT',
      `/rutas/${ids.ruta}/paradas`,
      {
        paradas: [
          { destinoId: d1, productos: [{ productoId: pA, cantidad: 2 }] },
          {
            destinoId: d2,
            productos: [
              { productoId: pB, cantidad: 3 },
              { productoId: pA, cantidad: 1 },
            ],
          },
        ],
      },
      bearer(token),
    )
    expect(res.status).toBe(200)
    const r = (await res.json()) as {
      cargaKg: number
      paradas: { orden: number; cargaKg: number; productos: unknown[] }[]
    }
    expect(r.paradas.map((p) => p.orden)).toEqual([1, 2])
    expect(r.paradas[0]?.cargaKg).toBe(50)
    expect(r.paradas[1]?.cargaKg).toBe(55)
    expect(r.cargaKg).toBe(105)
  })
  test('PATCH vacío no falla', async () => {
    expect((await json('PATCH', `/rutas/${ids.ruta}`, {}, bearer(token))).status).toBe(200)
  })
  test('dos creaciones simultáneas para la misma fecha reciben códigos distintos', async () => {
    const [a, b] = await Promise.all([
      json('POST', '/rutas', { fecha: '2030-02-02' }, bearer(token)),
      json('POST', '/rutas', { fecha: '2030-02-02' }, bearer(token)),
    ])
    expect([a.status, b.status]).toEqual([201, 201])
    const ca = ((await a.json()) as { codigo: string }).codigo
    const cb = ((await b.json()) as { codigo: string }).codigo
    expect(ca).not.toBe(cb)
  })
  test('destino repetido: 422', async () => {
    const [d1] = ids.destinos
    const res = await json(
      'PUT',
      `/rutas/${ids.ruta}/paradas`,
      { paradas: [{ destinoId: d1 }, { destinoId: d1 }] },
      bearer(token),
    )
    expect(res.status).toBe(422)
  })
})

describe('rutas: recorrido y optimización', () => {
  test('calcular guarda geometría, distancia, duración y ETA por parada', async () => {
    const res = await json('POST', `/rutas/${ids.ruta}/calcular`, undefined, bearer(token))
    expect(res.status).toBe(200)
    const r = (await res.json()) as {
      geometria: string
      distanciaM: number
      duracionS: number
      paradas: { etaS: number; distanciaDesdeAnteriorM: number }[]
    }
    expect(r.geometria).toBe('geom-falsa')
    expect(r.distanciaM).toBe(3000)
    expect(r.paradas[0]?.distanciaDesdeAnteriorM).toBe(1000)
    expect(r.paradas[0]?.etaS).toBe(120)
    expect(r.paradas[1]?.etaS).toBe(120 + 600 + 120)
  })
  test('optimizar reordena y deja al final lo que no cabe en el vehículo', async () => {
    await json('PATCH', `/rutas/${ids.ruta}`, { vehiculoId: ids.vehiculoChico }, bearer(token))
    const res = await json('POST', `/rutas/${ids.ruta}/optimizar`, undefined, bearer(token))
    expect(res.status).toBe(200)
    const r = (await res.json()) as {
      ruta: {
        optimizadaEn: string | null
        paradas: {
          destino: { id: number }
          etaS: number | null
          distanciaDesdeAnteriorM: number | null
        }[]
      }
      noAsignadas: { destino: string }[]
    }
    // Capacidad 100: cabe la parada 2 (55 kg) invertida primero; la parada 1 (50 kg) ya no cabe.
    expect(r.noAsignadas).toHaveLength(1)
    expect(r.ruta.paradas[0]?.destino.id).toBe(ids.destinos[1])
    expect(r.ruta.optimizadaEn).not.toBeNull()
    // La parada no asignada queda al final, sin ETA ni distancia.
    const ultima = r.ruta.paradas.at(-1)
    expect(ultima?.etaS).toBeNull()
    expect(ultima?.distanciaDesdeAnteriorM).toBeNull()
  })
  test('cambiar las paradas borra la geometría', async () => {
    const [d1, d2] = ids.destinos
    const res = await json(
      'PUT',
      `/rutas/${ids.ruta}/paradas`,
      {
        paradas: [
          { destinoId: d2, productos: [{ productoId: ids.productos[1], cantidad: 3 }] },
          { destinoId: d1, productos: [{ productoId: ids.productos[0], cantidad: 5 }] },
        ],
      },
      bearer(token),
    )
    const r = (await res.json()) as { geometria: string | null; optimizadaEn: string | null }
    expect(r.geometria).toBeNull()
    expect(r.optimizadaEn).toBeNull()
  })
})

describe('rutas: planificación (RF-14) y estados', () => {
  test('sin vehículo no se puede planificar', async () => {
    await json('PATCH', `/rutas/${ids.ruta}`, { vehiculoId: null }, bearer(token))
    const res = await json('POST', `/rutas/${ids.ruta}/planificar`, undefined, bearer(token))
    expect(res.status).toBe(400)
    expect(((await res.json()) as { mensaje: string }).mensaje).toMatch(/vehículo/)
  })
  test('carga mayor que la capacidad: 400 con el detalle', async () => {
    await json('PATCH', `/rutas/${ids.ruta}`, { vehiculoId: ids.vehiculoChico }, bearer(token))
    const res = await json('POST', `/rutas/${ids.ruta}/planificar`, undefined, bearer(token))
    expect(res.status).toBe(400)
    expect(((await res.json()) as { mensaje: string }).mensaje).toMatch(/supera la capacidad/)
  })
  test('destino sin ubicación verificada bloquea la planificación', async () => {
    await json('PATCH', `/rutas/${ids.ruta}`, { vehiculoId: ids.vehiculoGrande }, bearer(token))
    await json(
      'PUT',
      `/rutas/${ids.ruta}/paradas`,
      { paradas: [{ destinoId: ids.destinos[0] }, { destinoId: ids.destinos[2] }] },
      bearer(token),
    )
    const res = await json('POST', `/rutas/${ids.ruta}/planificar`, undefined, bearer(token))
    expect(res.status).toBe(400)
    expect(((await res.json()) as { mensaje: string }).mensaje).toMatch(/por verificar/)
  })
  test('con vehículo suficiente y destinos verificados queda planificada; luego no se edita', async () => {
    await json(
      'PUT',
      `/rutas/${ids.ruta}/paradas`,
      {
        paradas: [
          {
            destinoId: ids.destinos[0],
            productos: [{ productoId: ids.productos[0], cantidad: 4 }],
          },
        ],
      },
      bearer(token),
    )
    const res = await json('POST', `/rutas/${ids.ruta}/planificar`, undefined, bearer(token))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { estado: string }).estado).toBe('planificada')
    const edicion = await json('PUT', `/rutas/${ids.ruta}/paradas`, { paradas: [] }, bearer(token))
    expect(edicion.status).toBe(409)
    const historial = await json('GET', `/rutas/${ids.ruta}/historial`, undefined, bearer(token))
    expect(
      ((await historial.json()) as { estadoNuevo: string }[]).map((h) => h.estadoNuevo),
    ).toEqual(['borrador', 'planificada'])
  })
  test('volver a borrador y cancelar; una cancelada no cambia más', async () => {
    expect(
      (await json('POST', `/rutas/${ids.ruta}/borrador`, undefined, bearer(token))).status,
    ).toBe(200)
    const cancel = await json(
      'POST',
      `/rutas/${ids.ruta}/cancelar`,
      { motivo: 'Prueba' },
      bearer(token),
    )
    expect(((await cancel.json()) as { estado: string }).estado).toBe('cancelada')
    expect(
      (await json('POST', `/rutas/${ids.ruta}/borrador`, undefined, bearer(token))).status,
    ).toBe(409)
  })
  test('listar filtra por estado y fecha', async () => {
    const res = await json(
      'GET',
      '/rutas?estado=cancelada&desde=2030-01-01&hasta=2030-01-31',
      undefined,
      bearer(token),
    )
    const r = (await res.json()) as { datos: { id: number }[] }
    expect(r.datos.some((d) => d.id === ids.ruta)).toBe(true)
  })
})

describe('configuración de la bodega', () => {
  test('el coordinador la consulta; solo el administrador la cambia', async () => {
    const res = await json('GET', '/configuracion/bodega', undefined, bearer(token))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { direccion: string }).direccion).toBeTruthy()
    expect(
      (
        await json(
          'PUT',
          '/configuracion/bodega',
          { direccion: 'Vía 40 # 73-290', latitud: 11.0053, longitud: -74.7936 },
          bearer(token),
        )
      ).status,
    ).toBe(403)
  })
})

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq, inArray, like } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import {
  conductor,
  destino,
  geocodificacionCache,
  producto,
  usuario,
  vehiculo,
  zona,
} from '../../db/schema/index.ts'
import {
  bearer,
  crearUsuarioDePrueba,
  iniciarSesionComo,
  json,
  limpiarUsuariosDePrueba,
} from '../../test/helpers.ts'
import { usarProveedor } from '../geocodificacion/geocodificacion.service.ts'

let admin: { id: number; correo: string; contrasena: string }
let coordinador: { id: number; correo: string; contrasena: string }
let tokenAdmin: string
let tokenCoord: string
const sufijo = Date.now().toString(36).slice(-4).toUpperCase()
const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const letraAleatoria = () => letras[Math.floor(Math.random() * letras.length)]
const placa = `T${letraAleatoria()}${letraAleatoria()}${String(Date.now()).slice(-3)}`
const ids = { vehiculo: 0, producto: 0, zona: 0, destino: 0, conductor: 0, usuarioConductor: 0 }

beforeAll(async () => {
  admin = await crearUsuarioDePrueba({ rol: 'administrador' })
  coordinador = await crearUsuarioDePrueba({ rol: 'coordinador' })
  tokenAdmin = (await iniciarSesionComo(admin.correo, admin.contrasena)).tokenAcceso
  tokenCoord = (await iniciarSesionComo(coordinador.correo, coordinador.contrasena)).tokenAcceso
  usarProveedor({
    buscar: async (direccion) =>
      direccion.includes('inexistente')
        ? []
        : [{ etiqueta: `Geo: ${direccion}`, latitud: 10.98, longitud: -74.8 }],
  })
})

afterAll(async () => {
  if (ids.destino) await db.delete(destino).where(eq(destino.id, ids.destino))
  await db.delete(destino).where(like(destino.nombreCliente, `Importado ${sufijo}%`))
  if (ids.conductor) await db.delete(conductor).where(eq(conductor.id, ids.conductor))
  if (ids.zona) await db.delete(zona).where(inArray(zona.id, [ids.zona]))
  await db.delete(zona).where(like(zona.nombre, `Zona importada ${sufijo}%`))
  if (ids.producto) await db.delete(producto).where(eq(producto.id, ids.producto))
  if (ids.vehiculo) await db.delete(vehiculo).where(eq(vehiculo.id, ids.vehiculo))
  await db
    .delete(geocodificacionCache)
    .where(like(geocodificacionCache.consulta, `%${sufijo.toLowerCase()}%`))
  await limpiarUsuariosDePrueba([
    admin.id,
    coordinador.id,
    ...(ids.usuarioConductor ? [ids.usuarioConductor] : []),
  ])
})

describe('vehículos (RF-26)', () => {
  test('el coordinador puede listar pero no crear', async () => {
    expect((await json('GET', '/vehiculos', undefined, bearer(tokenCoord))).status).toBe(200)
    expect(
      (
        await json(
          'POST',
          '/vehiculos',
          { placa, tipo: 'Camión', capacidadKg: 1800 },
          bearer(tokenCoord),
        )
      ).status,
    ).toBe(403)
  })
  test('el administrador crea, actualiza y la placa es única', async () => {
    const res = await json(
      'POST',
      '/vehiculos',
      { placa: placa.toLowerCase(), tipo: 'Camión NHR', capacidadKg: '1800.5' },
      bearer(tokenAdmin),
    )
    expect(res.status).toBe(201)
    const v = (await res.json()) as { id: number; placa: string; capacidadKg: number }
    ids.vehiculo = v.id
    expect(v.placa).toBe(placa)
    expect(v.capacidadKg).toBe(1800.5)
    expect(
      (
        await json(
          'POST',
          '/vehiculos',
          { placa, tipo: 'Otro', capacidadKg: 1 },
          bearer(tokenAdmin),
        )
      ).status,
    ).toBe(409)
    const up = await json('PATCH', `/vehiculos/${v.id}`, { capacidadKg: 2000 }, bearer(tokenAdmin))
    expect(((await up.json()) as { capacidadKg: number }).capacidadKg).toBe(2000)
  })
  test('capacidad inválida: 422', async () => {
    expect(
      (
        await json(
          'POST',
          '/vehiculos',
          { placa: 'ZZZ999', tipo: 'X', capacidadKg: 0 },
          bearer(tokenAdmin),
        )
      ).status,
    ).toBe(422)
  })
})

describe('productos (RF-07)', () => {
  test('el coordinador crea y el código se normaliza', async () => {
    const res = await json(
      'POST',
      '/productos',
      {
        codigo: `prd-${sufijo}`,
        descripcion: 'Producto de prueba',
        unidadMedida: 'caja',
        pesoKg: 12.5,
      },
      bearer(tokenCoord),
    )
    expect(res.status).toBe(201)
    const p = (await res.json()) as { id: number; codigo: string; pesoKg: number }
    ids.producto = p.id
    expect(p.codigo).toBe(`PRD-${sufijo}`)
    expect(p.pesoKg).toBe(12.5)
  })
  test('desactivar y filtrar por activos', async () => {
    await json('PATCH', `/productos/${ids.producto}/estado`, { activo: false }, bearer(tokenCoord))
    const res = await json(
      'GET',
      `/productos?activo=true&buscar=PRD-${sufijo}`,
      undefined,
      bearer(tokenCoord),
    )
    expect(((await res.json()) as { total: number }).total).toBe(0)
  })
})

describe('zonas y destinos (RF-10, RF-11)', () => {
  test('crear zona y destino con ubicación verificada', async () => {
    const z = await json(
      'POST',
      '/zonas',
      { nombre: `Zona ${sufijo}`, descripcion: '' },
      bearer(tokenCoord),
    )
    expect(z.status).toBe(201)
    ids.zona = ((await z.json()) as { id: number }).id
    const d = await json(
      'POST',
      '/destinos',
      {
        zonaId: ids.zona,
        nombreCliente: `Cliente ${sufijo}`,
        direccion: 'Calle 72 # 45-23',
        latitud: 10.99,
        longitud: -74.79,
        ubicacionVerificada: true,
      },
      bearer(tokenCoord),
    )
    expect(d.status).toBe(201)
    const destinoCreado = (await d.json()) as {
      id: number
      zona: string
      ubicacionVerificada: boolean
    }
    ids.destino = destinoCreado.id
    expect(destinoCreado.zona).toBe(`Zona ${sufijo}`)
    expect(destinoCreado.ubicacionVerificada).toBe(true)
  })
  test('nombre de zona duplicado (sin distinguir mayúsculas): 409', async () => {
    expect(
      (await json('POST', '/zonas', { nombre: `zona ${sufijo}` }, bearer(tokenCoord))).status,
    ).toBe(409)
  })
  test('geocodificar devuelve candidatos y usa la caché', async () => {
    const r1 = await json(
      'GET',
      `/geocodificar?direccion=Carrera 53 ${sufijo}`,
      undefined,
      bearer(tokenCoord),
    )
    expect(r1.status).toBe(200)
    expect(((await r1.json()) as { candidatos: unknown[] }).candidatos).toHaveLength(1)
    const [cache] = await db
      .select()
      .from(geocodificacionCache)
      .where(eq(geocodificacionCache.consulta, `carrera 53 ${sufijo.toLowerCase()}`))
    expect(cache).toBeDefined()
  })
  test('importar: crea filas con coordenadas, crea la zona una sola vez y reporta las filas sin coordenadas', async () => {
    const res = await json(
      'POST',
      '/destinos/importar',
      {
        filas: [
          {
            numero: 2,
            nombreCliente: `Importado ${sufijo} A`,
            direccion: 'Calle 1 # 2-3',
            zona: `Zona importada ${sufijo}`,
            latitud: 10.9,
            longitud: -74.8,
          },
          {
            numero: 3,
            nombreCliente: `Importado ${sufijo} B`,
            direccion: 'Calle 4 # 5-6',
            zona: `zona importada ${sufijo}`,
            latitud: 10.95,
            longitud: -74.81,
            ubicacionVerificada: false,
          },
          {
            numero: 5,
            nombreCliente: `Importado ${sufijo} C`,
            direccion: 'Calle inexistente 999',
            zona: `Zona importada ${sufijo}`,
          },
        ],
      },
      bearer(tokenCoord),
    )
    expect(res.status).toBe(200)
    const r = (await res.json()) as {
      creados: number
      errores: { fila: number; mensaje: string }[]
    }
    expect(r.creados).toBe(2)
    expect(r.errores).toEqual([{ fila: 5, mensaje: 'La fila no trae coordenadas.' }])
    const noVerificados = await json(
      'GET',
      `/destinos?verificados=false&buscar=Importado ${sufijo}`,
      undefined,
      bearer(tokenCoord),
    )
    expect(((await noVerificados.json()) as { total: number }).total).toBe(1)
    const zonas = await db
      .select()
      .from(zona)
      .where(like(zona.nombre, `Zona importada ${sufijo}%`))
    expect(zonas).toHaveLength(1)
  })
  test('cambiar la dirección sin confirmar el marcador quita la verificación', async () => {
    const res = await json(
      'PATCH',
      `/destinos/${ids.destino}`,
      { direccion: 'Carrera 53 # 80-30' },
      bearer(tokenCoord),
    )
    expect(res.status).toBe(200)
    expect(((await res.json()) as { ubicacionVerificada: boolean }).ubicacionVerificada).toBe(false)
    const soloTelefono = await json(
      'PATCH',
      `/destinos/${ids.destino}`,
      { telefono: '3009876543', ubicacionVerificada: true },
      bearer(tokenCoord),
    )
    expect(
      ((await soloTelefono.json()) as { ubicacionVerificada: boolean }).ubicacionVerificada,
    ).toBe(true)
    const vacio = await json('PATCH', `/destinos/${ids.destino}`, {}, bearer(tokenCoord))
    expect(vacio.status).toBe(200)
  })
  test('una carrera de placas duplicadas responde 409 y no 500', async () => {
    const otra = `T${letraAleatoria()}${letraAleatoria()}${String(Date.now()).slice(-3)}`
    const [a, b] = await Promise.all([
      json(
        'POST',
        '/vehiculos',
        { placa: otra, tipo: 'Carrera', capacidadKg: 100 },
        bearer(tokenAdmin),
      ),
      json(
        'POST',
        '/vehiculos',
        { placa: otra, tipo: 'Carrera', capacidadKg: 100 },
        bearer(tokenAdmin),
      ),
    ])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    await db.delete(vehiculo).where(eq(vehiculo.placa, otra))
  })
  test('el mapa devuelve solo destinos activos', async () => {
    const res = await json(
      'GET',
      `/destinos/mapa?zonaId=${ids.zona}`,
      undefined,
      bearer(tokenCoord),
    )
    expect(((await res.json()) as unknown[]).length).toBe(1)
  })
})

describe('conductores (RF-04, RF-05)', () => {
  test('crear conductor crea su usuario con contraseña temporal y lo vincula al vehículo', async () => {
    const res = await json(
      'POST',
      '/conductores',
      {
        nombre: 'Pedro Prueba',
        documento: String(Date.now()).slice(-9),
        licencia: `C2-${sufijo}`,
        telefono: '3001234567',
        correo: `test-conductor-${sufijo.toLowerCase()}@lh.test`,
        vehiculoId: ids.vehiculo,
      },
      bearer(tokenAdmin),
    )
    expect(res.status).toBe(201)
    const r = (await res.json()) as {
      conductor: {
        id: number
        usuarioId: number
        vehiculo: { placa: string } | null
        disponibilidad: string
      }
      contrasenaTemporal: string
    }
    ids.conductor = r.conductor.id
    ids.usuarioConductor = r.conductor.usuarioId
    expect(r.contrasenaTemporal).toHaveLength(10)
    expect(r.conductor.vehiculo?.placa).toBe(placa)
    expect(r.conductor.disponibilidad).toBe('disponible')
    const login = await iniciarSesionComo(
      `test-conductor-${sufijo.toLowerCase()}@lh.test`,
      r.contrasenaTemporal,
    )
    expect(login.res.status).toBe(200)
  })
  test('el coordinador no puede crear conductores', async () => {
    expect(
      (
        await json(
          'POST',
          '/conductores',
          {
            nombre: 'Xiomara Yepes',
            documento: '1234567',
            licencia: 'LIC-1234',
            correo: 'x@lh.test',
          },
          bearer(tokenCoord),
        )
      ).status,
    ).toBe(403)
  })
  test('desactivar el vehículo desvincula al conductor', async () => {
    await json('PATCH', `/vehiculos/${ids.vehiculo}/estado`, { activo: false }, bearer(tokenAdmin))
    const c = await json('GET', `/conductores/${ids.conductor}`, undefined, bearer(tokenCoord))
    expect(((await c.json()) as { vehiculo: unknown }).vehiculo).toBeNull()
  })
  test('desactivar el conductor desactiva su usuario', async () => {
    const res = await json(
      'PATCH',
      `/conductores/${ids.conductor}/estado`,
      { activo: false },
      bearer(tokenAdmin),
    )
    expect(res.status).toBe(200)
    const [u] = await db
      .select({ activo: usuario.activo })
      .from(usuario)
      .where(eq(usuario.id, ids.usuarioConductor))
    expect(u?.activo).toBe(false)
  })
})

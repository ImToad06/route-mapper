import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { bitacora } from '../../db/schema/index.ts'
import {
  bearer,
  crearUsuarioDePrueba,
  iniciarSesionComo,
  json,
  limpiarUsuariosDePrueba,
} from '../../test/helpers.ts'

let admin: { id: number; correo: string; contrasena: string }
let token: string
const creados: number[] = []

beforeAll(async () => {
  admin = await crearUsuarioDePrueba({ rol: 'administrador' })
  token = (await iniciarSesionComo(admin.correo, admin.contrasena)).tokenAcceso
})
afterAll(() => limpiarUsuariosDePrueba([admin.id, ...creados]))

describe('usuarios (RF-25, RF-27)', () => {
  const correo = `nuevo-${Date.now().toString(36)}@lh.test`

  test('crear sin contraseña genera una temporal y registra en bitácora', async () => {
    const res = await json(
      'POST',
      '/usuarios',
      { nombre: 'Carlos Coordinador', correo, rol: 'coordinador' },
      bearer(token),
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as {
      usuario: { id: number; debeCambiarContrasena: boolean }
      contrasenaTemporal: string | null
    }
    creados.push(body.usuario.id)
    expect(body.contrasenaTemporal).toHaveLength(10)
    expect(body.usuario.debeCambiarContrasena).toBe(true)
    const registros = await db
      .select()
      .from(bitacora)
      .where(and(eq(bitacora.entidad, 'usuario'), eq(bitacora.entidadId, body.usuario.id)))
    expect(registros.some((r) => r.accion === 'crear' && r.usuarioId === admin.id)).toBe(true)
    // La contraseña temporal sirve para ingresar.
    expect((await iniciarSesionComo(correo, body.contrasenaTemporal ?? '')).res.status).toBe(200)
  })

  test('correo duplicado: 409', async () => {
    const res = await json(
      'POST',
      '/usuarios',
      { nombre: 'Otro', correo, rol: 'conductor' },
      bearer(token),
    )
    expect(res.status).toBe(409)
  })

  test('actualizar, desactivar y restablecer contraseña', async () => {
    const id = creados[0]
    if (!id) throw new Error('sin usuario creado')
    const up = await json('PATCH', `/usuarios/${id}`, { nombre: 'Carlos C.' }, bearer(token))
    expect(up.status).toBe(200)
    expect(((await up.json()) as { nombre: string }).nombre).toBe('Carlos C.')

    const reset = await json(
      'POST',
      `/usuarios/${id}/restablecer-contrasena`,
      undefined,
      bearer(token),
    )
    expect(reset.status).toBe(200)
    const { contrasenaTemporal } = (await reset.json()) as { contrasenaTemporal: string }
    expect((await iniciarSesionComo(correo, contrasenaTemporal)).res.status).toBe(200)

    const off = await json('PATCH', `/usuarios/${id}/estado`, { activo: false }, bearer(token))
    expect(off.status).toBe(200)
    expect((await iniciarSesionComo(correo, contrasenaTemporal)).res.status).toBe(403)
  })

  test('un administrador no puede desactivarse a sí mismo', async () => {
    const res = await json(
      'PATCH',
      `/usuarios/${admin.id}/estado`,
      { activo: false },
      bearer(token),
    )
    expect(res.status).toBe(400)
  })

  test('la bitácora se puede consultar filtrando por entidad', async () => {
    const res = await json('GET', '/bitacora?entidad=usuario&porPagina=5', undefined, bearer(token))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      datos: { entidad: string; usuarioNombre: string | null }[]
    }
    expect(body.datos.length).toBeGreaterThan(0)
    expect(body.datos.every((d) => d.entidad === 'usuario')).toBe(true)
  })
})

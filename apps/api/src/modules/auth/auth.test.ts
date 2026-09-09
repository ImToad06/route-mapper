import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { intentoAcceso, sesion } from '../../db/schema/index.ts'
import { hashTokenRefresco } from '../../lib/tokens.ts'
import {
  bearer,
  crearUsuarioDePrueba,
  iniciarSesionComo,
  json,
  limpiarUsuariosDePrueba,
} from '../../test/helpers.ts'

let admin: { id: number; correo: string; contrasena: string }
let conductor: { id: number; correo: string; contrasena: string }
let inactivo: { id: number; correo: string; contrasena: string }

beforeAll(async () => {
  admin = await crearUsuarioDePrueba({ rol: 'administrador' })
  conductor = await crearUsuarioDePrueba({ rol: 'conductor' })
  inactivo = await crearUsuarioDePrueba({ rol: 'coordinador', activo: false })
})
afterAll(() => limpiarUsuariosDePrueba([admin.id, conductor.id, inactivo.id]))

describe('POST /auth/login (RF-01, RNF-04)', () => {
  test('credenciales correctas devuelven token, usuario y cookie httpOnly', async () => {
    const { res, tokenAcceso, cookieRefresco } = await iniciarSesionComo(
      admin.correo,
      admin.contrasena,
    )
    expect(res.status).toBe(200)
    expect(tokenAcceso.split('.')).toHaveLength(3)
    expect(cookieRefresco.startsWith('lh_refresco=')).toBe(true)
    expect(res.headers.get('set-cookie')).toContain('HttpOnly')
    expect(res.headers.get('set-cookie')).toContain('Path=/api/auth')
    const intentos = await db
      .select()
      .from(intentoAcceso)
      .where(eq(intentoAcceso.correo, admin.correo))
    expect(intentos.at(-1)?.exito).toBe(true)
  })

  test('contraseña errada: 401 con mensaje genérico y el intento queda registrado', async () => {
    const res = await json('POST', '/auth/login', {
      correo: admin.correo,
      contrasena: 'incorrecta1',
    })
    expect(res.status).toBe(401)
    expect(((await res.json()) as { mensaje: string }).mensaje).toBe(
      'Correo o contraseña incorrectos.',
    )
    const intentos = await db
      .select()
      .from(intentoAcceso)
      .where(eq(intentoAcceso.correo, admin.correo))
    expect(intentos.at(-1)?.exito).toBe(false)
  })

  test('correo inexistente devuelve el mismo mensaje que contraseña errada', async () => {
    const res = await json('POST', '/auth/login', {
      correo: 'nadie@lh.test',
      contrasena: 'incorrecta1',
    })
    expect(res.status).toBe(401)
    expect(((await res.json()) as { mensaje: string }).mensaje).toBe(
      'Correo o contraseña incorrectos.',
    )
  })

  test('usuario desactivado no puede ingresar', async () => {
    const res = await json('POST', '/auth/login', {
      correo: inactivo.correo,
      contrasena: inactivo.contrasena,
    })
    expect(res.status).toBe(403)
  })

  test('cuerpo inválido devuelve 422 en español', async () => {
    const res = await json('POST', '/auth/login', { correo: 'no-es-correo', contrasena: '' })
    expect(res.status).toBe(422)
    expect(((await res.json()) as { mensaje: string }).mensaje).toBe(
      'Los datos enviados no son válidos.',
    )
  })
})

describe('guards de rol (RF-02)', () => {
  test('sin token: 401', async () => {
    expect((await json('GET', '/auth/yo')).status).toBe(401)
  })
  test('token inválido: 401', async () => {
    expect((await json('GET', '/auth/yo', undefined, bearer('abc.def.ghi'))).status).toBe(401)
  })
  test('conductor no puede listar usuarios: 403', async () => {
    const { tokenAcceso } = await iniciarSesionComo(conductor.correo, conductor.contrasena)
    const res = await json('GET', '/usuarios', undefined, bearer(tokenAcceso))
    expect(res.status).toBe(403)
    expect(((await res.json()) as { mensaje: string }).mensaje).toBe(
      'No tiene permisos para realizar esta acción.',
    )
  })
  test('administrador sí puede listar usuarios', async () => {
    const { tokenAcceso } = await iniciarSesionComo(admin.correo, admin.contrasena)
    const res = await json('GET', '/usuarios?porPagina=5', undefined, bearer(tokenAcceso))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { datos: unknown[]; total: number }
    expect(body.total).toBeGreaterThan(0)
  })
  test('/auth/yo devuelve el usuario sin hash', async () => {
    const { tokenAcceso } = await iniciarSesionComo(conductor.correo, conductor.contrasena)
    const res = await json('GET', '/auth/yo', undefined, bearer(tokenAcceso))
    const body = (await res.json()) as Record<string, unknown>
    expect(body.correo).toBe(conductor.correo)
    expect(body.rol).toBe('conductor')
    expect('contrasenaHash' in body).toBe(false)
  })
})

describe('refresco y cierre de sesión (RF-03)', () => {
  test('refrescar rota el token; reusarlo enseguida no invalida la sesión nueva (dos pestañas)', async () => {
    const { cookieRefresco } = await iniciarSesionComo(admin.correo, admin.contrasena)
    const r1 = await json('POST', '/auth/refrescar', undefined, {
      headers: { cookie: cookieRefresco },
    })
    expect(r1.status).toBe(200)
    const nuevaCookie = r1.headers.get('set-cookie')?.split(';')[0] ?? ''
    expect(nuevaCookie).not.toBe(cookieRefresco)
    const r2 = await json('POST', '/auth/refrescar', undefined, {
      headers: { cookie: cookieRefresco },
    })
    expect(r2.status).toBe(401)
    const r3 = await json('POST', '/auth/refrescar', undefined, {
      headers: { cookie: nuevaCookie },
    })
    expect(r3.status).toBe(200)
  })

  test('reusar un token rotado hace más de 30 s se trata como robo: se cierran todas las sesiones', async () => {
    const { cookieRefresco } = await iniciarSesionComo(admin.correo, admin.contrasena)
    const r1 = await json('POST', '/auth/refrescar', undefined, {
      headers: { cookie: cookieRefresco },
    })
    const nuevaCookie = r1.headers.get('set-cookie')?.split(';')[0] ?? ''
    const hashViejo = hashTokenRefresco(cookieRefresco.split('=')[1] ?? '')
    await db
      .update(sesion)
      .set({ revocadaEn: new Date(Date.now() - 60_000) })
      .where(eq(sesion.refreshTokenHash, hashViejo))
    const robo = await json('POST', '/auth/refrescar', undefined, {
      headers: { cookie: cookieRefresco },
    })
    expect(robo.status).toBe(401)
    expect(robo.headers.get('set-cookie')).toContain('Path=/api/auth')
    const legitima = await json('POST', '/auth/refrescar', undefined, {
      headers: { cookie: nuevaCookie },
    })
    expect(legitima.status).toBe(401)
  })

  test('sin cookie: 401', async () => {
    expect((await json('POST', '/auth/refrescar')).status).toBe(401)
  })

  test('cerrar revoca la sesión', async () => {
    const { cookieRefresco } = await iniciarSesionComo(conductor.correo, conductor.contrasena)
    const res = await json('POST', '/auth/cerrar', undefined, {
      headers: { cookie: cookieRefresco },
    })
    expect(res.status).toBe(200)
    const hash = hashTokenRefresco(cookieRefresco.split('=')[1] ?? '')
    const [s] = await db.select().from(sesion).where(eq(sesion.refreshTokenHash, hash))
    expect(s?.revocadaEn).not.toBeNull()
    const reintento = await json('POST', '/auth/refrescar', undefined, {
      headers: { cookie: cookieRefresco },
    })
    expect(reintento.status).toBe(401)
  })
})

describe('POST /auth/cambiar-contrasena', () => {
  test('exige la contraseña actual y aplica la nueva', async () => {
    const u = await crearUsuarioDePrueba({ rol: 'coordinador' })
    try {
      const { tokenAcceso } = await iniciarSesionComo(u.correo, u.contrasena)
      const mal = await json(
        'POST',
        '/auth/cambiar-contrasena',
        {
          contrasenaActual: 'equivocada1',
          contrasenaNueva: 'Nueva1234',
          confirmacion: 'Nueva1234',
        },
        bearer(tokenAcceso),
      )
      expect(mal.status).toBe(400)
      const bien = await json(
        'POST',
        '/auth/cambiar-contrasena',
        { contrasenaActual: u.contrasena, contrasenaNueva: 'Nueva1234', confirmacion: 'Nueva1234' },
        bearer(tokenAcceso),
      )
      expect(bien.status).toBe(200)
      expect((await iniciarSesionComo(u.correo, 'Nueva1234')).res.status).toBe(200)
      expect((await iniciarSesionComo(u.correo, u.contrasena)).res.status).toBe(401)
    } finally {
      await limpiarUsuariosDePrueba([u.id])
    }
  })
})

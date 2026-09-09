import { cambiarContrasenaSchema, loginSchema } from '@lh/shared'
import { Elysia } from 'elysia'
import { env } from '../../config/env.ts'
import { cookieSegura, ipCliente } from '../../lib/http.ts'
import { autenticacion } from '../../plugins/auth.ts'
import { limitarPorIp } from '../../plugins/rate-limit.ts'
import type { MetaPeticion } from './auth.repository.ts'
import * as servicio from './auth.service.ts'

export const COOKIE_REFRESCO = 'lh_refresco'

/** RNF-04: máximo LOGIN_MAX_INTENTOS intentos fallidos de ingreso por IP cada 15 minutos. */
const limitarLogin = limitarPorIp({ maximo: env.LOGIN_MAX_INTENTOS, ventanaMs: 15 * 60 * 1000 })

function meta(request: Request, ip: string): MetaPeticion {
  return { ip, userAgent: request.headers.get('user-agent')?.slice(0, 255) ?? null }
}

type CookieRefresco = { value?: string; set: (o: Record<string, unknown>) => void }

const atributosCookie = (request: Request) => ({
  httpOnly: true,
  secure: cookieSegura(request),
  sameSite: 'lax' as const,
  path: '/api/auth',
})

function fijarCookie(cookie: CookieRefresco, request: Request, token: string) {
  cookie.set({
    ...atributosCookie(request),
    value: token,
    maxAge: servicio.duracionRefrescoSegundos(),
  })
}

/** Borra la cookie con los mismos atributos con que se creó; con otro path el navegador no la elimina. */
function borrarCookie(cookie: CookieRefresco, request: Request) {
  cookie.set({ ...atributosCookie(request), value: '', maxAge: 0 })
}

export const authController = new Elysia({ prefix: '/auth', tags: ['Autenticación'] })
  .use(autenticacion)
  .derive(({ server, request }) => ({ ip: ipCliente(request, server) }))
  .post(
    '/login',
    async ({ body, request, ip, cookie, server }) => {
      try {
        const r = await servicio.iniciarSesion(body, meta(request, ip))
        limitarLogin.reiniciar({ request, server })
        fijarCookie(cookie[COOKIE_REFRESCO] as unknown as CookieRefresco, request, r.tokenRefresco)
        return { tokenAcceso: r.tokenAcceso, usuario: r.usuario }
      } catch (err) {
        limitarLogin.registrarFallo({ request, server })
        throw err
      }
    },
    {
      body: loginSchema,
      beforeHandle: ({ request, server }) => limitarLogin.verificar({ request, server }),
      detail: { summary: 'Iniciar sesión (RF-01)' },
    },
  )
  .post(
    '/refrescar',
    async ({ request, ip, cookie }) => {
      const c = cookie[COOKIE_REFRESCO] as unknown as CookieRefresco
      try {
        const r = await servicio.refrescarSesion(c.value, meta(request, ip))
        fijarCookie(c, request, r.tokenRefresco)
        return { tokenAcceso: r.tokenAcceso, usuario: r.usuario }
      } catch (err) {
        borrarCookie(c, request)
        throw err
      }
    },
    { detail: { summary: 'Renovar el token de acceso usando la cookie de refresco' } },
  )
  .post(
    '/cerrar',
    async ({ request, cookie }) => {
      const c = cookie[COOKIE_REFRESCO] as unknown as CookieRefresco
      await servicio.cerrarSesion(c.value)
      borrarCookie(c, request)
      return { mensaje: 'Sesión cerrada.' }
    },
    { detail: { summary: 'Cerrar sesión (RF-03)' } },
  )
  .get('/yo', ({ usuario }) => servicio.usuarioActual(usuario), {
    auth: true,
    detail: { summary: 'Usuario autenticado' },
  })
  .post(
    '/cambiar-contrasena',
    async ({ usuario, body }) => {
      await servicio.cambiarContrasena(usuario, body)
      return { mensaje: 'Contraseña actualizada.' }
    },
    {
      auth: true,
      body: cambiarContrasenaSchema,
      detail: { summary: 'Cambiar la propia contraseña' },
    },
  )

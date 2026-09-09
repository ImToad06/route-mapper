import { ROLES, type Rol } from '@lh/shared'
import { eq, inArray } from 'drizzle-orm'
import { app } from '../app.ts'
import { db } from '../db/client.ts'
import { bitacora, intentoAcceso, rol, sesion, usuario } from '../db/schema/index.ts'
import { hashContrasena } from '../lib/tokens.ts'

/** Los tests corren contra la base de datos de DATABASE_URL. Garantiza que existan los roles. */
export async function asegurarRoles() {
  await db
    .insert(rol)
    .values(ROLES.map((nombre) => ({ nombre })))
    .onConflictDoNothing()
}

const sufijo = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export async function crearUsuarioDePrueba(opciones: {
  rol: Rol
  contrasena?: string
  activo?: boolean
}) {
  await asegurarRoles()
  const [r] = await db.select({ id: rol.id }).from(rol).where(eq(rol.nombre, opciones.rol))
  if (!r) throw new Error('rol no encontrado')
  const correo = `test-${opciones.rol}-${sufijo()}@lh.test`
  const contrasena = opciones.contrasena ?? 'Prueba1234'
  const [u] = await db
    .insert(usuario)
    .values({
      rolId: r.id,
      nombre: `Prueba ${opciones.rol}`,
      correo,
      contrasenaHash: await hashContrasena(contrasena),
      activo: opciones.activo ?? true,
    })
    .returning({ id: usuario.id })
  if (!u) throw new Error('no se creó el usuario de prueba')
  return { id: u.id, correo, contrasena }
}

/** Elimina usuarios de prueba y sus rastros (sesiones, bitácora, intentos). */
export async function limpiarUsuariosDePrueba(ids: number[]) {
  if (!ids.length) return
  await db.delete(sesion).where(inArray(sesion.usuarioId, ids))
  await db.delete(bitacora).where(inArray(bitacora.usuarioId, ids))
  const correos = (
    await db.select({ correo: usuario.correo }).from(usuario).where(inArray(usuario.id, ids))
  ).map((f) => f.correo)
  if (correos.length) await db.delete(intentoAcceso).where(inArray(intentoAcceso.correo, correos))
  await db.delete(usuario).where(inArray(usuario.id, ids))
}

export function json(metodo: string, ruta: string, cuerpo?: unknown, extra: RequestInit = {}) {
  const { headers: extraHeaders, ...resto } = extra
  return app.handle(
    new Request(`http://localhost/api${ruta}`, {
      method: metodo,
      headers: {
        'content-type': 'application/json',
        ...((extraHeaders as Record<string, string>) ?? {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      ...resto,
    }),
  )
}

export async function iniciarSesionComo(correo: string, contrasena: string) {
  const res = await json('POST', '/auth/login', { correo, contrasena })
  const cookie = res.headers.get('set-cookie') ?? ''
  const cookieRefresco = cookie.split(';')[0] ?? ''
  const body = (await res.json()) as { tokenAcceso: string; usuario: { id: number } }
  return { res, tokenAcceso: body.tokenAcceso, cookieRefresco, usuario: body.usuario }
}

export const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` } })

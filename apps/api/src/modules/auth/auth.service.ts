import type { CambiarContrasenaInput, LoginInput, UsuarioPublico } from '@lh/shared'
import { env } from '../../config/env.ts'
import {
  firmarTokenAcceso,
  generarTokenRefresco,
  HASH_FICTICIO,
  hashContrasena,
  hashTokenRefresco,
  verificarContrasena,
} from '../../lib/tokens.ts'
import type { UsuarioActual } from '../../plugins/auth.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { registrarOperacion } from '../bitacora/bitacora.service.ts'
import * as usuarios from '../usuarios/usuarios.repository.ts'
import * as repo from './auth.repository.ts'

export interface ResultadoSesion {
  tokenAcceso: string
  tokenRefresco: string
  usuario: UsuarioPublico
}

const CREDENCIALES_INVALIDAS = 'Correo o contraseña incorrectos.'
/** Ventana en la que presentar un token recién rotado (dos pestañas) no se trata como robo. */
const GRACIA_ROTACION_MS = 30_000

export function duracionRefrescoSegundos(): number {
  return env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60
}

async function emitirSesion(
  usuario: UsuarioPublico,
  meta: repo.MetaPeticion,
): Promise<ResultadoSesion> {
  const tokenRefresco = generarTokenRefresco()
  const sid = await repo.crearSesion({
    usuarioId: usuario.id,
    refreshTokenHash: hashTokenRefresco(tokenRefresco),
    expiraEn: new Date(Date.now() + duracionRefrescoSegundos() * 1000),
    meta,
  })
  const tokenAcceso = await firmarTokenAcceso({
    sub: usuario.id,
    rol: usuario.rol,
    nombre: usuario.nombre,
    sid,
  })
  return { tokenAcceso, tokenRefresco, usuario }
}

/** RF-01: inicio de sesión. Mismo mensaje para correo inexistente y contraseña errada. */
export async function iniciarSesion(
  datos: LoginInput,
  meta: repo.MetaPeticion,
): Promise<ResultadoSesion> {
  const fila = await usuarios.buscarPorCorreo(datos.correo)
  // Se verifica siempre contra un hash para que el tiempo de respuesta no revele si el correo existe.
  const valida = await verificarContrasena(datos.contrasena, fila?.contrasenaHash ?? HASH_FICTICIO)
  const exito = Boolean(fila?.activo && valida)
  await repo.registrarIntento(datos.correo, exito, meta)
  if (!fila || !valida) throw new ErrorAplicacion(401, CREDENCIALES_INVALIDAS)
  if (!fila.activo)
    throw new ErrorAplicacion(403, 'Su cuenta está desactivada. Contacte al administrador.')
  const { contrasenaHash: _omitido, creadoEn, ...publico } = fila
  return emitirSesion({ ...publico, creadoEn: creadoEn.toISOString() }, meta)
}

/**
 * Rotación del token de refresco. Si se presenta un token ya revocado se asume robo y
 * se cierran todas las sesiones del usuario.
 */
export async function refrescarSesion(
  tokenRefresco: string | undefined,
  meta: repo.MetaPeticion,
): Promise<ResultadoSesion> {
  if (!tokenRefresco) throw new ErrorAplicacion(401, 'No hay una sesión activa.')
  const s = await repo.buscarSesionPorHash(hashTokenRefresco(tokenRefresco))
  if (!s) throw new ErrorAplicacion(401, 'La sesión no es válida. Inicie sesión de nuevo.')
  if (s.revocadaEn) {
    // Dos pestañas pueden refrescar casi a la vez con el mismo token: dentro del periodo de gracia
    // no se considera robo. Pasado ese tiempo, presentar un token ya rotado invalida todas las sesiones.
    if (Date.now() - s.revocadaEn.getTime() > GRACIA_ROTACION_MS) {
      await usuarios.revocarSesiones(s.usuarioId)
      throw new ErrorAplicacion(
        401,
        'La sesión fue invalidada por seguridad. Inicie sesión de nuevo.',
      )
    }
    throw new ErrorAplicacion(401, 'La sesión ya fue renovada en otra pestaña. Recargue la página.')
  }
  if (s.expiraEn.getTime() <= Date.now()) {
    throw new ErrorAplicacion(401, 'Su sesión expiró. Inicie sesión de nuevo.')
  }
  const usuario = await usuarios.buscarPorId(s.usuarioId)
  if (!usuario?.activo) throw new ErrorAplicacion(403, 'Su cuenta está desactivada.')
  await repo.revocarSesion(s.id)
  return emitirSesion(usuario, meta)
}

/** RF-03: cierre de sesión seguro. Idempotente. */
export async function cerrarSesion(tokenRefresco: string | undefined): Promise<void> {
  if (!tokenRefresco) return
  const s = await repo.buscarSesionPorHash(hashTokenRefresco(tokenRefresco))
  if (s && !s.revocadaEn) await repo.revocarSesion(s.id)
}

export async function usuarioActual(actor: UsuarioActual): Promise<UsuarioPublico> {
  const u = await usuarios.buscarPorId(actor.sub)
  if (!u?.activo) throw new ErrorAplicacion(401, 'Su cuenta ya no está activa.')
  return u
}

/** Cambio de contraseña por el propio usuario. Cierra las demás sesiones. */
export async function cambiarContrasena(
  actor: UsuarioActual,
  datos: CambiarContrasenaInput,
): Promise<void> {
  const hash = await usuarios.obtenerHash(actor.sub)
  if (!hash || !(await verificarContrasena(datos.contrasenaActual, hash))) {
    throw new ErrorAplicacion(400, 'La contraseña actual no es correcta.')
  }
  if (datos.contrasenaActual === datos.contrasenaNueva) {
    throw new ErrorAplicacion(400, 'La nueva contraseña debe ser distinta de la actual.')
  }
  await usuarios.actualizar(actor.sub, {
    contrasenaHash: await hashContrasena(datos.contrasenaNueva),
    debeCambiarContrasena: false,
  })
  await usuarios.revocarSesiones(actor.sub, actor.sid)
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'cambiar_contrasena',
    entidad: 'usuario',
    entidadId: actor.sub,
    descripcion: 'Cambió su contraseña',
  })
}

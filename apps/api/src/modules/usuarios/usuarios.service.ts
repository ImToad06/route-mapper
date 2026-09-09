import type {
  ActualizarUsuarioInput,
  CrearUsuarioInput,
  ListarUsuariosInput,
  UsuarioPublico,
} from '@lh/shared'
import { construirPagina } from '../../lib/paginacion.ts'
import { generarContrasenaTemporal, hashContrasena } from '../../lib/tokens.ts'
import type { UsuarioActual } from '../../plugins/auth.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { registrarOperacion } from '../bitacora/bitacora.service.ts'
import * as repo from './usuarios.repository.ts'

export async function listarUsuarios(filtros: ListarUsuariosInput) {
  const { datos, total } = await repo.listar(filtros)
  return construirPagina(datos, total, filtros.pagina, filtros.porPagina)
}

export async function obtenerUsuario(id: number): Promise<UsuarioPublico> {
  const u = await repo.buscarPorId(id)
  if (!u) throw new ErrorAplicacion(404, 'El usuario no existe.')
  return u
}

export async function crearUsuario(datos: CrearUsuarioInput, actor: UsuarioActual) {
  if (await repo.buscarPorCorreo(datos.correo)) {
    throw new ErrorAplicacion(409, 'Ya existe un usuario con ese correo.')
  }
  const contrasenaTemporal = datos.contrasena ? null : generarContrasenaTemporal()
  const contrasena = datos.contrasena ?? contrasenaTemporal
  if (!contrasena) throw new Error('Sin contraseña')
  const id = await repo.crear({
    nombre: datos.nombre,
    correo: datos.correo,
    rolId: await repo.idDeRol(datos.rol),
    contrasenaHash: await hashContrasena(contrasena),
    debeCambiarContrasena: true,
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'crear',
    entidad: 'usuario',
    entidadId: id,
    descripcion: `Creó el usuario ${datos.correo} con rol ${datos.rol}`,
  })
  const usuario = await obtenerUsuario(id)
  return { usuario, contrasenaTemporal }
}

export async function actualizarUsuario(
  id: number,
  datos: ActualizarUsuarioInput,
  actor: UsuarioActual,
) {
  const actual = await obtenerUsuario(id)
  if (
    datos.correo &&
    datos.correo !== actual.correo &&
    (await repo.buscarPorCorreo(datos.correo))
  ) {
    throw new ErrorAplicacion(409, 'Ya existe un usuario con ese correo.')
  }
  if (datos.rol && datos.rol !== actual.rol && id === actor.sub) {
    throw new ErrorAplicacion(400, 'No puede cambiar su propio rol.')
  }
  await repo.actualizar(id, {
    ...(datos.nombre !== undefined && { nombre: datos.nombre }),
    ...(datos.correo !== undefined && { correo: datos.correo }),
    ...(datos.rol !== undefined && { rolId: await repo.idDeRol(datos.rol) }),
  })
  if (datos.rol && datos.rol !== actual.rol) await repo.revocarSesiones(id)
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'usuario',
    entidadId: id,
    descripcion: `Actualizó el usuario ${actual.correo}`,
  })
  return obtenerUsuario(id)
}

export async function cambiarEstadoUsuario(id: number, activo: boolean, actor: UsuarioActual) {
  if (id === actor.sub) throw new ErrorAplicacion(400, 'No puede desactivar su propia cuenta.')
  const actual = await obtenerUsuario(id)
  await repo.actualizar(id, { activo })
  if (!activo) await repo.revocarSesiones(id)
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: activo ? 'activar' : 'desactivar',
    entidad: 'usuario',
    entidadId: id,
    descripcion: `${activo ? 'Activó' : 'Desactivó'} el usuario ${actual.correo}`,
  })
  return obtenerUsuario(id)
}

/** Restablecimiento por el administrador (RF-03): genera una contraseña temporal y cierra las sesiones. */
export async function restablecerContrasena(id: number, actor: UsuarioActual) {
  const actual = await obtenerUsuario(id)
  const contrasenaTemporal = generarContrasenaTemporal()
  await repo.actualizar(id, {
    contrasenaHash: await hashContrasena(contrasenaTemporal),
    debeCambiarContrasena: true,
  })
  await repo.revocarSesiones(id)
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'restablecer_contrasena',
    entidad: 'usuario',
    entidadId: id,
    descripcion: `Restableció la contraseña de ${actual.correo}`,
  })
  return { contrasenaTemporal }
}

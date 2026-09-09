import type { ListarUsuariosInput, Rol, UsuarioPublico } from '@lh/shared'
import { and, count, desc, eq, ilike, isNull, ne, or, type SQL } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { rol, sesion, usuario } from '../../db/schema/index.ts'

const columnasPublicas = {
  id: usuario.id,
  nombre: usuario.nombre,
  correo: usuario.correo,
  rol: rol.nombre,
  activo: usuario.activo,
  debeCambiarContrasena: usuario.debeCambiarContrasena,
  creadoEn: usuario.creadoEn,
}

function aPublico(fila: {
  id: number
  nombre: string
  correo: string
  rol: Rol
  activo: boolean
  debeCambiarContrasena: boolean
  creadoEn: Date
}): UsuarioPublico {
  return { ...fila, creadoEn: fila.creadoEn.toISOString() }
}

export async function buscarPorCorreo(correo: string) {
  const [fila] = await db
    .select({ ...columnasPublicas, contrasenaHash: usuario.contrasenaHash })
    .from(usuario)
    .innerJoin(rol, eq(rol.id, usuario.rolId))
    .where(eq(usuario.correo, correo))
  return fila ?? null
}

export async function buscarPorId(id: number): Promise<UsuarioPublico | null> {
  const [fila] = await db
    .select(columnasPublicas)
    .from(usuario)
    .innerJoin(rol, eq(rol.id, usuario.rolId))
    .where(eq(usuario.id, id))
  return fila ? aPublico(fila) : null
}

export async function obtenerHash(id: number): Promise<string | null> {
  const [fila] = await db
    .select({ hash: usuario.contrasenaHash })
    .from(usuario)
    .where(eq(usuario.id, id))
  return fila?.hash ?? null
}

export async function idDeRol(nombre: Rol): Promise<number> {
  const [fila] = await db.select({ id: rol.id }).from(rol).where(eq(rol.nombre, nombre))
  if (!fila) throw new Error(`El rol ${nombre} no existe en la base de datos`)
  return fila.id
}

export async function listar(filtros: ListarUsuariosInput) {
  const condiciones: SQL[] = []
  if (filtros.buscar) {
    const patron = `%${filtros.buscar}%`
    const cond = or(ilike(usuario.nombre, patron), ilike(usuario.correo, patron))
    if (cond) condiciones.push(cond)
  }
  if (filtros.rol) condiciones.push(eq(rol.nombre, filtros.rol))
  if (filtros.activo !== undefined) condiciones.push(eq(usuario.activo, filtros.activo))
  const where = condiciones.length ? and(...condiciones) : undefined

  const [filas, [total]] = await Promise.all([
    db
      .select(columnasPublicas)
      .from(usuario)
      .innerJoin(rol, eq(rol.id, usuario.rolId))
      .where(where)
      .orderBy(desc(usuario.creadoEn))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db
      .select({ total: count() })
      .from(usuario)
      .innerJoin(rol, eq(rol.id, usuario.rolId))
      .where(where),
  ])
  return { datos: filas.map(aPublico), total: total?.total ?? 0 }
}

export async function crear(datos: {
  nombre: string
  correo: string
  rolId: number
  contrasenaHash: string
  debeCambiarContrasena: boolean
}): Promise<number> {
  const [fila] = await db.insert(usuario).values(datos).returning({ id: usuario.id })
  if (!fila) throw new Error('No se pudo crear el usuario')
  return fila.id
}

export async function actualizar(
  id: number,
  datos: Partial<{
    nombre: string
    correo: string
    rolId: number
    activo: boolean
    contrasenaHash: string
    debeCambiarContrasena: boolean
  }>,
): Promise<void> {
  await db
    .update(usuario)
    .set({ ...datos, actualizadoEn: new Date() })
    .where(eq(usuario.id, id))
}

export async function revocarSesiones(usuarioId: number, exceptoSesionId?: string): Promise<void> {
  const condiciones: SQL[] = [eq(sesion.usuarioId, usuarioId), isNull(sesion.revocadaEn)]
  if (exceptoSesionId) condiciones.push(ne(sesion.id, exceptoSesionId))
  await db
    .update(sesion)
    .set({ revocadaEn: new Date() })
    .where(and(...condiciones))
}

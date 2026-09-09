import type { ListarCatalogoInput, ZonaInput } from '@lh/shared'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { destino, zona } from '../../db/schema/index.ts'
import {
  combinar,
  condicionActivo,
  condicionBusqueda,
  contar,
  paginar,
  sinCambios,
} from '../../lib/catalogo.ts'
import { construirPagina } from '../../lib/paginacion.ts'
import type { UsuarioActual } from '../../plugins/auth.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { registrarOperacion } from '../bitacora/bitacora.service.ts'

export async function listarZonas(f: ListarCatalogoInput) {
  const where = combinar(
    condicionBusqueda(f.buscar, [zona.nombre, zona.descripcion]),
    condicionActivo(f.activo, zona.activo),
  )
  const [filas, [total]] = await Promise.all([
    paginar(
      db
        .select({
          id: zona.id,
          nombre: zona.nombre,
          descripcion: zona.descripcion,
          activo: zona.activo,
          totalDestinos: contar(destino.id),
        })
        .from(zona)
        .leftJoin(destino, eq(destino.zonaId, zona.id))
        .where(where)
        .groupBy(zona.id)
        .orderBy(asc(zona.nombre))
        .$dynamic(),
      f.pagina,
      f.porPagina,
    ),
    db.select({ total: contar() }).from(zona).where(where),
  ])
  return construirPagina(filas, total?.total ?? 0, f.pagina, f.porPagina)
}

export async function obtenerZona(id: number) {
  const [z] = await db.select().from(zona).where(eq(zona.id, id))
  if (!z) throw new ErrorAplicacion(404, 'La zona no existe.')
  return z
}

async function nombreEnUso(nombre: string, exceptoId?: number) {
  const [z] = await db
    .select({ id: zona.id })
    .from(zona)
    .where(sql`lower(${zona.nombre}) = lower(${nombre})`)
  return Boolean(z && z.id !== exceptoId)
}

export async function crearZona(datos: ZonaInput, actor: UsuarioActual) {
  if (await nombreEnUso(datos.nombre))
    throw new ErrorAplicacion(409, 'Ya existe una zona con ese nombre.')
  const [z] = await db.insert(zona).values(datos).returning()
  if (!z) throw new Error('No se pudo crear la zona')
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'crear',
    entidad: 'zona',
    entidadId: z.id,
    descripcion: `Creó la zona ${z.nombre}`,
  })
  return z
}

/** Busca una zona por nombre (sin distinguir mayúsculas) o la crea. Usado por la importación. */
export async function obtenerOCrearZonaPorNombre(nombre: string, actor: UsuarioActual) {
  const [z] = await db
    .select()
    .from(zona)
    .where(sql`lower(${zona.nombre}) = lower(${nombre.trim()})`)
  return z ?? crearZona({ nombre: nombre.trim() }, actor)
}

export async function actualizarZona(id: number, datos: Partial<ZonaInput>, actor: UsuarioActual) {
  const actual = await obtenerZona(id)
  if (sinCambios(datos)) return actual
  if (datos.nombre && (await nombreEnUso(datos.nombre, id)))
    throw new ErrorAplicacion(409, 'Ya existe una zona con ese nombre.')
  await db.update(zona).set(datos).where(eq(zona.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'zona',
    entidadId: id,
    descripcion: `Actualizó la zona ${actual.nombre}`,
  })
  return obtenerZona(id)
}

export async function cambiarActivoZona(id: number, activo: boolean, actor: UsuarioActual) {
  const actual = await obtenerZona(id)
  await db.update(zona).set({ activo }).where(eq(zona.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: activo ? 'activar' : 'desactivar',
    entidad: 'zona',
    entidadId: id,
    descripcion: `${activo ? 'Activó' : 'Desactivó'} la zona ${actual.nombre}`,
  })
  return obtenerZona(id)
}

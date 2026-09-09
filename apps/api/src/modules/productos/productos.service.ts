import type { ListarCatalogoInput, ProductoInput } from '@lh/shared'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { producto } from '../../db/schema/index.ts'
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

const aPublico = (p: typeof producto.$inferSelect) => ({ ...p, pesoKg: Number(p.pesoKg) })

export async function listarProductos(f: ListarCatalogoInput) {
  const where = combinar(
    condicionBusqueda(f.buscar, [producto.codigo, producto.descripcion]),
    condicionActivo(f.activo, producto.activo),
  )
  const [filas, [total]] = await Promise.all([
    paginar(
      db.select().from(producto).where(where).orderBy(desc(producto.creadoEn)).$dynamic(),
      f.pagina,
      f.porPagina,
    ),
    db.select({ total: contar() }).from(producto).where(where),
  ])
  return construirPagina(filas.map(aPublico), total?.total ?? 0, f.pagina, f.porPagina)
}

export async function obtenerProducto(id: number) {
  const [p] = await db.select().from(producto).where(eq(producto.id, id))
  if (!p) throw new ErrorAplicacion(404, 'El producto no existe.')
  return aPublico(p)
}

async function codigoEnUso(codigo: string, exceptoId?: number) {
  const [p] = await db.select({ id: producto.id }).from(producto).where(eq(producto.codigo, codigo))
  return Boolean(p && p.id !== exceptoId)
}

export async function crearProducto(datos: ProductoInput, actor: UsuarioActual) {
  if (await codigoEnUso(datos.codigo))
    throw new ErrorAplicacion(409, 'Ya existe un producto con ese código.')
  const [p] = await db
    .insert(producto)
    .values({ ...datos, pesoKg: String(datos.pesoKg) })
    .returning()
  if (!p) throw new Error('No se pudo crear el producto')
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'crear',
    entidad: 'producto',
    entidadId: p.id,
    descripcion: `Registró el producto ${p.codigo}`,
  })
  return aPublico(p)
}

export async function actualizarProducto(
  id: number,
  datos: Partial<ProductoInput>,
  actor: UsuarioActual,
) {
  const actual = await obtenerProducto(id)
  if (sinCambios(datos)) return actual
  if (datos.codigo && (await codigoEnUso(datos.codigo, id)))
    throw new ErrorAplicacion(409, 'Ya existe un producto con ese código.')
  const { pesoKg, ...resto } = datos
  await db
    .update(producto)
    .set({ ...resto, ...(pesoKg !== undefined && { pesoKg: String(pesoKg) }) })
    .where(eq(producto.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'producto',
    entidadId: id,
    descripcion: `Actualizó el producto ${actual.codigo}`,
  })
  return obtenerProducto(id)
}

/** RF-07 habla de eliminar; se desactiva para conservar el historial de rutas. */
export async function cambiarActivoProducto(id: number, activo: boolean, actor: UsuarioActual) {
  const actual = await obtenerProducto(id)
  await db.update(producto).set({ activo }).where(eq(producto.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: activo ? 'activar' : 'desactivar',
    entidad: 'producto',
    entidadId: id,
    descripcion: `${activo ? 'Activó' : 'Desactivó'} el producto ${actual.codigo}`,
  })
  return obtenerProducto(id)
}

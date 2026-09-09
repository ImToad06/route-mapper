import type { ListarBitacoraInput } from '@lh/shared'
import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { bitacora, usuario } from '../../db/schema/index.ts'
import { logger } from '../../lib/logger.ts'
import { construirPagina } from '../../lib/paginacion.ts'

export interface Operacion {
  usuarioId: number | null
  accion:
    | 'crear'
    | 'actualizar'
    | 'desactivar'
    | 'activar'
    | 'eliminar'
    | 'asignar'
    | 'restablecer_contrasena'
    | 'cambiar_contrasena'
    | 'cambiar_estado'
    | 'calcular'
    | 'optimizar'
    | 'planificar'
    | 'cancelar'
  entidad:
    | 'usuario'
    | 'conductor'
    | 'vehiculo'
    | 'producto'
    | 'zona'
    | 'destino'
    | 'ruta'
    | 'sesion'
    | 'configuracion'
  entidadId?: number | null
  descripcion: string
}

/** Registra una operación relevante en la bitácora (RF-27). Nunca interrumpe la operación principal. */
export async function registrarOperacion(op: Operacion): Promise<void> {
  try {
    await db.insert(bitacora).values({
      usuarioId: op.usuarioId,
      accion: op.accion,
      entidad: op.entidad,
      entidadId: op.entidadId ?? null,
      descripcion: op.descripcion,
    })
  } catch (err) {
    logger.error({ err, op }, 'No se pudo registrar en la bitácora')
  }
}

export async function listarBitacora(filtros: ListarBitacoraInput) {
  const condiciones: SQL[] = []
  if (filtros.entidad) condiciones.push(eq(bitacora.entidad, filtros.entidad))
  if (filtros.usuarioId) condiciones.push(eq(bitacora.usuarioId, filtros.usuarioId))
  if (filtros.desde)
    condiciones.push(gte(bitacora.fechaHora, new Date(`${filtros.desde}T00:00:00`)))
  if (filtros.hasta)
    condiciones.push(lte(bitacora.fechaHora, new Date(`${filtros.hasta}T23:59:59.999`)))
  const where = condiciones.length ? and(...condiciones) : undefined

  const [filas, [total]] = await Promise.all([
    db
      .select({
        id: bitacora.id,
        usuarioId: bitacora.usuarioId,
        usuarioNombre: usuario.nombre,
        accion: bitacora.accion,
        entidad: bitacora.entidad,
        entidadId: bitacora.entidadId,
        descripcion: bitacora.descripcion,
        fechaHora: bitacora.fechaHora,
      })
      .from(bitacora)
      .leftJoin(usuario, eq(usuario.id, bitacora.usuarioId))
      .where(where)
      .orderBy(desc(bitacora.fechaHora))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina),
    db.select({ total: count() }).from(bitacora).where(where),
  ])
  return construirPagina(filas, total?.total ?? 0, filtros.pagina, filtros.porPagina)
}

import type { AccionBitacora, EntidadBitacora, ListarBitacoraInput } from '@lh/shared'
import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { bitacora, usuario } from '../../db/schema/index.ts'
import { logger } from '../../lib/logger.ts'
import { construirPagina } from '../../lib/paginacion.ts'

export interface Operacion {
  usuarioId: number | null
  accion: AccionBitacora
  entidad: EntidadBitacora
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

type FiltrosBitacora = Pick<
  ListarBitacoraInput,
  'entidad' | 'accion' | 'usuarioId' | 'desde' | 'hasta'
>

function condicionesBitacora(filtros: FiltrosBitacora) {
  const condiciones: SQL[] = []
  if (filtros.entidad) condiciones.push(eq(bitacora.entidad, filtros.entidad))
  if (filtros.accion) condiciones.push(eq(bitacora.accion, filtros.accion))
  if (filtros.usuarioId) condiciones.push(eq(bitacora.usuarioId, filtros.usuarioId))
  if (filtros.desde)
    condiciones.push(gte(bitacora.fechaHora, new Date(`${filtros.desde}T00:00:00`)))
  if (filtros.hasta)
    condiciones.push(lte(bitacora.fechaHora, new Date(`${filtros.hasta}T23:59:59.999`)))
  return condiciones.length ? and(...condiciones) : undefined
}

const columnasBitacora = {
  id: bitacora.id,
  usuarioId: bitacora.usuarioId,
  usuarioNombre: usuario.nombre,
  accion: bitacora.accion,
  entidad: bitacora.entidad,
  entidadId: bitacora.entidadId,
  descripcion: bitacora.descripcion,
  fechaHora: bitacora.fechaHora,
}

export async function listarBitacora(filtros: ListarBitacoraInput) {
  const where = condicionesBitacora(filtros)
  const [filas, [total]] = await Promise.all([
    db
      .select(columnasBitacora)
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

/** Para exportar (RF-27): mismos filtros sin paginar, con un tope razonable de filas. */
const TOPE_EXPORTAR_BITACORA = 5000
export async function listarBitacoraParaExportar(filtros: FiltrosBitacora) {
  const where = condicionesBitacora(filtros)
  const [filas, [total]] = await Promise.all([
    db
      .select(columnasBitacora)
      .from(bitacora)
      .leftJoin(usuario, eq(usuario.id, bitacora.usuarioId))
      .where(where)
      .orderBy(desc(bitacora.fechaHora))
      .limit(TOPE_EXPORTAR_BITACORA),
    db.select({ total: count() }).from(bitacora).where(where),
  ])
  // Si hay más filas que el tope, se avisa en vez de exportar en silencio un recorte parcial.
  return { filas, truncado: (total?.total ?? 0) > TOPE_EXPORTAR_BITACORA }
}

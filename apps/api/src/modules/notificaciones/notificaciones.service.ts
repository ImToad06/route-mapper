import type { TipoNotificacion } from '@lh/shared'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { notificacion } from '../../db/schema/index.ts'
import { contar } from '../../lib/catalogo.ts'
import { logger } from '../../lib/logger.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'

/** Crea una notificación interna (RF-18/RF-19). Nunca interrumpe la operación que la origina. */
export async function crearNotificacion(datos: {
  usuarioId: number
  rutaId?: number | null
  tipo: TipoNotificacion
  titulo: string
  cuerpo: string
}): Promise<void> {
  try {
    await db.insert(notificacion).values({
      usuarioId: datos.usuarioId,
      rutaId: datos.rutaId ?? null,
      tipo: datos.tipo,
      titulo: datos.titulo,
      cuerpo: datos.cuerpo,
    })
  } catch (err) {
    logger.error({ err, datos }, 'No se pudo crear la notificación')
  }
}

export async function listarNotificaciones(usuarioId: number, soloNoLeidas?: boolean) {
  return db
    .select()
    .from(notificacion)
    .where(
      and(
        eq(notificacion.usuarioId, usuarioId),
        soloNoLeidas ? isNull(notificacion.leidaEn) : undefined,
      ),
    )
    .orderBy(desc(notificacion.creadoEn))
    .limit(100)
}

export async function contarNoLeidas(usuarioId: number) {
  const [fila] = await db
    .select({ total: contar() })
    .from(notificacion)
    .where(and(eq(notificacion.usuarioId, usuarioId), isNull(notificacion.leidaEn)))
  return fila?.total ?? 0
}

export async function marcarLeida(id: number, usuarioId: number) {
  const [n] = await db
    .select({ id: notificacion.id, usuarioId: notificacion.usuarioId })
    .from(notificacion)
    .where(eq(notificacion.id, id))
  if (!n || n.usuarioId !== usuarioId) throw new ErrorAplicacion(404, 'La notificación no existe.')
  await db.update(notificacion).set({ leidaEn: new Date() }).where(eq(notificacion.id, id))
}

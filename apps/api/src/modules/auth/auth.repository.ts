import { eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { intentoAcceso, sesion } from '../../db/schema/index.ts'

export interface MetaPeticion {
  ip: string | null
  userAgent: string | null
}

export async function registrarIntento(correo: string, exito: boolean, meta: MetaPeticion) {
  await db.insert(intentoAcceso).values({ correo, exito, ip: meta.ip, userAgent: meta.userAgent })
}

export async function crearSesion(datos: {
  usuarioId: number
  refreshTokenHash: string
  expiraEn: Date
  meta: MetaPeticion
}): Promise<string> {
  const [fila] = await db
    .insert(sesion)
    .values({
      usuarioId: datos.usuarioId,
      refreshTokenHash: datos.refreshTokenHash,
      expiraEn: datos.expiraEn,
      ip: datos.meta.ip,
      userAgent: datos.meta.userAgent,
    })
    .returning({ id: sesion.id })
  if (!fila) throw new Error('No se pudo crear la sesión')
  return fila.id
}

export async function buscarSesionPorHash(hash: string) {
  const [fila] = await db.select().from(sesion).where(eq(sesion.refreshTokenHash, hash))
  return fila ?? null
}

export async function revocarSesion(id: string) {
  await db.update(sesion).set({ revocadaEn: new Date() }).where(eq(sesion.id, id))
}

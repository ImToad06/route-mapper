/** Restablece la contraseña del administrador del seed: bun --env-file=../../.env src/test/reset-admin.ts */
import { eq } from 'drizzle-orm'
import { db, sql } from '../db/client.ts'
import { sesion, usuario } from '../db/schema/index.ts'
import { hashContrasena } from '../lib/tokens.ts'

const CORREO = process.env.SEED_ADMIN_CORREO ?? 'admin@lh.local'
const CONTRASENA = process.env.SEED_ADMIN_CONTRASENA ?? 'Admin12345'
const [u] = await db.select({ id: usuario.id }).from(usuario).where(eq(usuario.correo, CORREO))
if (!u) {
  console.error(`No existe ${CORREO}`)
  process.exit(1)
}
await db
  .update(usuario)
  .set({
    contrasenaHash: await hashContrasena(CONTRASENA),
    debeCambiarContrasena: true,
    activo: true,
  })
  .where(eq(usuario.id, u.id))
await db.update(sesion).set({ revocadaEn: new Date() }).where(eq(sesion.usuarioId, u.id))
console.log(`Contraseña de ${CORREO} restablecida a ${CONTRASENA} (deberá cambiarla al ingresar).`)
await sql.end()

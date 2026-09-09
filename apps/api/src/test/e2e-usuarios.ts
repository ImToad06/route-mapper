/**
 * Utilidad para las pruebas de extremo a extremo (Playwright).
 *   bun src/test/e2e-usuarios.ts crear   → crea e2e-admin@lh.test / Admin1234 (con contraseña temporal)
 *   bun src/test/e2e-usuarios.ts limpiar → elimina todo usuario e2e-*@lh.test y sus rastros
 */
import { eq, inArray, like } from 'drizzle-orm'
import { db, sql } from '../db/client.ts'
import { bitacora, intentoAcceso, rol, sesion, usuario } from '../db/schema/index.ts'
import { hashContrasena } from '../lib/tokens.ts'
import { asegurarRoles } from './helpers.ts'

export const E2E_ADMIN = {
  correo: 'e2e-admin@lh.test',
  contrasena: 'Admin1234',
  nueva: 'Nueva12345',
}

async function limpiar() {
  const filas = await db
    .select({ id: usuario.id, correo: usuario.correo })
    .from(usuario)
    .where(like(usuario.correo, 'e2e-%@lh.test'))
  const ids = filas.map((f) => f.id)
  if (ids.length) {
    await db.delete(sesion).where(inArray(sesion.usuarioId, ids))
    await db.delete(bitacora).where(inArray(bitacora.usuarioId, ids))
    await db.delete(intentoAcceso).where(
      inArray(
        intentoAcceso.correo,
        filas.map((f) => f.correo),
      ),
    )
    await db.delete(usuario).where(inArray(usuario.id, ids))
  }
  console.log(`e2e: ${ids.length} usuario(s) eliminado(s)`)
}

async function crear() {
  await limpiar()
  await asegurarRoles()
  const [r] = await db.select({ id: rol.id }).from(rol).where(eq(rol.nombre, 'administrador'))
  if (!r) throw new Error('rol administrador no existe')
  await db.insert(usuario).values({
    rolId: r.id,
    nombre: 'Admin E2E',
    correo: E2E_ADMIN.correo,
    contrasenaHash: await hashContrasena(E2E_ADMIN.contrasena),
    debeCambiarContrasena: true,
  })
  console.log(`e2e: creado ${E2E_ADMIN.correo}`)
}

const accion = process.argv[2]
if (accion === 'crear') await crear()
else if (accion === 'limpiar') await limpiar()
else {
  console.error('Uso: bun src/test/e2e-usuarios.ts <crear|limpiar>')
  process.exit(1)
}
await sql.end()

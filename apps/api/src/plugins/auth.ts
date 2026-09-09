import type { Rol } from '@lh/shared'
import { Elysia } from 'elysia'
import { type ClaimsAcceso, verificarTokenAcceso } from '../lib/tokens.ts'
import { ErrorAplicacion } from './errores.ts'

export type UsuarioActual = ClaimsAcceso

async function resolverUsuario(authorization: string | undefined): Promise<UsuarioActual> {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
  if (!token) throw new ErrorAplicacion(401, 'Debe iniciar sesión para continuar.')
  const claims = await verificarTokenAcceso(token)
  if (!claims)
    throw new ErrorAplicacion(401, 'Su sesión expiró o no es válida. Inicie sesión de nuevo.')
  return claims
}

/**
 * Guards de autenticación y autorización (RF-02, RNF-04).
 *   { auth: true }                 → cualquier usuario autenticado
 *   { roles: ['administrador'] }   → solo esos roles (administrador siempre incluye a coordinador)
 */
export const autenticacion = new Elysia({ name: 'autenticacion' }).macro({
  auth: {
    resolve: async ({ headers }) => ({ usuario: await resolverUsuario(headers.authorization) }),
  },
  roles: (roles: readonly Rol[]) => ({
    resolve: async ({ headers }) => {
      const usuario = await resolverUsuario(headers.authorization)
      const permitido =
        roles.includes(usuario.rol) ||
        (usuario.rol === 'administrador' && roles.includes('coordinador'))
      if (!permitido) throw new ErrorAplicacion(403, 'No tiene permisos para realizar esta acción.')
      return { usuario }
    },
  }),
})

import { z } from 'zod'
import { ROLES } from '../enums.ts'
import { contrasenaSchema } from './auth.ts'
import { paginacionSchema } from './comunes.ts'

export const crearUsuarioSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(120),
  correo: z
    .string({ error: 'Ingrese un correo válido' })
    .trim()
    .toLowerCase()
    .max(160, 'El correo no puede superar 160 caracteres')
    .pipe(z.email({ error: 'Ingrese un correo válido' })),
  rol: z.enum(ROLES, { error: 'Seleccione un rol válido' }),
  /** Opcional: si no se envía, el sistema genera una contraseña temporal. */
  contrasena: contrasenaSchema.optional(),
})
export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>

export const actualizarUsuarioSchema = crearUsuarioSchema.omit({ contrasena: true }).partial()
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>

export const cambiarEstadoUsuarioSchema = z.object({ activo: z.boolean() })

export const listarUsuariosSchema = paginacionSchema.extend({
  rol: z.enum(ROLES).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})
export type ListarUsuariosInput = z.infer<typeof listarUsuariosSchema>

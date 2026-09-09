import { z } from 'zod'
import { ROLES } from '../enums.ts'

export const contrasenaSchema = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres')
  .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
  .regex(/\d/, 'La contraseña debe incluir al menos un número')

export const loginSchema = z.object({
  correo: z
    .string({ error: 'Ingrese un correo válido' })
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Ingrese un correo válido' })),
  contrasena: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const cambiarContrasenaSchema = z
  .object({
    contrasenaActual: z.string().min(1, 'Ingrese su contraseña actual'),
    contrasenaNueva: contrasenaSchema,
    confirmacion: z.string(),
  })
  .refine((d) => d.contrasenaNueva === d.confirmacion, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmacion'],
  })
export type CambiarContrasenaInput = z.infer<typeof cambiarContrasenaSchema>

/** Usuario tal como lo ve el cliente. Nunca incluye el hash de la contraseña. */
export const usuarioPublicoSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  correo: z.string(),
  rol: z.enum(ROLES),
  activo: z.boolean(),
  debeCambiarContrasena: z.boolean(),
  creadoEn: z.string(),
})
export type UsuarioPublico = z.infer<typeof usuarioPublicoSchema>

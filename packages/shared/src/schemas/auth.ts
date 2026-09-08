import { z } from 'zod'

export const loginSchema = z.object({
  correo: z.email({ error: 'Ingrese un correo válido' }).trim().toLowerCase(),
  contrasena: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const contrasenaSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar 72 caracteres')

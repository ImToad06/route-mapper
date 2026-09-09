import { z } from 'zod'
import { paginacionSchema } from './comunes.ts'

export const listarBitacoraSchema = paginacionSchema.extend({
  entidad: z.string().trim().max(40).optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
})
export type ListarBitacoraInput = z.infer<typeof listarBitacoraSchema>

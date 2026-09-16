import { z } from 'zod'
import { ACCIONES_BITACORA, ENTIDADES_BITACORA } from '../enums.ts'
import { paginacionSchema } from './comunes.ts'

export const listarBitacoraSchema = paginacionSchema.extend({
  entidad: z.enum(ENTIDADES_BITACORA).optional(),
  accion: z.enum(ACCIONES_BITACORA).optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
})
export type ListarBitacoraInput = z.infer<typeof listarBitacoraSchema>

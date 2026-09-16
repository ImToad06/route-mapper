import { z } from 'zod'
import { booleanoDeQuery } from './comunes.ts'

export const listarNotificacionesSchema = z.object({
  soloNoLeidas: booleanoDeQuery,
})
export type ListarNotificacionesInput = z.infer<typeof listarNotificacionesSchema>

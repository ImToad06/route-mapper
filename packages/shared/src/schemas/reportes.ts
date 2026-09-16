import { z } from 'zod'

/** Periodo (RF-22, RF-23): ambos extremos incluidos. */
export const periodoReporteSchema = z
  .object({
    desde: z.iso.date({ error: 'Ingrese la fecha de inicio' }),
    hasta: z.iso.date({ error: 'Ingrese la fecha de fin' }),
  })
  .refine((p) => p.desde <= p.hasta, {
    error: 'La fecha de inicio debe ser anterior o igual a la de fin',
    path: ['hasta'],
  })
export type PeriodoReporteInput = z.infer<typeof periodoReporteSchema>

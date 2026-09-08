import { z } from 'zod'

export const idSchema = z.coerce.number().int().positive()

export const paginacionSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().trim().max(100).optional(),
})
export type Paginacion = z.infer<typeof paginacionSchema>

export const coordenadasSchema = z.object({
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
})
export type Coordenadas = z.infer<typeof coordenadasSchema>

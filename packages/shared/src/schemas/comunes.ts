import { z } from 'zod'

export const idSchema = z.coerce.number().int().positive()

export const paginacionSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
  buscar: z.string().trim().max(100).optional(),
})
export type Paginacion = z.infer<typeof paginacionSchema>

export const coordenadasSchema = z.object({
  latitud: z.number({ error: 'Ubique el punto en el mapa' }).min(-90).max(90),
  longitud: z.number({ error: 'Ubique el punto en el mapa' }).min(-180).max(180),
})
export type Coordenadas = z.infer<typeof coordenadasSchema>

/** Colombia continental: evita coordenadas (0,0) o invertidas en importaciones y formularios. */
export const coordenadasColombiaSchema = z.object({
  latitud: z.coerce
    .number({ error: 'Ubique el punto en el mapa' })
    .min(-4.5, 'La latitud está fuera de Colombia')
    .max(13.5, 'La latitud está fuera de Colombia'),
  longitud: z.coerce
    .number({ error: 'Ubique el punto en el mapa' })
    .min(-82, 'La longitud está fuera de Colombia')
    .max(-66.8, 'La longitud está fuera de Colombia'),
})

/**
 * Texto opcional de formulario: la cadena vacía se convierte en `null` para que el servidor
 * escriba NULL explícitamente (y así se pueda borrar un valor existente).
 */
export const textoOpcional = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max).nullable().optional(),
  )

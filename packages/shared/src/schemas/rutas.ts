import { z } from 'zod'
import { ESTADOS_RUTA, type EstadoRuta, type Rol } from '../enums.ts'
import { paginacionSchema, textoOpcional } from './comunes.ts'

const fechaSchema = z.iso.date({ error: 'Ingrese una fecha válida (AAAA-MM-DD)' })

export const crearRutaSchema = z.object({
  fecha: fechaSchema,
  vehiculoId: z.coerce.number().int().positive().nullable().optional(),
  observaciones: textoOpcional(500),
})
export type CrearRutaInput = z.infer<typeof crearRutaSchema>

export const actualizarRutaSchema = crearRutaSchema.partial()
export type ActualizarRutaInput = z.infer<typeof actualizarRutaSchema>

/** Producto y cantidad dentro de una parada (RF-08, RF-09). */
export const productoParadaSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.coerce
    .number({ error: 'Ingrese la cantidad' })
    .positive('La cantidad debe ser mayor que cero')
    .max(100000, 'Cantidad demasiado grande'),
})

/** Lista completa de paradas de una ruta, en el orden deseado (RF-12, RF-13). */
export const paradasRutaSchema = z.object({
  paradas: z
    .array(
      z.object({
        destinoId: z.number().int().positive(),
        productos: z.array(productoParadaSchema).default([]),
      }),
    )
    .max(200, 'Una ruta no puede tener más de 200 paradas')
    .refine((p) => new Set(p.map((x) => x.destinoId)).size === p.length, {
      message: 'Un destino no puede repetirse en la misma ruta',
    }),
})
export type ParadasRutaInput = z.infer<typeof paradasRutaSchema>

export const listarRutasSchema = paginacionSchema.extend({
  estado: z.enum(ESTADOS_RUTA).optional(),
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  conductorId: z.coerce.number().int().positive().optional(),
})
export type ListarRutasInput = z.infer<typeof listarRutasSchema>

/**
 * Máquina de estados de la ruta (PLAN-DESARROLLO.md §1.4).
 * Clave: estado actual → transiciones permitidas y rol que puede ejecutarlas.
 */
export const TRANSICIONES_RUTA: Record<EstadoRuta, Partial<Record<EstadoRuta, readonly Rol[]>>> = {
  borrador: { planificada: ['coordinador'], cancelada: ['coordinador'] },
  planificada: {
    borrador: ['coordinador'],
    pendiente_aceptacion: ['coordinador'],
    cancelada: ['coordinador'],
  },
  pendiente_aceptacion: {
    asignada: ['conductor'],
    planificada: ['conductor', 'coordinador'],
    cancelada: ['coordinador'],
  },
  asignada: { en_curso: ['conductor'], cancelada: ['coordinador'] },
  en_curso: { completada: ['conductor'], incompleta: ['conductor'], cancelada: ['coordinador'] },
  completada: {},
  incompleta: {},
  cancelada: {},
}

/** true si `rol` puede llevar la ruta de `de` a `a`. El administrador puede todo lo que puede el coordinador. */
export function puedeTransicionar(de: EstadoRuta, a: EstadoRuta, rol: Rol): boolean {
  const roles = TRANSICIONES_RUTA[de][a]
  if (!roles) return false
  return roles.includes(rol) || (rol === 'administrador' && roles.includes('coordinador'))
}

/** Estados en los que el coordinador puede editar paradas, productos, fecha y vehículo (una ruta planificada debe volver a borrador). */
export const ESTADOS_RUTA_EDITABLES: readonly EstadoRuta[] = ['borrador']

/** Interpreta "08:00-18:00" como segundos desde medianoche; null si no hay horario o no es válido. */
export function interpretarHorario(
  horario: string | null | undefined,
): { inicio: number; fin: number } | null {
  if (!horario) return null
  const m = /^\s*(\d{1,2}):(\d{2})\s*(?:-|a|–)\s*(\d{1,2}):(\d{2})\s*$/i.exec(horario)
  if (!m) return null
  const [, h1, m1, h2, m2] = m
  const inicio = Number(h1) * 3600 + Number(m1) * 60
  const fin = Number(h2) * 3600 + Number(m2) * 60
  if (inicio >= fin || fin > 24 * 3600) return null
  return { inicio, fin }
}

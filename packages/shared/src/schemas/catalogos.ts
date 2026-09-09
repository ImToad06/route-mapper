import { z } from 'zod'
import { DISPONIBILIDAD_CONDUCTOR, UNIDADES_MEDIDA } from '../enums.ts'
import { contrasenaSchema } from './auth.ts'
import {
  coordenadasColombiaSchema,
  coordenadasSchema,
  paginacionSchema,
  textoOpcional,
} from './comunes.ts'

const booleanoDeQuery = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional()

/** Filtros comunes de los catálogos: búsqueda, paginación y estado. */
export const listarCatalogoSchema = paginacionSchema.extend({ activo: booleanoDeQuery })
export type ListarCatalogoInput = z.infer<typeof listarCatalogoSchema>

export const cambiarActivoSchema = z.object({ activo: z.boolean() })

// ---------- Vehículos (RF-26) ----------
export const vehiculoSchema = z.object({
  placa: z
    .string({ error: 'La placa es obligatoria' })
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z]{3}\d{3}$|^[A-Z]{3}\d{2}[A-Z]$/,
      'Use el formato de placa colombiana, por ejemplo ABC123',
    ),
  tipo: z
    .string({ error: 'El tipo es obligatorio' })
    .trim()
    .min(2, 'Indique el tipo de vehículo')
    .max(60),
  capacidadKg: z.coerce
    .number({ error: 'Ingrese la capacidad en kilogramos' })
    .positive('La capacidad debe ser mayor que cero')
    .max(60000, 'La capacidad no puede superar 60 000 kg'),
})
export type VehiculoInput = z.infer<typeof vehiculoSchema>
export const actualizarVehiculoSchema = vehiculoSchema.partial()

// ---------- Conductores (RF-04, RF-05, RF-06) ----------
const datosConductor = {
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(3, 'Ingrese el nombre completo')
    .max(120),
  documento: z
    .string({ error: 'El documento es obligatorio' })
    .trim()
    .regex(/^\d{5,15}$/, 'El documento debe tener solo números (5 a 15 dígitos)'),
  licencia: z
    .string({ error: 'La licencia es obligatoria' })
    .trim()
    .min(4, 'Ingrese el número de licencia')
    .max(30),
  telefono: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z
      .string()
      .trim()
      .regex(/^\+?\d{7,15}$/, 'Ingrese un teléfono válido, por ejemplo 3001234567')
      .nullable()
      .optional(),
  ),
  vehiculoId: z.coerce.number().int().positive().nullable().optional(),
}

/** Crear un conductor crea también su usuario con rol `conductor`. */
export const crearConductorSchema = z.object({
  ...datosConductor,
  correo: z
    .string({ error: 'Ingrese un correo válido' })
    .trim()
    .toLowerCase()
    .max(160)
    .pipe(z.email({ error: 'Ingrese un correo válido' })),
  contrasena: contrasenaSchema.optional(),
})
export type CrearConductorInput = z.infer<typeof crearConductorSchema>

export const actualizarConductorSchema = z
  .object({
    ...datosConductor,
    disponibilidad: z.enum(DISPONIBILIDAD_CONDUCTOR).exclude(['en_ruta']),
  })
  .partial()
export type ActualizarConductorInput = z.infer<typeof actualizarConductorSchema>

export const listarConductoresSchema = listarCatalogoSchema.extend({
  disponibilidad: z.enum(DISPONIBILIDAD_CONDUCTOR).optional(),
})
export type ListarConductoresInput = z.infer<typeof listarConductoresSchema>

// ---------- Productos (RF-07) ----------
export const productoSchema = z.object({
  codigo: z
    .string({ error: 'El código es obligatorio' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,40}$/, 'Use letras, números y guiones, por ejemplo ARR-25'),
  descripcion: z
    .string({ error: 'La descripción es obligatoria' })
    .trim()
    .min(3, 'Describa el producto')
    .max(160),
  unidadMedida: z.enum(UNIDADES_MEDIDA, { error: 'Seleccione una unidad' }),
  pesoKg: z.coerce
    .number({ error: 'Ingrese el peso en kilogramos' })
    .min(0, 'El peso no puede ser negativo')
    .max(10000, 'El peso no puede superar 10 000 kg'),
})
export type ProductoInput = z.infer<typeof productoSchema>
export const actualizarProductoSchema = productoSchema.partial()

// ---------- Zonas (RF-11) ----------
export const zonaSchema = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'Ingrese el nombre de la zona')
    .max(80),
  descripcion: textoOpcional(255),
})
export type ZonaInput = z.infer<typeof zonaSchema>
export const actualizarZonaSchema = zonaSchema.partial()

// ---------- Destinos (RF-10) ----------
export const destinoSchema = coordenadasColombiaSchema.extend({
  zonaId: z.coerce.number({ error: 'Seleccione una zona' }).int().positive('Seleccione una zona'),
  nombreCliente: z
    .string({ error: 'El nombre del cliente es obligatorio' })
    .trim()
    .min(2, 'Ingrese el nombre del cliente')
    .max(120),
  direccion: z
    .string({ error: 'La dirección es obligatoria' })
    .trim()
    .min(5, 'Ingrese la dirección')
    .max(255),
  horarioAtencion: textoOpcional(120),
  telefono: textoOpcional(30),
  /** true si el coordinador confirmó o movió el marcador en el mapa. */
  ubicacionVerificada: z.boolean().default(false),
})
export type DestinoInput = z.infer<typeof destinoSchema>
/** En la actualización el indicador de verificación solo cambia si se envía explícitamente. */
export const actualizarDestinoSchema = destinoSchema
  .omit({ ubicacionVerificada: true })
  .partial()
  .extend({ ubicacionVerificada: z.boolean().optional() })

export const listarDestinosSchema = listarCatalogoSchema.extend({
  zonaId: z.coerce.number().int().positive().optional(),
  verificados: booleanoDeQuery,
})
export type ListarDestinosInput = z.infer<typeof listarDestinosSchema>

/**
 * Fila de importación desde planilla. El navegador geocodifica antes de enviar las filas que no traen
 * coordenadas, así que aquí todas deben traerlas; `numero` es la fila de la planilla para reportar errores.
 */
export const filaImportacionDestinoSchema = z.object({
  numero: z.number().int().positive().optional(),
  nombreCliente: z
    .string({ error: 'Falta el nombre del cliente' })
    .trim()
    .min(2, 'Nombre de cliente muy corto')
    .max(120),
  direccion: z
    .string({ error: 'Falta la dirección' })
    .trim()
    .min(5, 'Dirección muy corta')
    .max(255),
  zona: z.string({ error: 'Falta la zona' }).trim().min(2, 'Zona muy corta').max(80),
  horarioAtencion: textoOpcional(120),
  telefono: textoOpcional(30),
  latitud: coordenadasColombiaSchema.shape.latitud.optional(),
  longitud: coordenadasColombiaSchema.shape.longitud.optional(),
  /** true si las coordenadas venían en la planilla; false si se geocodificaron automáticamente. */
  ubicacionVerificada: z.boolean().optional(),
})
export const importarDestinosSchema = z.object({
  filas: z
    .array(filaImportacionDestinoSchema)
    .min(1, 'No hay filas para importar')
    .max(100, 'Máximo 100 filas por importación'),
})
export type ImportarDestinosInput = z.infer<typeof importarDestinosSchema>

// ---------- Geocodificación ----------
export const geocodificarSchema = z.object({
  direccion: z.string().trim().min(5, 'Ingrese al menos 5 caracteres').max(255),
})
export const candidatoGeocodificacionSchema = coordenadasSchema.extend({
  etiqueta: z.string(),
})
export type CandidatoGeocodificacion = z.infer<typeof candidatoGeocodificacionSchema>

/** Área de Barranquilla y su área metropolitana, usada para centrar el mapa y acotar la geocodificación. */
export const AREA_BARRANQUILLA = {
  centro: { latitud: 10.9878, longitud: -74.7889 },
  limites: { oeste: -75.05, sur: 10.78, este: -74.6, norte: 11.15 },
  zoomInicial: 12,
} as const

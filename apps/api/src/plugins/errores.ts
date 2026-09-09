import { Elysia } from 'elysia'
import { logger } from '../lib/logger.ts'

/** Error de negocio con código HTTP y mensaje en español para el usuario final. */
export class ErrorAplicacion extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detalles?: unknown,
  ) {
    super(message)
    this.name = 'ErrorAplicacion'
  }
}

/** Mensajes por restricción única de PostgreSQL (código 23505) para carreras entre dos peticiones. */
const MENSAJES_UNICOS: Record<string, string> = {
  usuario_correo_unique: 'Ya existe un usuario con ese correo.',
  vehiculo_placa_unique: 'Ya existe un vehículo con esa placa.',
  conductor_documento_unique: 'Ya existe un conductor con ese documento.',
  conductor_usuario_id_unique: 'Ese usuario ya tiene una ficha de conductor.',
  producto_codigo_unique: 'Ya existe un producto con ese código.',
  zona_nombre_unique: 'Ya existe una zona con ese nombre.',
  ruta_codigo_unique: 'Ya existe una ruta con ese código.',
}

function errorDeUnicidad(error: unknown): string | null {
  // Drizzle envuelve el error del driver en DrizzleQueryError; el código de PostgreSQL viene en `cause`.
  let actual: unknown = error
  for (let i = 0; i < 3 && actual && typeof actual === 'object'; i++) {
    const e = actual as { code?: string; constraint_name?: string; cause?: unknown }
    if (e.code === '23505') {
      return MENSAJES_UNICOS[e.constraint_name ?? ''] ?? 'Ya existe un registro con ese valor.'
    }
    actual = e.cause
  }
  return null
}

export const manejadorErrores = new Elysia({ name: 'manejador-errores' })
  .error({ ErrorAplicacion })
  .onError(({ code, error, set }) => {
    switch (code) {
      case 'ErrorAplicacion':
        set.status = error.status
        return { mensaje: error.message, detalles: error.detalles }
      case 'VALIDATION':
        set.status = 422
        return { mensaje: 'Los datos enviados no son válidos.', detalles: error.all }
      case 'NOT_FOUND':
        set.status = 404
        return { mensaje: 'Recurso no encontrado.' }
      case 'PARSE':
        set.status = 400
        return { mensaje: 'No se pudo interpretar el cuerpo de la petición.' }
      default: {
        const unicidad = errorDeUnicidad(error)
        if (unicidad) {
          set.status = 409
          return { mensaje: unicidad }
        }
        logger.error({ err: error }, 'Error no controlado')
        set.status = 500
        return { mensaje: 'Ocurrió un error inesperado. Intente de nuevo.' }
      }
    }
  })
  .as('global')

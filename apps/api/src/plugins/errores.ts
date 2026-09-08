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
      default:
        logger.error({ err: error }, 'Error no controlado')
        set.status = 500
        return { mensaje: 'Ocurrió un error inesperado. Intente de nuevo.' }
    }
  })
  .as('global')

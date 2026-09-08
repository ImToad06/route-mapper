import { Elysia } from 'elysia'
import { logger } from '../lib/logger.ts'

const inicios = new WeakMap<Request, number>()

/** Registra cada petición (también las no encontradas) con su duración en milisegundos. */
export const registroPeticiones = new Elysia({ name: 'registro-peticiones' })
  .onRequest(({ request }) => {
    inicios.set(request, performance.now())
  })
  .onAfterResponse({ as: 'global' }, ({ request, set }) => {
    const inicio = inicios.get(request)
    const ms = inicio === undefined ? null : Math.round(performance.now() - inicio)
    logger.info(
      { metodo: request.method, ruta: new URL(request.url).pathname, estado: set.status, ms },
      'peticion',
    )
  })

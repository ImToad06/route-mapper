import type { Coordenadas } from '@lh/shared'
import { logger } from '../../lib/logger.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import type {
  ParadaOptimizable,
  ProveedorEnrutamiento,
  RecorridoCalculado,
  ResultadoOptimizacion,
} from './proveedor.ts'

interface RutaOsrm {
  geometry: string
  distance: number
  duration: number
  legs: { distance: number; duration: number }[]
}

const NO_DISPONIBLE = 'El motor de rutas no está disponible en este momento. Intente más tarde.'

const coords = (puntos: Coordenadas[]) => puntos.map((p) => `${p.longitud},${p.latitud}`).join(';')

async function pedir<T>(fetchFn: typeof fetch, url: URL): Promise<T> {
  let res: Response
  try {
    res = await fetchFn(url, { signal: AbortSignal.timeout(20_000) })
  } catch (err) {
    logger.warn({ err, url: url.pathname }, 'OSRM no responde')
    throw new ErrorAplicacion(503, NO_DISPONIBLE)
  }
  const cuerpo = (await res.json()) as { code?: string; message?: string } & T
  if (!res.ok || cuerpo.code !== 'Ok') {
    logger.warn(
      { estado: res.status, code: cuerpo.code, message: cuerpo.message },
      'OSRM devolvió error',
    )
    if (cuerpo.code === 'NoRoute' || cuerpo.code === 'NoTrips') {
      throw new ErrorAplicacion(
        422,
        'No se encontró un camino por carretera entre los puntos. Revise las ubicaciones de los destinos.',
      )
    }
    throw new ErrorAplicacion(503, NO_DISPONIBLE)
  }
  return cuerpo
}

const aRecorrido = (r: RutaOsrm): RecorridoCalculado => ({
  geometria: r.geometry,
  distanciaM: Math.round(r.distance),
  duracionS: Math.round(r.duration),
  tramos: r.legs.map((l) => ({
    distanciaM: Math.round(l.distance),
    duracionS: Math.round(l.duration),
  })),
})

/** OSRM: geometría y, como respaldo sin capacidades ni ventanas, orden óptimo con /trip. */
export function crearProveedorOsrm(
  baseUrl: string,
  fetchFn: typeof fetch = fetch,
): ProveedorEnrutamiento {
  return {
    async calcularRecorrido(puntos) {
      if (puntos.length < 2)
        throw new ErrorAplicacion(
          400,
          'Se necesitan al menos dos puntos para calcular un recorrido.',
        )
      const url = new URL(`/route/v1/driving/${coords(puntos)}`, baseUrl)
      url.searchParams.set('overview', 'full')
      url.searchParams.set('geometries', 'polyline')
      url.searchParams.set('steps', 'false')
      const r = await pedir<{ routes: RutaOsrm[] }>(fetchFn, url)
      const ruta = r.routes[0]
      if (!ruta) throw new ErrorAplicacion(422, 'No se encontró un camino entre los puntos.')
      return aRecorrido(ruta)
    },

    async optimizar(deposito, paradas): Promise<ResultadoOptimizacion> {
      if (paradas.length === 0)
        throw new ErrorAplicacion(400, 'La ruta no tiene paradas para optimizar.')
      const url = new URL(
        `/trip/v1/driving/${coords([deposito, ...paradas.map((p) => p.punto)])}`,
        baseUrl,
      )
      url.searchParams.set('roundtrip', 'true')
      url.searchParams.set('source', 'first')
      url.searchParams.set('overview', 'full')
      url.searchParams.set('geometries', 'polyline')
      const r = await pedir<{
        trips: RutaOsrm[]
        waypoints: { waypoint_index: number; trips_index: number }[]
      }>(fetchFn, url)
      const viaje = r.trips[0]
      if (!viaje) throw new ErrorAplicacion(422, 'No se pudo optimizar el recorrido.')
      // waypoints[i] corresponde al punto i enviado (0 = bodega); waypoint_index es su posición en el viaje.
      const orden = r.waypoints
        .map((w, i) => ({ i, pos: w.waypoint_index }))
        .filter((w) => w.i > 0)
        .sort((a, b) => a.pos - b.pos)
        .map((w) => (paradas[w.i - 1] as ParadaOptimizable).id)
      return { orden, noAsignadas: [], recorrido: aRecorrido(viaje) }
    },
  }
}

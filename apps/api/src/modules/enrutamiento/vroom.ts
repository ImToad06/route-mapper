import { logger } from '../../lib/logger.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { aLonLat, type ProveedorEnrutamiento, type ResultadoOptimizacion } from './proveedor.ts'

interface PasoVroom {
  type: 'start' | 'job' | 'end'
  id?: number
  arrival: number
  duration: number
  distance?: number
}
interface RespuestaVroom {
  code: number
  error?: string
  unassigned: { id: number }[]
  routes: { geometry?: string; distance?: number; duration: number; steps: PasoVroom[] }[]
}

/**
 * VROOM resuelve el VRP con capacidad y ventanas horarias (un vehículo por ruta). Usa OSRM por
 * debajo, así que la geometría y las distancias vienen del mismo mapa.
 */
export function crearProveedorVroom(
  baseUrl: string,
  respaldo: ProveedorEnrutamiento,
  fetchFn: typeof fetch = fetch,
): ProveedorEnrutamiento {
  return {
    calcularRecorrido: (puntos) => respaldo.calcularRecorrido(puntos),

    async optimizar(deposito, paradas, capacidadKg): Promise<ResultadoOptimizacion> {
      if (paradas.length === 0)
        throw new ErrorAplicacion(400, 'La ruta no tiene paradas para optimizar.')
      const usaCapacidad = capacidadKg !== undefined && capacidadKg > 0
      const cuerpo = {
        vehicles: [
          {
            id: 1,
            profile: 'car',
            start: aLonLat(deposito),
            end: aLonLat(deposito),
            ...(usaCapacidad && { capacity: [Math.floor(capacidadKg)] }),
          },
        ],
        jobs: paradas.map((p) => ({
          id: p.id,
          location: aLonLat(p.punto),
          service: p.servicioS,
          ...(usaCapacidad && { delivery: [Math.ceil(p.cargaKg)] }),
          ...(p.ventana && { time_windows: [[p.ventana.inicio, p.ventana.fin]] }),
        })),
        options: { g: true },
      }
      let res: Response
      try {
        res = await fetchFn(new URL('/', baseUrl), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(cuerpo),
          signal: AbortSignal.timeout(60_000),
        })
      } catch (err) {
        logger.warn({ err }, 'VROOM no responde; se usa el respaldo (OSRM trip)')
        return respaldo.optimizar(deposito, paradas, capacidadKg)
      }
      const datos = (await res.json()) as RespuestaVroom
      if (!res.ok || datos.code !== 0) {
        logger.warn(
          { estado: res.status, code: datos.code, error: datos.error },
          'VROOM devolvió error',
        )
        throw new ErrorAplicacion(
          503,
          'El optimizador de rutas no está disponible en este momento. Intente más tarde.',
        )
      }
      const ruta = datos.routes[0]
      if (!ruta) {
        // Nada cupo (por capacidad o ventanas): todas quedan sin asignar.
        return {
          orden: [],
          noAsignadas: paradas.map((p) => p.id),
          recorrido: { geometria: '', distanciaM: 0, duracionS: 0, tramos: [] },
        }
      }
      const pasos = ruta.steps
      const orden = pasos
        .filter((s) => s.type === 'job' && s.id !== undefined)
        .map((s) => s.id as number)
      // step.duration y step.distance son acumulados de viaje (sin servicio): el tramo es la diferencia.
      const tramos = pasos.slice(1).map((s, i) => {
        const previo = pasos[i] as PasoVroom
        return {
          distanciaM: Math.round((s.distance ?? 0) - (previo.distance ?? 0)),
          duracionS: Math.round(s.duration - previo.duration),
        }
      })
      return {
        orden,
        noAsignadas: datos.unassigned.map((u) => u.id),
        recorrido: {
          geometria: ruta.geometry ?? '',
          distanciaM: Math.round(ruta.distance ?? 0),
          duracionS: Math.round(ruta.duration),
          tramos,
        },
      }
    },
  }
}

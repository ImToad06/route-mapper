import { AREA_BARRANQUILLA, type CandidatoGeocodificacion } from '@lh/shared'
import { eq } from 'drizzle-orm'
import { env } from '../../config/env.ts'
import { db } from '../../db/client.ts'
import { geocodificacionCache } from '../../db/schema/index.ts'
import { logger } from '../../lib/logger.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'

/** Proveedor de geocodificación: convierte una dirección en candidatos con coordenadas. */
export interface ProveedorGeocodificacion {
  buscar(direccion: string): Promise<CandidatoGeocodificacion[]>
}

interface ResultadoNominatim {
  lat: string
  lon: string
  display_name: string
}

const INTERVALO_MS = 1100
let ultimaPeticion = 0
let cola: Promise<unknown> = Promise.resolve()

/** Serializa las peticiones y garantiza al menos 1,1 s entre ellas (política de uso de Nominatim). */
function conLimite<T>(fn: () => Promise<T>): Promise<T> {
  const siguiente = cola.then(async () => {
    const espera = ultimaPeticion + INTERVALO_MS - Date.now()
    if (espera > 0) await new Promise((r) => setTimeout(r, espera))
    ultimaPeticion = Date.now()
    return fn()
  })
  cola = siguiente.catch(() => undefined)
  return siguiente
}

export function crearProveedorNominatim(fetchFn: typeof fetch = fetch): ProveedorGeocodificacion {
  return {
    async buscar(direccion) {
      const { limites } = AREA_BARRANQUILLA
      const url = new URL('/search', env.NOMINATIM_URL)
      url.searchParams.set('q', `${direccion}, Barranquilla, Colombia`)
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('limit', '5')
      url.searchParams.set('countrycodes', 'co')
      url.searchParams.set(
        'viewbox',
        `${limites.oeste},${limites.norte},${limites.este},${limites.sur}`,
      )
      url.searchParams.set('accept-language', 'es')
      const res = await conLimite(() =>
        fetchFn(url, {
          headers: { 'user-agent': env.NOMINATIM_USER_AGENT, accept: 'application/json' },
        }),
      )
      if (!res.ok) {
        logger.warn({ estado: res.status }, 'Nominatim respondió con error')
        throw new ErrorAplicacion(
          502,
          'El servicio de mapas no está disponible en este momento. Ubique el punto manualmente.',
        )
      }
      const datos = (await res.json()) as ResultadoNominatim[]
      return datos.map((d) => ({
        etiqueta: d.display_name,
        latitud: Number(d.lat),
        longitud: Number(d.lon),
      }))
    },
  }
}

let proveedor: ProveedorGeocodificacion = crearProveedorNominatim()

/** Permite sustituir el proveedor (pruebas u otro servicio como Google). */
export function usarProveedor(p: ProveedorGeocodificacion) {
  proveedor = p
}

export const normalizarConsulta = (direccion: string) =>
  direccion.trim().toLowerCase().replace(/\s+/g, ' ')

/** Geocodifica con caché en base de datos. Devuelve candidatos ordenados por relevancia (puede ser vacío). */
export async function geocodificar(direccion: string): Promise<CandidatoGeocodificacion[]> {
  const consulta = normalizarConsulta(direccion).slice(0, 300)
  const [cache] = await db
    .select()
    .from(geocodificacionCache)
    .where(eq(geocodificacionCache.consulta, consulta))
  if (cache) return cache.resultados
  const resultados = await proveedor.buscar(consulta)
  await db.insert(geocodificacionCache).values({ consulta, resultados }).onConflictDoNothing()
  return resultados
}

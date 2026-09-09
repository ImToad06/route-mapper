import polyline from '@mapbox/polyline'
import { Warehouse } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Layer, Mapa, type MapRef, Marker, Source } from '@/components/mapa/mapa'
import { MarcadorPin } from '@/components/mapa/marcador-pin'

interface Punto {
  latitud: number
  longitud: number
}
interface Props {
  bodega: Punto | null
  paradas: { id: number; nombre: string; punto: Punto; verificada: boolean }[]
  geometria: string | null
  className?: string
  resaltada?: number | null
}

/** Mapa del recorrido: bodega, paradas numeradas y la polilínea calculada por el motor de rutas. */
export function MapaRuta({ bodega, paradas, geometria, className, resaltada }: Props) {
  const mapa = useRef<MapRef>(null)
  const linea = useMemo(() => {
    if (!geometria) return null
    const coords = polyline.decode(geometria).map(([lat, lon]) => [lon, lat])
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: coords },
    }
  }, [geometria])

  const clave = `${bodega?.latitud},${bodega?.longitud}|${paradas.map((p) => `${p.punto.latitud},${p.punto.longitud}`).join(';')}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: se reencuadra solo cuando cambian los puntos.
  useEffect(() => {
    const puntos = [...paradas.map((p) => p.punto), ...(bodega ? [bodega] : [])]
    if (!mapa.current || puntos.length === 0) return
    const lats = puntos.map((p) => p.latitud)
    const lons = puntos.map((p) => p.longitud)
    mapa.current.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 60, maxZoom: 15, duration: 500 },
    )
  }, [clave])

  return (
    <Mapa ref={mapa} className={className ?? 'h-[60dvh] w-full overflow-hidden rounded-md border'}>
      {linea && (
        <Source id="recorrido" type="geojson" data={linea}>
          <Layer
            id="recorrido-borde"
            type="line"
            paint={{ 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.8 }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          />
          <Layer
            id="recorrido-linea"
            type="line"
            paint={{ 'line-color': '#d9591c', 'line-width': 4 }}
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
          />
        </Source>
      )}
      {bodega && (
        <Marker latitude={bodega.latitud} longitude={bodega.longitud} anchor="center">
          <div
            className="flex size-8 items-center justify-center rounded-md border-2 border-white bg-foreground text-background shadow-md"
            title="Bodega"
          >
            <Warehouse className="size-4" aria-hidden="true" />
          </div>
        </Marker>
      )}
      {paradas.map((p, i) => (
        <Marker key={p.id} latitude={p.punto.latitud} longitude={p.punto.longitud} anchor="bottom">
          <div
            title={p.nombre}
            className={
              resaltada === p.id ? 'scale-125 transition-transform' : 'transition-transform'
            }
          >
            <MarcadorPin numero={i + 1} color={p.verificada ? 'primario' : 'alerta'} />
          </div>
        </Marker>
      ))}
    </Mapa>
  )
}

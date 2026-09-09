import 'maplibre-gl/dist/maplibre-gl.css'
import { AREA_BARRANQUILLA } from '@lh/shared'
import { setWorkerUrl } from 'maplibre-gl'
// MapLibre 6 resuelve su web worker relativo al bundle donde queda empaquetado, ruta que no existe
// con Vite (ni en desarrollo ni en producción). Vite empaqueta el worker y entrega su URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { ReactNode } from 'react'
import MapaGL, { type MapProps, type MapRef, NavigationControl } from 'react-map-gl/maplibre'

setWorkerUrl(workerUrl)

/** Estilo de teselas vectoriales de OpenFreeMap (gratuito, sin clave, datos de OpenStreetMap). */
export const ESTILO_MAPA = 'https://tiles.openfreemap.org/styles/liberty'

interface Props extends Omit<MapProps, 'mapStyle' | 'initialViewState'> {
  ref?: React.Ref<MapRef>
  children?: ReactNode
  className?: string
  initialViewState?: MapProps['initialViewState']
}

/** Mapa base centrado en Barranquilla. Los hijos (marcadores, capas) se pasan como children. */
export function Mapa({ children, className, initialViewState, ...props }: Props) {
  return (
    <div className={className ?? 'h-96 w-full overflow-hidden rounded-md border'}>
      <MapaGL
        mapStyle={ESTILO_MAPA}
        initialViewState={
          initialViewState ?? {
            latitude: AREA_BARRANQUILLA.centro.latitud,
            longitude: AREA_BARRANQUILLA.centro.longitud,
            zoom: AREA_BARRANQUILLA.zoomInicial,
          }
        }
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
        {...props}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {children}
      </MapaGL>
    </div>
  )
}

export type { MapRef } from 'react-map-gl/maplibre'
export { Layer, Marker, Popup, Source } from 'react-map-gl/maplibre'

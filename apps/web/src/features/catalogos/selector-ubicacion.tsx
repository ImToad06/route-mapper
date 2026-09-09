import { AREA_BARRANQUILLA, type CandidatoGeocodificacion, type Coordenadas } from '@lh/shared'
import { Crosshair, LocateFixed, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Mapa, type MapRef, Marker } from '@/components/mapa/mapa'
import { MarcadorPin } from '@/components/mapa/marcador-pin'
import { Button } from '@/components/ui/button'
import { mensajeDeError } from '@/lib/api'
import { geocodificar } from './api'

interface Props {
  direccion: string
  valor: Coordenadas | null
  verificada: boolean
  alCambiar: (c: Coordenadas, verificada: boolean) => void
}

/**
 * Ubicación de un destino: busca candidatos por dirección y exige que el coordinador confirme
 * o arrastre el marcador. Las direcciones de Barranquilla se geocodifican mal con frecuencia.
 */
export function SelectorUbicacion({ direccion, valor, verificada, alCambiar }: Props) {
  const mapa = useRef<MapRef>(null)
  const [candidatos, setCandidatos] = useState<CandidatoGeocodificacion[]>([])
  const [buscando, setBuscando] = useState(false)

  const centrar = (c: Coordenadas, zoom = 16) =>
    mapa.current?.flyTo({ center: [c.longitud, c.latitud], zoom, duration: 600 })

  async function buscar() {
    if (direccion.trim().length < 5) return toast.error('Escriba primero la dirección.')
    setBuscando(true)
    try {
      const { candidatos } = await geocodificar(direccion)
      setCandidatos(candidatos)
      if (candidatos.length === 0)
        toast.warning('No se encontró la dirección. Ubique el punto en el mapa manualmente.')
      else {
        const [primero] = candidatos
        if (primero) {
          alCambiar({ latitud: primero.latitud, longitud: primero.longitud }, false)
          centrar(primero)
        }
      }
    } catch (e) {
      toast.error(mensajeDeError(e))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" onClick={buscar} disabled={buscando}>
          <Search className="size-4" aria-hidden="true" />{' '}
          {buscando ? 'Buscando…' : 'Buscar dirección en el mapa'}
        </Button>
        {valor && !verificada && (
          <Button type="button" onClick={() => alCambiar(valor, true)}>
            <LocateFixed className="size-4" aria-hidden="true" /> Confirmar ubicación
          </Button>
        )}
        {valor && verificada && (
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            Ubicación confirmada
          </span>
        )}
      </div>
      {candidatos.length > 1 && (
        <ul className="grid gap-1 text-sm">
          {candidatos.map((c) => (
            <li key={`${c.latitud},${c.longitud}`}>
              <button
                type="button"
                className="w-full rounded border px-2 py-1 text-left hover:bg-accent"
                onClick={() => {
                  alCambiar({ latitud: c.latitud, longitud: c.longitud }, false)
                  centrar(c)
                }}
              >
                {c.etiqueta}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Mapa
        ref={mapa}
        className="h-72 w-full overflow-hidden rounded-md border"
        initialViewState={
          valor
            ? { latitude: valor.latitud, longitude: valor.longitud, zoom: 16 }
            : {
                latitude: AREA_BARRANQUILLA.centro.latitud,
                longitude: AREA_BARRANQUILLA.centro.longitud,
                zoom: AREA_BARRANQUILLA.zoomInicial,
              }
        }
        onClick={(e) => alCambiar({ latitud: e.lngLat.lat, longitud: e.lngLat.lng }, true)}
        cursor="crosshair"
      >
        {valor && (
          <Marker
            latitude={valor.latitud}
            longitude={valor.longitud}
            anchor="bottom"
            draggable
            onDragEnd={(e) => alCambiar({ latitud: e.lngLat.lat, longitud: e.lngLat.lng }, true)}
          >
            <MarcadorPin color={verificada ? 'primario' : 'alerta'} />
          </Marker>
        )}
      </Mapa>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Crosshair className="size-3" aria-hidden="true" />
        Haga clic en el mapa o arrastre el marcador para fijar la ubicación exacta.
        {valor && (
          <span className="ml-auto tabular-nums">
            {valor.latitud.toFixed(5)}, {valor.longitud.toFixed(5)}
          </span>
        )}
      </p>
    </div>
  )
}

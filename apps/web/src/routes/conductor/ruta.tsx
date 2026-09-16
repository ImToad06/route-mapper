import {
  ETIQUETAS_ESTADO_PARADA,
  ETIQUETAS_TIPO_NOVEDAD,
  TIPOS_NOVEDAD,
  type TipoNovedad,
} from '@lh/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Navigation } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  bodegaQuery,
  claveRutas,
  entregarParada,
  fallarParada,
  finalizarRuta,
  iniciarRuta,
  misRutasQuery,
  rutaQuery,
} from '@/features/rutas/api'
import { MapaRuta } from '@/features/rutas/mapa-ruta'
import { mensajeDeError } from '@/lib/api'
import { formatearFechaLarga, formatearKg } from '@/lib/formato'

export const Route = createFileRoute('/conductor/ruta')({
  validateSearch: z.object({ id: z.coerce.number().int().positive().optional() }),
  component: MiRuta,
})

const enlaceWaze = (lat: number, lon: number) => `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`
const enlaceGoogleMaps = (lat: number, lon: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`

function MiRuta() {
  const { id } = Route.useSearch()
  const queryClient = useQueryClient()
  const { data: rutas, isPending: cargandoLista } = useQuery(misRutasQuery)
  // "en_curso" y "asignada" son las únicas rutas que "Mi ruta" puede mostrar. Un conductor puede
  // tener más de una activa a la vez (RF-16 solo impide dos el mismo día): si hay varias y no se
  // pidió una en particular, se deja elegir en vez de abrir la primera al azar.
  const activas = (rutas ?? []).filter((r) => r.estado === 'en_curso' || r.estado === 'asignada')
  const activa = id != null ? activas.find((r) => r.id === id) : (activas[0] ?? undefined)
  const mostrarSelector = id == null && activas.length > 1
  const { data: ruta, isPending: cargandoDetalle } = useQuery({
    ...rutaQuery(activa?.id ?? 0),
    enabled: activa !== undefined && !mostrarSelector,
  })
  const bodega = useQuery(bodegaQuery)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [novedadDe, setNovedadDe] = useState<number | null>(null)
  const [tipoNovedad, setTipoNovedad] = useState<TipoNovedad>('cliente_ausente')
  const [notaNovedad, setNotaNovedad] = useState('')

  const invalidar = () => queryClient.invalidateQueries({ queryKey: claveRutas })

  async function ejecutar(
    etiqueta: string,
    accion: () => Promise<{ error: unknown }>,
    exito: string,
  ) {
    setOcupado(etiqueta)
    try {
      const { error } = await accion()
      if (error) return toast.error(mensajeDeError(error))
      toast.success(exito)
      await invalidar()
    } finally {
      setOcupado(null)
    }
  }

  const iniciar = () =>
    activa && ejecutar('iniciar', () => iniciarRuta(activa.id), 'Ruta iniciada.')
  const finalizar = () =>
    activa && ejecutar('finalizar', () => finalizarRuta(activa.id), 'Ruta finalizada.')
  const entregar = (paradaId: number) =>
    activa &&
    ejecutar(`entregar-${paradaId}`, () => entregarParada(activa.id, paradaId), 'Parada entregada.')
  async function confirmarNovedad(paradaId: number) {
    if (!activa) return
    await ejecutar(
      `fallar-${paradaId}`,
      () =>
        fallarParada(activa.id, paradaId, { tipo: tipoNovedad, nota: notaNovedad || undefined }),
      'Novedad registrada.',
    )
    setNovedadDe(null)
    setNotaNovedad('')
  }

  if (cargandoLista || (activa && !mostrarSelector && cargandoDetalle)) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>
  }

  if (mostrarSelector) {
    return (
      <div className="grid gap-3">
        <h1 className="text-xl font-semibold">Elija una ruta</h1>
        {activas.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="font-mono">{r.codigo}</CardTitle>
              <CardDescription className="capitalize">
                {formatearFechaLarga(r.fecha)} ·{' '}
                {r.estado === 'en_curso' ? 'en curso' : 'asignada, por iniciar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/conductor/ruta" search={{ id: r.id }}>
                  Ver esta ruta
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!activa || !ruta) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No tiene una ruta en curso</CardTitle>
          <CardDescription>Si tiene una ruta pendiente de aceptar, revise Inicio.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const pendientes = ruta.paradas.filter((p) => p.estadoEntrega === 'pendiente')
  const resueltas = ruta.paradas.length - pendientes.length
  const siguiente = pendientes[0]
  const progreso = ruta.paradas.length > 0 ? (resueltas / ruta.paradas.length) * 100 : 0

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-mono text-xl font-semibold">{ruta.codigo}</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {formatearFechaLarga(ruta.fecha)}
        </p>
      </div>

      {ruta.estado === 'en_curso' && (
        <MapaRuta
          bodega={bodega.data ?? null}
          paradas={ruta.paradas.map((p) => ({
            id: p.id,
            nombre: p.destino.nombreCliente,
            punto: { latitud: p.destino.latitud, longitud: p.destino.longitud },
            verificada: p.estadoEntrega !== 'pendiente',
          }))}
          geometria={ruta.geometria ?? null}
          resaltada={siguiente?.id ?? null}
          className="h-[40dvh] w-full overflow-hidden rounded-md border"
        />
      )}

      <Card>
        <CardContent className="grid gap-2 pt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              {resueltas} de {ruta.paradas.length} parada(s) resueltas
            </span>
            <span className="text-muted-foreground">{formatearKg(ruta.cargaKg)}</span>
          </div>
          <Progress value={progreso} aria-label="Progreso de la ruta" />
          {ruta.estado === 'asignada' && (
            <Button onClick={iniciar} disabled={ocupado !== null}>
              {ocupado === 'iniciar' ? 'Iniciando…' : 'Iniciar ruta'}
            </Button>
          )}
          {ruta.estado === 'en_curso' && (
            <>
              <Button onClick={finalizar} disabled={ocupado !== null || pendientes.length > 0}>
                {ocupado === 'finalizar' ? 'Finalizando…' : 'Finalizar ruta'}
              </Button>
              {pendientes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Registre todas las paradas para poder finalizar.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {ruta.paradas.map((p, i) => (
          <Card key={p.id} className={siguiente?.id === p.id ? 'border-primary' : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {i + 1}. {p.destino.nombreCliente}
                {siguiente?.id === p.id && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                    Siguiente
                  </span>
                )}
              </CardTitle>
              <CardDescription>{p.destino.direccion}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <ul className="text-sm text-muted-foreground">
                {p.productos.map((x) => (
                  <li key={x.productoId}>
                    {x.descripcion} × {x.cantidad}
                  </li>
                ))}
              </ul>

              {p.estadoEntrega !== 'pendiente' ? (
                <p className="text-sm font-medium">
                  {ETIQUETAS_ESTADO_PARADA[p.estadoEntrega]}
                  {p.novedadTipo && ` — ${ETIQUETAS_TIPO_NOVEDAD[p.novedadTipo]}`}
                  {p.novedadNota && `: ${p.novedadNota}`}
                </p>
              ) : ruta.estado === 'en_curso' ? (
                novedadDe === p.id ? (
                  <div className="grid gap-2">
                    <Select
                      value={tipoNovedad}
                      onValueChange={(v) => setTipoNovedad(v as TipoNovedad)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_NOVEDAD.map((t) => (
                          <SelectItem key={t} value={t}>
                            {ETIQUETAS_TIPO_NOVEDAD[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Nota (opcional)"
                      value={notaNovedad}
                      onChange={(e) => setNotaNovedad(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNovedadDe(null)
                          setNotaNovedad('')
                        }}
                        disabled={ocupado !== null}
                      >
                        Volver
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => confirmarNovedad(p.id)}
                        disabled={ocupado !== null}
                      >
                        Confirmar novedad
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={enlaceWaze(p.destino.latitud, p.destino.longitud)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="size-4" aria-hidden="true" /> Waze
                        </a>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={enlaceGoogleMaps(p.destino.latitud, p.destino.longitud)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="size-4" aria-hidden="true" /> Maps
                        </a>
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => entregar(p.id)} disabled={ocupado !== null}>
                        {ocupado === `entregar-${p.id}` ? 'Guardando…' : 'Entregado'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setNovedadDe(p.id)}
                        disabled={ocupado !== null}
                      >
                        Novedad
                      </Button>
                    </div>
                  </>
                )
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

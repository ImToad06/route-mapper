import { ESTADOS_RUTA_EDITABLES, ESTADOS_RUTA_TERMINALES } from '@lh/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Route as RouteIcon,
  Save,
  Sparkles,
  Undo2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { productosActivosQuery, vehiculosActivosQuery } from '@/features/catalogos/api'
import {
  actualizarRuta,
  bodegaQuery,
  calcularRecorrido,
  cancelarRuta,
  claveRutas,
  guardarParadas,
  motorRutasQuery,
  optimizarRuta,
  planificarRuta,
  type RutaDetalle,
  rutaQuery,
  volverABorrador,
} from '@/features/rutas/api'
import { EditorParadas, type ParadaEditable } from '@/features/rutas/editor-paradas'
import { EstadoRutaBadge } from '@/features/rutas/estado-ruta'
import { MapaRuta } from '@/features/rutas/mapa-ruta'
import { mensajeDeError } from '@/lib/api'
import { aFechaIso, formatearDistancia, formatearDuracion, formatearKg } from '@/lib/formato'

export const Route = createFileRoute('/panel/rutas/$rutaId')({ component: EditorRuta })

const SIN_VEHICULO = 'ninguno'

const aEditables = (r: RutaDetalle): ParadaEditable[] =>
  r.paradas.map((p) => ({
    id: p.id,
    destinoId: p.destino.id,
    nombre: p.destino.nombreCliente,
    direccion: p.destino.direccion,
    zona: p.destino.zona,
    horarioAtencion: p.destino.horarioAtencion,
    latitud: p.destino.latitud,
    longitud: p.destino.longitud,
    verificada: p.destino.ubicacionVerificada,
    productos: p.productos.map((x) => ({ productoId: x.productoId, cantidad: x.cantidad })),
    etaS: p.etaS,
    distanciaDesdeAnteriorM: p.distanciaDesdeAnteriorM,
    estadoEntrega: p.estadoEntrega,
  }))

const firma = (p: ParadaEditable[]) =>
  JSON.stringify(p.map((x) => [x.destinoId, x.productos.map((l) => [l.productoId, l.cantidad])]))

function EditorRuta() {
  const { rutaId } = Route.useParams()
  const id = Number(rutaId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: ruta, error, isPending } = useQuery(rutaQuery(id))
  const bodega = useQuery(bodegaQuery)
  const motor = useQuery(motorRutasQuery)
  const vehiculos = useQuery(vehiculosActivosQuery)
  const productos = useQuery(productosActivosQuery)
  const [paradas, setParadas] = useState<ParadaEditable[]>([])
  const [base, setBase] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [resaltada, setResaltada] = useState<number | null>(null)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const [fechaLocal, setFechaLocal] = useState('')

  // Al cargar o recargar la ruta se toma la lista del servidor como base de edición, salvo que el
  // usuario tenga cambios sin guardar (p. ej. tras cambiar el vehículo): entonces se conserva su borrador.
  const baseRef = useRef('')
  useEffect(() => {
    if (!ruta) return
    const editables = aEditables(ruta)
    const nuevaBase = firma(editables)
    setParadas((previas) =>
      firma(previas) === baseRef.current || previas.length === 0 ? editables : previas,
    )
    baseRef.current = nuevaBase
    setBase(nuevaBase)
    setFechaLocal(aFechaIso(ruta.fecha))
  }, [ruta])

  const invalidar = () => queryClient.invalidateQueries({ queryKey: claveRutas })
  const sinGuardarRef = useRef(false)
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (sinGuardarRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [])
  const editable = ruta ? ESTADOS_RUTA_EDITABLES.includes(ruta.estado) : false
  const sinGuardar = firma(paradas) !== base
  sinGuardarRef.current = sinGuardar
  const pesoDe = (productoId: number) =>
    productos.data?.find((x) => x.id === productoId)?.pesoKg ?? 0
  const cargaLocal = paradas.reduce(
    (acc, p) => acc + p.productos.reduce((a, l) => a + l.cantidad * pesoDe(l.productoId), 0),
    0,
  )

  async function ejecutar(
    etiqueta: string,
    accion: () => Promise<{ error: unknown; data: unknown }>,
    exito: string,
  ) {
    setOcupado(etiqueta)
    try {
      const { error, data } = await accion()
      if (error) return toast.error(mensajeDeError(error))
      toast.success(exito)
      await invalidar()
      return data
    } finally {
      setOcupado(null)
    }
  }

  const guardar = () =>
    ejecutar(
      'guardar',
      () =>
        guardarParadas(id, {
          paradas: paradas.map((p) => ({
            destinoId: p.destinoId,
            productos: p.productos.filter((l) => l.cantidad > 0),
          })),
        }),
      'Paradas guardadas.',
    )
  const calcular = () => ejecutar('calcular', () => calcularRecorrido(id), 'Recorrido calculado.')
  const optimizar = async () => {
    const r = (await ejecutar('optimizar', () => optimizarRuta(id), 'Orden optimizado.')) as
      | { noAsignadas: { destino: string }[] }
      | undefined
    if (r?.noAsignadas.length)
      toast.warning(
        `${r.noAsignadas.length} parada(s) no caben por capacidad u horario y quedaron al final: ${r.noAsignadas.map((x) => x.destino).join(', ')}.`,
        { duration: 10_000 },
      )
  }
  const planificar = () =>
    ejecutar(
      'planificar',
      () => planificarRuta(id),
      'Ruta planificada. Ya puede asignarla a un conductor.',
    )
  const borrador = () =>
    ejecutar('borrador', () => volverABorrador(id), 'La ruta volvió a borrador.')
  const cancelar = async () => {
    setConfirmarCancelar(false)
    const ok = await ejecutar('cancelar', () => cancelarRuta(id), 'Ruta cancelada.')
    if (ok) await navigate({ to: '/panel/rutas' })
  }
  const cambiarVehiculo = (v: string) =>
    ejecutar(
      'vehiculo',
      () => actualizarRuta(id, { vehiculoId: v === SIN_VEHICULO ? null : Number(v) }),
      'Vehículo actualizado.',
    )
  const cambiarFecha = (fecha: string) =>
    fecha &&
    (!ruta || fecha !== aFechaIso(ruta.fecha)) &&
    ejecutar('fecha', () => actualizarRuta(id, { fecha }), 'Fecha actualizada.')

  if (isPending) return <p className="text-muted-foreground">Cargando ruta…</p>
  if (error || !ruta) return <p className="text-destructive">{mensajeDeError(error)}</p>

  const capacidad = ruta.vehiculo?.capacidadKg ?? null
  const porcentaje = capacidad ? Math.min(100, (cargaLocal / capacidad) * 100) : 0
  const excede = capacidad !== null && cargaLocal > capacidad

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/panel/rutas" aria-label="Volver a rutas">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="font-mono text-2xl font-semibold">{ruta.codigo}</h1>
        <EstadoRutaBadge estado={ruta.estado} />
        {sinGuardar && <span className="text-sm text-amber-700">Cambios sin guardar</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          {editable && (
            <>
              <Button onClick={guardar} disabled={!sinGuardar || ocupado !== null}>
                <Save className="size-4" aria-hidden="true" />{' '}
                {ocupado === 'guardar' ? 'Guardando…' : 'Guardar paradas'}
              </Button>
              <Button
                variant="secondary"
                onClick={calcular}
                disabled={
                  sinGuardar ||
                  paradas.length === 0 ||
                  ocupado !== null ||
                  motor.data?.disponible === false
                }
                title={
                  motor.data?.disponible === false
                    ? 'El motor de rutas no está configurado'
                    : undefined
                }
              >
                <RouteIcon className="size-4" aria-hidden="true" />{' '}
                {ocupado === 'calcular' ? 'Calculando…' : 'Calcular recorrido'}
              </Button>
              <Button
                variant="secondary"
                onClick={optimizar}
                disabled={
                  sinGuardar ||
                  paradas.length < 2 ||
                  ocupado !== null ||
                  motor.data?.disponible === false
                }
              >
                <Sparkles className="size-4" aria-hidden="true" />{' '}
                {ocupado === 'optimizar' ? 'Optimizando…' : 'Optimizar orden'}
              </Button>
              <Button
                variant="default"
                onClick={planificar}
                disabled={sinGuardar || paradas.length === 0 || ocupado !== null}
              >
                {ocupado === 'planificar' ? 'Validando…' : 'Marcar como planificada'}
              </Button>
            </>
          )}
          {ruta.estado === 'planificada' && (
            <Button variant="secondary" onClick={borrador} disabled={ocupado !== null}>
              <Undo2 className="size-4" aria-hidden="true" /> Volver a borrador
            </Button>
          )}
          {!ESTADOS_RUTA_TERMINALES.includes(ruta.estado) && (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setConfirmarCancelar(true)}
              disabled={ocupado !== null}
            >
              <Ban className="size-4" aria-hidden="true" /> Cancelar ruta
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-4">
          <div className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="fecha"
                  type="date"
                  value={fechaLocal}
                  disabled={!editable}
                  onChange={(e) => setFechaLocal(e.target.value)}
                  onBlur={() => cambiarFecha(fechaLocal)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="vehiculo">Vehículo</Label>
              <Select
                value={ruta.vehiculo ? String(ruta.vehiculo.id) : SIN_VEHICULO}
                onValueChange={cambiarVehiculo}
                disabled={!editable}
              >
                <SelectTrigger id="vehiculo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SIN_VEHICULO}>Sin vehículo</SelectItem>
                  {vehiculos.data?.datos.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.placa} · {v.tipo} · {formatearKg(v.capacidadKg)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <div className="flex items-baseline justify-between text-sm">
                <span>
                  Carga:{' '}
                  <strong className={excede ? 'text-destructive' : ''}>
                    {formatearKg(cargaLocal)}
                  </strong>
                  {capacidad !== null && (
                    <span className="text-muted-foreground"> de {formatearKg(capacidad)}</span>
                  )}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {paradas.length} paradas · {formatearDistancia(ruta.distanciaM)} ·{' '}
                  {formatearDuracion(ruta.duracionS)}
                </span>
              </div>
              {capacidad !== null && (
                <Progress
                  value={porcentaje}
                  className={excede ? '[&>div]:bg-destructive' : ''}
                  aria-label="Uso de la capacidad del vehículo"
                />
              )}
              {excede && (
                <p className="text-sm text-destructive">
                  La carga supera la capacidad del vehículo (RF-14). Quite productos o elija otro
                  vehículo.
                </p>
              )}
              {ruta.distanciaM == null && paradas.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Guarde las paradas y pulse "Calcular recorrido" u "Optimizar orden" para ver
                  distancias y tiempos.
                </p>
              )}
            </div>
          </div>
          <EditorParadas
            paradas={paradas}
            alCambiar={setParadas}
            soloLectura={!editable}
            alResaltar={setResaltada}
          />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <MapaRuta
            bodega={bodega.data ?? null}
            paradas={paradas.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              punto: { latitud: p.latitud, longitud: p.longitud },
              verificada: p.verificada,
            }))}
            geometria={sinGuardar ? null : (ruta.geometria ?? null)}
            resaltada={resaltada}
            className="h-[70dvh] w-full overflow-hidden rounded-md border"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Cuadrado: bodega (inicio y fin). Números: orden de visita. La línea aparece al calcular
            u optimizar el recorrido.
          </p>
        </div>
      </div>

      <AlertDialog open={confirmarCancelar} onOpenChange={setConfirmarCancelar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la ruta {ruta.codigo}?</AlertDialogTitle>
            <AlertDialogDescription>
              La ruta quedará cancelada y no podrá reactivarse. Las paradas y productos se conservan
              para consulta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelar}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Cancelar ruta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

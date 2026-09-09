import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { destinosMapaQuery, productosActivosQuery } from '@/features/catalogos/api'
import { formatearDistancia, formatearDuracion, formatearKg } from '@/lib/formato'
import { cn } from '@/lib/utils'

export interface LineaProducto {
  productoId: number
  cantidad: number
}
export interface ParadaEditable {
  /** id de parada en la base de datos (si ya existe) o negativo para nuevas. */
  id: number
  destinoId: number
  nombre: string
  direccion: string
  zona: string
  horarioAtencion: string | null
  latitud: number
  longitud: number
  verificada: boolean
  productos: LineaProducto[]
  etaS?: number | null
  distanciaDesdeAnteriorM?: number | null
  estadoEntrega?: string
}

interface Props {
  paradas: ParadaEditable[]
  alCambiar: (paradas: ParadaEditable[]) => void
  soloLectura: boolean
  alResaltar?: (id: number | null) => void
}

export function EditorParadas({ paradas, alCambiar, soloLectura, alResaltar }: Props) {
  const productos = useQuery(productosActivosQuery)
  const catalogo = productos.data ?? []
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function alSoltar(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const de = paradas.findIndex((p) => p.id === active.id)
    const a = paradas.findIndex((p) => p.id === over.id)
    alCambiar(arrayMove(paradas, de, a))
  }
  const actualizar = (id: number, cambios: Partial<ParadaEditable>) =>
    alCambiar(paradas.map((p) => (p.id === id ? { ...p, ...cambios } : p)))

  return (
    <div className="grid gap-3">
      {!soloLectura && (
        <SelectorDestino
          excluidos={paradas.map((p) => p.destinoId)}
          alAgregar={(d) => alCambiar([...paradas, d])}
        />
      )}
      {paradas.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          La ruta no tiene paradas. Agregue destinos con el buscador.
        </p>
      )}
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
        <SortableContext items={paradas.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <ol className="grid gap-2">
            {paradas.map((p, i) => (
              <Parada
                key={p.id}
                parada={p}
                numero={i + 1}
                soloLectura={soloLectura}
                catalogo={catalogo}
                alCambiar={(c) => actualizar(p.id, c)}
                alQuitar={() => alCambiar(paradas.filter((x) => x.id !== p.id))}
                alResaltar={alResaltar}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function Parada({
  parada,
  numero,
  soloLectura,
  catalogo,
  alCambiar,
  alQuitar,
  alResaltar,
}: {
  parada: ParadaEditable
  numero: number
  soloLectura: boolean
  catalogo: {
    id: number
    codigo: string
    descripcion: string
    pesoKg: number
    unidadMedida: string
  }[]
  alCambiar: (c: Partial<ParadaEditable>) => void
  alQuitar: () => void
  alResaltar?: (id: number | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: parada.id,
    disabled: soloLectura,
  })
  const pesoDe = (id: number) => catalogo.find((c) => c.id === id)?.pesoKg ?? 0
  const carga = parada.productos.reduce((acc, l) => acc + pesoDe(l.productoId) * l.cantidad, 0)
  const disponibles = catalogo.filter((c) => !parada.productos.some((l) => l.productoId === c.id))

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-md border bg-card p-3', isDragging && 'opacity-70 shadow-lg')}
      onMouseEnter={() => alResaltar?.(parada.id)}
      onMouseLeave={() => alResaltar?.(null)}
    >
      <div className="flex items-start gap-2">
        {!soloLectura && (
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground"
            aria-label={`Mover parada ${numero}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-5" />
          </button>
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
          {numero}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-medium">{parada.nombre}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {parada.etaS != null && `Llegada +${formatearDuracion(parada.etaS)}`}
              {parada.distanciaDesdeAnteriorM != null &&
                ` · ${formatearDistancia(parada.distanciaDesdeAnteriorM)}`}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {parada.direccion} · {parada.zona}
            {parada.horarioAtencion && ` · ${parada.horarioAtencion}`}
            {!parada.verificada && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                Ubicación por verificar
              </span>
            )}
          </div>
          <ul className="mt-2 grid gap-1">
            {parada.productos.map((l) => {
              const prod = catalogo.find((c) => c.id === l.productoId)
              return (
                <li key={l.productoId} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono text-xs text-muted-foreground">{prod?.codigo}</span>{' '}
                    {prod?.descripcion ?? `Producto ${l.productoId}`}
                  </span>
                  {soloLectura ? (
                    <span className="tabular-nums">× {l.cantidad}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0.01}
                      step="1"
                      inputMode="decimal"
                      className="h-8 w-24 text-right"
                      aria-label={`Cantidad de ${prod?.descripcion ?? 'producto'}`}
                      value={l.cantidad}
                      onChange={(e) =>
                        alCambiar({
                          productos: parada.productos.map((x) =>
                            x.productoId === l.productoId
                              ? { ...x, cantidad: Number(e.target.value) }
                              : x,
                          ),
                        })
                      }
                    />
                  )}
                  <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">
                    {formatearKg(pesoDe(l.productoId) * l.cantidad)}
                  </span>
                  {!soloLectura && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="Quitar producto"
                      onClick={() =>
                        alCambiar({
                          productos: parada.productos.filter((x) => x.productoId !== l.productoId),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!soloLectura && disponibles.length > 0 && (
              <Select
                onValueChange={(v) =>
                  alCambiar({
                    productos: [...parada.productos, { productoId: Number(v), cantidad: 1 }],
                  })
                }
                value=""
              >
                <SelectTrigger
                  className="h-8 w-56"
                  aria-label={`Agregar producto a la parada ${numero}`}
                >
                  <SelectValue placeholder="Agregar producto…" />
                </SelectTrigger>
                <SelectContent>
                  {disponibles.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.codigo} · {c.descripcion} ({formatearKg(c.pesoKg)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="ml-auto text-sm tabular-nums">
              Parada: <strong>{formatearKg(carga)}</strong>
            </span>
            {!soloLectura && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={alQuitar}>
                <Trash2 className="size-4" aria-hidden="true" /> Quitar
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

let idTemporal = -1

function SelectorDestino({
  excluidos,
  alAgregar,
}: {
  excluidos: number[]
  alAgregar: (p: ParadaEditable) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const destinos = useQuery(destinosMapaQuery())
  const opciones = (destinos.data ?? []).filter((d) => !excluidos.includes(d.id))
  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Plus className="size-4" aria-hidden="true" /> Agregar parada (buscar destino)
          </span>
          <ChevronsUpDown className="size-4 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cliente, dirección o zona…" />
          <CommandList>
            <CommandEmpty>
              {destinos.isPending ? 'Cargando destinos…' : 'No hay destinos que coincidan.'}
            </CommandEmpty>
            <CommandGroup>
              {opciones.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`${d.nombreCliente} ${d.direccion} ${d.zona}`}
                  onSelect={() => {
                    alAgregar({
                      id: idTemporal--,
                      destinoId: d.id,
                      nombre: d.nombreCliente,
                      direccion: d.direccion,
                      zona: d.zona,
                      horarioAtencion: d.horarioAtencion,
                      latitud: d.latitud,
                      longitud: d.longitud,
                      verificada: d.ubicacionVerificada,
                      productos: [],
                    })
                    setAbierto(false)
                  }}
                >
                  <Check className="size-4 opacity-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="truncate">{d.nombreCliente}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {d.direccion} · {d.zona}
                      {!d.ubicacionVerificada && ' · por verificar'}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

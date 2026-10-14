import { zodResolver } from '@hookform/resolvers/zod'
import {
  type CrearRutaInput,
  crearRutaSchema,
  ESTADOS_RUTA,
  type EstadoRuta,
  ETIQUETAS_ESTADO_RUTA,
} from '@lh/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { CampoSelect, CampoTexto } from '@/components/catalogo/campos-formulario'
import { BarraBusqueda, FilaEstado, Paginador } from '@/components/catalogo/controles-lista'
import { DialogoFormulario } from '@/components/catalogo/dialogo-formulario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { vehiculosActivosQuery } from '@/features/catalogos/api'
import { crearRuta, rutasQuery } from '@/features/rutas/api'
import { EstadoRutaBadge } from '@/features/rutas/estado-ruta'
import { mensajeDeError } from '@/lib/api'
import { formatearDistancia, formatearFechaLarga, formatearKg, hoyIso } from '@/lib/formato'
import { useLista } from '@/lib/use-lista'

export const Route = createFileRoute('/panel/rutas/')({ component: Rutas })

const TODOS = 'todos'
const SIN_VEHICULO = 'ninguno'

function Rutas() {
  const lista = useLista()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoRuta | typeof TODOS>(TODOS)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [nueva, setNueva] = useState(false)
  const vehiculos = useQuery(vehiculosActivosQuery)
  const filtros = {
    pagina: lista.pagina,
    porPagina: 20,
    buscar: lista.filtros.buscar,
    estado: estado === TODOS ? undefined : estado,
    desde: desde || undefined,
    hasta: hasta || undefined,
  }
  const { data, isPending, error } = useQuery({
    ...rutasQuery(filtros),
    placeholderData: keepPreviousData,
  })
  const form = useForm<z.input<typeof crearRutaSchema>, unknown, CrearRutaInput>({
    resolver: zodResolver(crearRutaSchema),
    defaultValues: { fecha: hoyIso(), vehiculoId: null, observaciones: '' },
  })

  async function crear(datos: CrearRutaInput) {
    const { data, error } = await crearRuta(datos)
    if (error || !data) return toast.error(mensajeDeError(error))
    toast.success(`Ruta ${data.codigo} creada. Agregue las paradas.`)
    setNueva(false)
    await navigate({ to: '/panel/rutas/$rutaId', params: { rutaId: String(data.id) } })
  }

  return (
    <div className="grid gap-6 p-2">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary px-3 py-1 rounded-full bg-secondary/10 mb-2 inline-block">
            Módulo de Planificación • VRP
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Planificador y Optimización de Rutas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sustitución de planillas físicas, cubicaje automatizado y secuenciación de despachos.
          </p>
        </div>
        <Button
          onClick={() => setNueva(true)}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm rounded-xl px-5 py-2.5 font-semibold"
        >
          <Plus className="size-4 mr-1.5" aria-hidden="true" /> Nueva ruta VRP
        </Button>
      </div>

      <div className="bg-muted/40 p-4 rounded-2xl border border-border/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
            <div className="size-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">1. Zona y Vehículo</p>
              <p className="text-[11px] text-secondary font-medium">Asignación técnica</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm">
            <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">2. Selección de Pedidos</p>
              <p className="text-[11px] text-muted-foreground font-medium">Cubicaje &amp; Carga</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm opacity-80">
            <div className="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">3. Secuenciación Lógica</p>
              <p className="text-[11px] text-muted-foreground font-medium">
                Ventanas horarias &amp; TSP
              </p>
            </div>
          </div>
        </div>

        <BarraBusqueda
          valor={lista.buscar}
          alCambiar={lista.setBuscar}
          placeholder="Buscar por código u observaciones"
        >
          <Select
            value={estado}
            onValueChange={(v) => {
              setEstado(v as EstadoRuta | typeof TODOS)
              lista.setPagina(1)
            }}
          >
            <SelectTrigger className="w-52 h-10 rounded-xl bg-card" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los estados</SelectItem>
              {ESTADOS_RUTA.map((e) => (
                <SelectItem key={e} value={e}>
                  {ETIQUETAS_ESTADO_RUTA[e]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-40 h-10 rounded-xl bg-card"
            aria-label="Desde"
          />
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-40 h-10 rounded-xl bg-card"
            aria-label="Hasta"
          />
        </BarraBusqueda>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold">Código Manifiesto</TableHead>
              <TableHead className="font-bold">Fecha</TableHead>
              <TableHead className="font-bold">Estado</TableHead>
              <TableHead className="text-right font-bold">Paradas</TableHead>
              <TableHead className="text-right font-bold">Carga (kg)</TableHead>
              <TableHead className="font-bold">Vehículo</TableHead>
              <TableHead className="font-bold">Conductor</TableHead>
              <TableHead className="text-right font-bold">Distancia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && <FilaEstado colSpan={8}>Cargando rutas VRP...</FilaEstado>}
            {error && (
              <FilaEstado colSpan={8} tono="error">
                {mensajeDeError(error)}
              </FilaEstado>
            )}
            {data?.datos.length === 0 && (
              <FilaEstado colSpan={8}>
                No hay rutas programadas. Cree la primera con "Nueva ruta VRP".
              </FilaEstado>
            )}
            {data?.datos.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <Link
                    to="/panel/rutas/$rutaId"
                    params={{ rutaId: String(r.id) }}
                    className="font-mono font-bold text-secondary underline-offset-2 hover:underline"
                  >
                    {r.codigo}
                  </Link>
                </TableCell>
                <TableCell className="capitalize font-medium">
                  {formatearFechaLarga(r.fecha)}
                </TableCell>
                <TableCell>
                  <EstadoRutaBadge estado={r.estado} />
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {r.totalParadas}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums font-semibold ${r.vehiculo && r.cargaKg > r.vehiculo.capacidadKg ? 'text-destructive' : 'text-foreground'}`}
                >
                  {formatearKg(r.cargaKg)}
                </TableCell>
                <TableCell>
                  {r.vehiculo ? (
                    <span className="font-mono font-medium bg-muted/60 px-2.5 py-1 rounded-lg">
                      {r.vehiculo.placa}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {r.conductor?.nombre ?? (
                    <span className="text-muted-foreground italic">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums font-mono font-medium">
                  {formatearDistancia(r.distanciaM)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data && (
        <Paginador
          pagina={data.pagina}
          totalPaginas={data.totalPaginas}
          total={data.total}
          sustantivo="rutas"
          alCambiar={lista.setPagina}
        />
      )}

      <DialogoFormulario
        abierto={nueva}
        alCerrar={() => setNueva(false)}
        titulo="Crear Nueva Ruta y Manifiesto"
        descripcion="Asigne la unidad y los parámetros operativos VRP iniciales."
        form={form}
        onSubmit={crear}
        textoGuardar="Crear y configurar paradas"
      >
        <CampoTexto
          control={form.control}
          name="fecha"
          etiqueta="Fecha de la ruta"
          tipo="text"
          placeholder="AAAA-MM-DD"
        />
        <CampoSelect
          control={form.control}
          name="vehiculoId"
          etiqueta="Vehículo de Carga"
          valorNulo={SIN_VEHICULO}
          descripcion="Se utiliza para la validación de cubicaje y peso máximo (kg)."
          opciones={[
            { valor: SIN_VEHICULO, etiqueta: 'Elegir después' },
            ...(vehiculos.data?.datos.map((v) => ({
              valor: String(v.id),
              etiqueta: `${v.placa} · ${v.tipo} · ${formatearKg(v.capacidadKg)}`,
            })) ?? []),
          ]}
        />
        <CampoTexto
          control={form.control}
          name="observaciones"
          etiqueta="Observaciones de despacho"
          placeholder="Ej. Despacho matutino Vía 40"
        />
      </DialogoFormulario>
    </div>
  )
}

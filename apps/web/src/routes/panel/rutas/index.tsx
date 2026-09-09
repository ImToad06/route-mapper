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
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rutas</h1>
          <p className="text-sm text-muted-foreground">
            Planificación de recorridos por fecha, con paradas, productos y vehículo.
          </p>
        </div>
        <Button onClick={() => setNueva(true)}>
          <Plus className="size-4" aria-hidden="true" /> Nueva ruta
        </Button>
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
          <SelectTrigger className="w-52" aria-label="Filtrar por estado">
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
          className="w-40"
          aria-label="Desde"
        />
        <Input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="w-40"
          aria-label="Hasta"
        />
      </BarraBusqueda>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Paradas</TableHead>
              <TableHead className="text-right">Carga</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead className="text-right">Distancia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && <FilaEstado colSpan={8}>Cargando…</FilaEstado>}
            {error && (
              <FilaEstado colSpan={8} tono="error">
                {mensajeDeError(error)}
              </FilaEstado>
            )}
            {data?.datos.length === 0 && (
              <FilaEstado colSpan={8}>
                No hay rutas que coincidan. Cree la primera con "Nueva ruta".
              </FilaEstado>
            )}
            {data?.datos.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    to="/panel/rutas/$rutaId"
                    params={{ rutaId: String(r.id) }}
                    className="font-mono font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {r.codigo}
                  </Link>
                </TableCell>
                <TableCell className="capitalize">{formatearFechaLarga(r.fecha)}</TableCell>
                <TableCell>
                  <EstadoRutaBadge estado={r.estado} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.totalParadas}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${r.vehiculo && r.cargaKg > r.vehiculo.capacidadKg ? 'text-destructive' : ''}`}
                >
                  {formatearKg(r.cargaKg)}
                </TableCell>
                <TableCell>
                  {r.vehiculo ? (
                    <span className="font-mono">{r.vehiculo.placa}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.conductor?.nombre ?? (
                    <span className="text-muted-foreground">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
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
        titulo="Nueva ruta"
        descripcion="Después de crearla agregará las paradas y los productos."
        form={form}
        onSubmit={crear}
        textoGuardar="Crear ruta"
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
          etiqueta="Vehículo"
          valorNulo={SIN_VEHICULO}
          descripcion="Se usa para validar la capacidad de carga. Puede elegirse después."
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
          etiqueta="Observaciones"
          placeholder="Opcional"
        />
      </DialogoFormulario>
    </div>
  )
}

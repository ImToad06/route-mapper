import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { FileUp, List, Map as MapIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AccionesFila } from '@/components/catalogo/acciones-fila'
import { BarraBusqueda, FilaEstado, Paginador } from '@/components/catalogo/controles-lista'
import { EncabezadoCatalogo } from '@/components/catalogo/encabezado-catalogo'
import { Mapa, Marker, Popup } from '@/components/mapa/mapa'
import { MarcadorPin } from '@/components/mapa/marcador-pin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  cambiarActivoDestino,
  claves,
  destinosMapaQuery,
  destinosQuery,
  zonasActivasQuery,
} from '@/features/catalogos/api'
import { type Destino, DialogoDestino } from '@/features/catalogos/dialogo-destino'
import { mensajeDeError } from '@/lib/api'
import { useLista } from '@/lib/use-lista'

export const Route = createFileRoute('/panel/destinos')({ component: Destinos })

const TODAS = 'todas'

function Destinos() {
  const lista = useLista()
  const queryClient = useQueryClient()
  const [zonaId, setZonaId] = useState<string>(TODAS)
  const [soloPorVerificar, setSoloPorVerificar] = useState(false)
  const [dialogo, setDialogo] = useState<{ abierto: boolean; destino?: Destino }>({
    abierto: false,
  })
  const [seleccionado, setSeleccionado] = useState<Destino | null>(null)
  const zonas = useQuery(zonasActivasQuery)
  const filtros = {
    ...lista.filtros,
    zonaId: zonaId === TODAS ? undefined : Number(zonaId),
    verificados: soloPorVerificar ? false : undefined,
  }
  const { data, isPending, error } = useQuery({
    ...destinosQuery(filtros),
    placeholderData: keepPreviousData,
  })
  const mapa = useQuery(destinosMapaQuery(filtros.zonaId))
  const invalidar = () => queryClient.invalidateQueries({ queryKey: claves.destinos })

  async function alternar(d: Destino) {
    const { error } = await cambiarActivoDestino(d.id, !d.activo)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(
      d.activo ? `Destino ${d.nombreCliente} desactivado.` : `Destino ${d.nombreCliente} activado.`,
    )
    await invalidar()
  }

  const porVerificar = mapa.data?.filter((d) => !d.ubicacionVerificada).length ?? 0

  return (
    <div className="grid gap-4">
      <EncabezadoCatalogo
        titulo="Destinos"
        descripcion="Clientes y puntos de entrega con su ubicación en el mapa (RF-10)."
        textoNuevo="Nuevo destino"
        alNuevo={() => setDialogo({ abierto: true })}
        soloActivos={lista.soloActivos}
        alCambiarActivos={lista.setSoloActivos}
      >
        <Button variant="outline" asChild>
          <Link to="/panel/destinos/importar">
            <FileUp className="size-4" aria-hidden="true" /> Importar planilla
          </Link>
        </Button>
      </EncabezadoCatalogo>

      <BarraBusqueda
        valor={lista.buscar}
        alCambiar={lista.setBuscar}
        placeholder="Buscar por cliente o dirección"
      >
        <Select
          value={zonaId}
          onValueChange={(v) => {
            setZonaId(v)
            lista.setPagina(1)
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filtrar por zona">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas las zonas</SelectItem>
            {zonas.data?.datos.map((z) => (
              <SelectItem key={z.id} value={String(z.id)}>
                {z.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={soloPorVerificar ? 'default' : 'outline'}
          onClick={() => {
            setSoloPorVerificar((v) => !v)
            lista.setPagina(1)
          }}
        >
          Por verificar{porVerificar > 0 && ` (${porVerificar})`}
        </Button>
      </BarraBusqueda>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">
            <List className="size-4" aria-hidden="true" /> Lista
          </TabsTrigger>
          <TabsTrigger value="mapa">
            <MapIcon className="size-4" aria-hidden="true" /> Mapa
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lista" className="grid gap-4">
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending && <FilaEstado colSpan={6}>Cargando…</FilaEstado>}
                {error && (
                  <FilaEstado colSpan={6} tono="error">
                    {mensajeDeError(error)}
                  </FilaEstado>
                )}
                {data?.datos.length === 0 && (
                  <FilaEstado colSpan={6}>No hay destinos que coincidan.</FilaEstado>
                )}
                {data?.datos.map((d) => (
                  <TableRow key={d.id} className={d.activo ? '' : 'opacity-60'}>
                    <TableCell>
                      <div className="font-medium">{d.nombreCliente}</div>
                      {d.telefono && (
                        <div className="text-xs text-muted-foreground">{d.telefono}</div>
                      )}
                    </TableCell>
                    <TableCell>{d.direccion}</TableCell>
                    <TableCell>{d.zona}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.horarioAtencion ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!d.activo && <Badge variant="outline">Inactivo</Badge>}
                        {d.ubicacionVerificada ? (
                          <Badge variant="secondary">Verificada</Badge>
                        ) : (
                          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                            Por verificar
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AccionesFila
                        nombre={d.nombreCliente}
                        activo={d.activo}
                        alEditar={() => setDialogo({ abierto: true, destino: d })}
                        alCambiarActivo={() => alternar(d)}
                      />
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
              sustantivo="destinos"
              alCambiar={lista.setPagina}
            />
          )}
        </TabsContent>
        <TabsContent value="mapa">
          <Mapa className="h-[70dvh] w-full overflow-hidden rounded-md border">
            {mapa.data?.map((d) => (
              <Marker
                key={d.id}
                latitude={d.latitud}
                longitude={d.longitud}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  setSeleccionado(d)
                }}
              >
                <MarcadorPin
                  color={d.ubicacionVerificada ? 'primario' : 'alerta'}
                  className="cursor-pointer"
                />
              </Marker>
            ))}
            {seleccionado && (
              <Popup
                latitude={seleccionado.latitud}
                longitude={seleccionado.longitud}
                anchor="bottom"
                offset={36}
                onClose={() => setSeleccionado(null)}
                closeButton={false}
              >
                <div className="grid gap-1 text-sm text-foreground">
                  <div className="font-medium">{seleccionado.nombreCliente}</div>
                  <div>{seleccionado.direccion}</div>
                  <div className="text-xs text-muted-foreground">
                    {seleccionado.zona}
                    {seleccionado.horarioAtencion && ` · ${seleccionado.horarioAtencion}`}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-1"
                    onClick={() => setDialogo({ abierto: true, destino: seleccionado })}
                  >
                    {seleccionado.ubicacionVerificada ? 'Editar' : 'Verificar ubicación'}
                  </Button>
                </div>
              </Popup>
            )}
          </Mapa>
          <p className="mt-2 text-xs text-muted-foreground">
            Naranja: ubicación confirmada por el coordinador. Amarillo: geocodificada
            automáticamente, pendiente de verificar.
          </p>
        </TabsContent>
      </Tabs>

      <DialogoDestino
        abierto={dialogo.abierto}
        destino={dialogo.destino}
        alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
      />
    </div>
  )
}

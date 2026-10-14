import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { resumenHoyQuery } from '@/features/reportes/api'
import { bodegaQuery, rutasQuery } from '@/features/rutas/api'
import { EstadoRutaBadge } from '@/features/rutas/estado-ruta'
import { mensajeDeError } from '@/lib/api'
import { formatearFechaLarga, formatearKg, hoyIso } from '@/lib/formato'

export const Route = createFileRoute('/panel/')({ component: InicioPanel })

function minutosDesde(fecha: string | Date) {
  return Math.round((Date.now() - new Date(fecha).getTime()) / 60_000)
}

interface KpiProps {
  titulo: string
  valor: ReactNode
  unidad?: string
  detalle: ReactNode
  children?: ReactNode
}

/** Indicador del día: etiqueta, cifra principal y una línea de apoyo. */
function Kpi({ titulo, valor, unidad, detalle, children }: KpiProps) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="font-sans text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-5">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-3xl font-bold tabular-nums">{valor}</span>
          {unidad && <span className="text-sm text-muted-foreground">{unidad}</span>}
        </div>
        {children}
        <p className="text-sm text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  )
}

function InicioPanel() {
  const { data, isPending, error, refetch, isFetching } = useQuery(resumenHoyQuery)
  // La bodega puede no estar configurada todavía (la API responde 409): el encabezado simplemente la omite.
  const { data: bodega } = useQuery({ ...bodegaQuery, retry: false })
  const hoy = hoyIso()
  const rutasHoy = useQuery({ ...rutasQuery({ pagina: 1, porPagina: 8, desde: hoy, hasta: hoy }) })

  const totalParadas = data
    ? data.paradas.entregadas + data.paradas.pendientes + data.paradas.fallidas
    : 0
  const resueltas = data ? data.paradas.entregadas + data.paradas.fallidas : 0
  const avance = totalParadas > 0 ? Math.round((resueltas / totalParadas) * 100) : 0
  const efectividad =
    totalParadas > 0 ? Math.round(((data?.paradas.entregadas ?? 0) / totalParadas) * 100) : 0

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Panel de operaciones</h1>
          <p className="text-sm text-muted-foreground">
            <span className="inline-block first-letter:uppercase">
              {data ? formatearFechaLarga(data.fecha) : 'Cargando…'}
            </span>
            {bodega && <> · Bodega: {bodega.direccion}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw
              className={isFetching ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            Actualizar
          </Button>
          <Button asChild>
            <Link to="/panel/rutas">Planificar ruta</Link>
          </Button>
        </div>
      </div>

      {isPending && <p className="text-sm text-muted-foreground">Cargando resumen…</p>}
      {error && <p className="text-sm font-medium text-destructive">{mensajeDeError(error)}</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              titulo="Rutas por despachar"
              valor={data.rutasPorEstado.borrador + data.rutasPorEstado.planificada}
              detalle={`${data.rutasPorEstado.borrador} en borrador · ${data.rutasPorEstado.planificada} planificadas`}
            />
            <Kpi
              titulo="Rutas en curso"
              valor={data.rutasPorEstado.en_curso}
              detalle={`${resueltas} de ${totalParadas} paradas resueltas`}
            >
              <Progress value={avance} aria-label="Avance de paradas del día" />
            </Kpi>
            <Kpi
              titulo="Entregas del día"
              valor={data.paradas.entregadas}
              unidad={`de ${totalParadas}`}
              detalle={`${efectividad}% de efectividad · ${data.paradas.pendientes} pendientes · ${data.paradas.fallidas} con novedad`}
            />
            <Kpi
              titulo="Conductores"
              valor={data.conductoresDisponibles}
              unidad="disponibles"
              detalle={`${data.conductoresEnRuta} en ruta ahora`}
            />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-3">
            <Card className="min-w-0 gap-0 py-0 xl:col-span-2">
              <CardHeader className="border-b px-5 pt-4 pb-4!">
                <CardTitle className="font-sans text-base font-semibold">Rutas de hoy</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead className="text-right">Paradas</TableHead>
                      <TableHead className="text-right">Carga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rutasHoy.data?.datos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No hay rutas programadas para hoy.
                        </TableCell>
                      </TableRow>
                    )}
                    {rutasHoy.data?.datos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link
                            to="/panel/rutas/$rutaId"
                            params={{ rutaId: String(r.id) }}
                            className="font-mono font-medium text-secondary hover:underline"
                          >
                            {r.codigo}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <EstadoRutaBadge estado={r.estado} />
                        </TableCell>
                        <TableCell>
                          {r.conductor?.nombre ?? (
                            <span className="text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{r.totalParadas}</TableCell>
                        <TableCell className="text-right">{formatearKg(r.cargaKg)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="min-w-0 gap-0 py-0">
              <CardHeader className="border-b px-5 pt-4 pb-4!">
                <CardTitle className="font-sans text-base font-semibold">
                  Asignaciones sin responder
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Rutas enviadas a un conductor hace más de 30 minutos sin aceptar ni rechazar.
                </p>
              </CardHeader>
              <CardContent className="px-5 py-4">
                {data.demoradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay asignaciones demoradas.</p>
                ) : (
                  <ul className="divide-y">
                    {data.demoradas.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <Link
                            to="/panel/rutas/$rutaId"
                            params={{ rutaId: String(d.id) }}
                            className="font-mono font-medium text-secondary hover:underline"
                          >
                            {d.codigo}
                          </Link>
                          <div className="truncate text-muted-foreground">{d.conductorNombre}</div>
                        </div>
                        <span className="shrink-0 font-medium text-warning tabular-nums">
                          {d.asignadaEn ? `${minutosDesde(d.asignadaEn)} min` : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

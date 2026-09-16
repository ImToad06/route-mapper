import { ETIQUETAS_ESTADO_RUTA } from '@lh/shared'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Download, FileText } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  exportarReporteConductores,
  exportarReporteRutas,
  exportarReporteZonas,
  reporteConductoresQuery,
  reporteRutasQuery,
  reporteZonasQuery,
} from '@/features/reportes/api'
import { exportarReportePdf } from '@/features/reportes/documento-pdf'
import { mensajeDeError } from '@/lib/api'
import { formatearFechaLarga } from '@/lib/formato'

export const Route = createFileRoute('/panel/reportes')({ component: Reportes })

function haceDias(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Reportes() {
  const [desde, setDesde] = useState(haceDias(6))
  const [hasta, setHasta] = useState(haceDias(0))
  const periodo = { desde, hasta }
  const periodoTexto = `${formatearFechaLarga(desde)} — ${formatearFechaLarga(hasta)}`

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Rutas, entregas y desempeño por conductor y zona en un periodo (RF-22, RF-23).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="desde">Desde</Label>
          <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hasta">Hasta</Label>
          <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="rutas">
        <TabsList>
          <TabsTrigger value="rutas">Rutas</TabsTrigger>
          <TabsTrigger value="conductores">Conductores</TabsTrigger>
          <TabsTrigger value="zonas">Zonas</TabsTrigger>
        </TabsList>
        <TabsContent value="rutas">
          <ReporteRutas periodo={periodo} periodoTexto={periodoTexto} />
        </TabsContent>
        <TabsContent value="conductores">
          <ReporteConductores periodo={periodo} periodoTexto={periodoTexto} />
        </TabsContent>
        <TabsContent value="zonas">
          <ReporteZonas periodo={periodo} periodoTexto={periodoTexto} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface PropsPeriodo {
  periodo: { desde: string; hasta: string }
  periodoTexto: string
}

function BotonesExportar({
  exportando,
  onExcel,
  onPdf,
}: {
  exportando: 'excel' | 'pdf' | null
  onExcel: () => void
  onPdf: () => void
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onExcel} disabled={exportando !== null}>
        <Download className="size-4" aria-hidden="true" />{' '}
        {exportando === 'excel' ? 'Exportando…' : 'Exportar Excel'}
      </Button>
      <Button variant="outline" size="sm" onClick={onPdf} disabled={exportando !== null}>
        <FileText className="size-4" aria-hidden="true" />{' '}
        {exportando === 'pdf' ? 'Exportando…' : 'Exportar PDF'}
      </Button>
    </div>
  )
}

interface DocumentoPdf {
  titulo: string
  periodo: string
  columnas: string[]
  filas: (string | number)[][]
}

/** Estado y flujo de exportación (Excel/PDF) comunes a los tres reportes. */
function useExportarReporte<T>(
  data: T | undefined,
  exportarExcel: () => Promise<void>,
  construirPdf: () => DocumentoPdf,
  nombreArchivoPdf: string,
) {
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null)

  async function exportar(formato: 'excel' | 'pdf') {
    if (!data) return
    setExportando(formato)
    try {
      if (formato === 'excel') {
        await exportarExcel()
      } else {
        await exportarReportePdf(construirPdf(), nombreArchivoPdf)
      }
    } catch (err) {
      toast.error(mensajeDeError(err))
    } finally {
      setExportando(null)
    }
  }

  return { exportando, exportar }
}

/** Envoltorio común: carga/error y la barra de botones de exportar sobre el contenido del reporte. */
function SeccionReporte({
  isPending,
  error,
  exportando,
  onExcel,
  onPdf,
  children,
}: {
  isPending: boolean
  error: unknown
  exportando: 'excel' | 'pdf' | null
  onExcel: () => void
  onPdf: () => void
  children: ReactNode
}) {
  if (isPending) return <p className="mt-4 text-muted-foreground">Cargando…</p>
  if (error) return <p className="mt-4 text-destructive">{mensajeDeError(error)}</p>

  return (
    <div className="mt-4 grid gap-4">
      <div className="flex justify-end">
        <BotonesExportar exportando={exportando} onExcel={onExcel} onPdf={onPdf} />
      </div>
      {children}
    </div>
  )
}

function ReporteRutas({ periodo, periodoTexto }: PropsPeriodo) {
  const { data, isPending, error } = useQuery(reporteRutasQuery(periodo))
  const { exportando, exportar } = useExportarReporte(
    data,
    () => exportarReporteRutas(periodo),
    () => ({
      titulo: 'Reporte de rutas',
      periodo: periodoTexto,
      columnas: ['Indicador', 'Valor'],
      filas: [
        ['Total de rutas', data?.totalRutas ?? 0],
        ...Object.entries(data?.rutasPorEstado ?? {}).map(([estado, cantidad]) => [
          ETIQUETAS_ESTADO_RUTA[estado as keyof typeof ETIQUETAS_ESTADO_RUTA],
          cantidad,
        ]),
        ['Entregas realizadas', data?.entregas.realizadas ?? 0],
        ['Entregas pendientes', data?.entregas.pendientes ?? 0],
        ['Entregas fallidas', data?.entregas.fallidas ?? 0],
      ],
    }),
    `reporte-rutas-${periodo.desde}-a-${periodo.hasta}.pdf`,
  )

  return (
    <SeccionReporte
      isPending={isPending}
      error={error}
      exportando={exportando}
      onExcel={() => exportar('excel')}
      onPdf={() => exportar('pdf')}
    >
      {data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rutas por estado</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total</TableCell>
                    <TableCell className="text-right tabular-nums">{data.totalRutas}</TableCell>
                  </TableRow>
                  {Object.entries(data.rutasPorEstado)
                    .filter(([, cantidad]) => cantidad > 0)
                    .map(([estado, cantidad]) => (
                      <TableRow key={estado}>
                        <TableCell>
                          {ETIQUETAS_ESTADO_RUTA[estado as keyof typeof ETIQUETAS_ESTADO_RUTA]}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{cantidad}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entregas del periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Realizadas</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {data.entregas.realizadas}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pendientes</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {data.entregas.pendientes}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Fallidas</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {data.entregas.fallidas}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </SeccionReporte>
  )
}

function ReporteConductores({ periodo, periodoTexto }: PropsPeriodo) {
  const { data, isPending, error } = useQuery(reporteConductoresQuery(periodo))
  const { exportando, exportar } = useExportarReporte(
    data,
    () => exportarReporteConductores(periodo),
    () => ({
      titulo: 'Reporte de desempeño por conductor',
      periodo: periodoTexto,
      columnas: [
        'Conductor',
        'Rutas',
        'Completadas',
        'Incompletas',
        'Canceladas',
        'Entregadas',
        'Fallidas',
        'Novedades',
        'Aceptación prom. (min)',
      ],
      filas: (data ?? []).map((c) => [
        c.nombre,
        c.totalRutas,
        c.completadas,
        c.incompletas,
        c.canceladas,
        c.paradasEntregadas,
        c.paradasFallidas,
        c.novedades,
        c.minutosAceptacionProm ?? '—',
      ]),
    }),
    `reporte-conductores-${periodo.desde}-a-${periodo.hasta}.pdf`,
  )

  return (
    <SeccionReporte
      isPending={isPending}
      error={error}
      exportando={exportando}
      onExcel={() => exportar('excel')}
      onPdf={() => exportar('pdf')}
    >
      {data && (
        <div className="overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conductor</TableHead>
                <TableHead className="text-right">Rutas</TableHead>
                <TableHead className="text-right">Completadas</TableHead>
                <TableHead className="text-right">Incompletas</TableHead>
                <TableHead className="text-right">Entregadas</TableHead>
                <TableHead className="text-right">Fallidas</TableHead>
                <TableHead className="text-right">Novedades</TableHead>
                <TableHead className="text-right">Aceptación prom.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="p-4 text-center text-muted-foreground">
                    Sin rutas en el periodo.
                  </TableCell>
                </TableRow>
              )}
              {data.map((c) => (
                <TableRow key={c.conductorId}>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.totalRutas}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.completadas}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.incompletas}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.paradasEntregadas}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.paradasFallidas}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.novedades}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.minutosAceptacionProm == null ? '—' : `${c.minutosAceptacionProm} min`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SeccionReporte>
  )
}

function ReporteZonas({ periodo, periodoTexto }: PropsPeriodo) {
  const { data, isPending, error } = useQuery(reporteZonasQuery(periodo))
  const { exportando, exportar } = useExportarReporte(
    data,
    () => exportarReporteZonas(periodo),
    () => ({
      titulo: 'Reporte de desempeño por zona',
      periodo: periodoTexto,
      columnas: ['Zona', 'Paradas totales', 'Entregadas', 'Fallidas', 'Pendientes'],
      filas: (data ?? []).map((z) => [
        z.nombre,
        z.totalParadas,
        z.entregadas,
        z.fallidas,
        z.pendientes,
      ]),
    }),
    `reporte-zonas-${periodo.desde}-a-${periodo.hasta}.pdf`,
  )

  return (
    <SeccionReporte
      isPending={isPending}
      error={error}
      exportando={exportando}
      onExcel={() => exportar('excel')}
      onPdf={() => exportar('pdf')}
    >
      {data && (
        <div className="overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zona</TableHead>
                <TableHead className="text-right">Paradas totales</TableHead>
                <TableHead className="text-right">Entregadas</TableHead>
                <TableHead className="text-right">Fallidas</TableHead>
                <TableHead className="text-right">Pendientes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-4 text-center text-muted-foreground">
                    Sin entregas en el periodo.
                  </TableCell>
                </TableRow>
              )}
              {data.map((z) => (
                <TableRow key={z.zonaId}>
                  <TableCell>{z.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{z.totalParadas}</TableCell>
                  <TableCell className="text-right tabular-nums">{z.entregadas}</TableCell>
                  <TableCell className="text-right tabular-nums">{z.fallidas}</TableCell>
                  <TableCell className="text-right tabular-nums">{z.pendientes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SeccionReporte>
  )
}

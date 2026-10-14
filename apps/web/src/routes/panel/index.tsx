import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle, Plus, RefreshCw, Truck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resumenHoyQuery } from '@/features/reportes/api'
import { mensajeDeError } from '@/lib/api'
import { formatearFechaLarga } from '@/lib/formato'

export const Route = createFileRoute('/panel/')({ component: InicioPanel })

function minutosDesde(fecha: string | Date) {
  return Math.round((Date.now() - new Date(fecha).getTime()) / 60_000)
}

function InicioPanel() {
  const { data, isPending, error, refetch } = useQuery(resumenHoyQuery)

  const totalGuias = data
    ? data.paradas.entregadas + data.paradas.pendientes + data.paradas.fallidas
    : 0
  const porcentajeEfectividad =
    totalGuias > 0 ? Math.round(((data?.paradas.entregadas ?? 0) / totalGuias) * 100) : 0

  return (
    <div className="grid gap-6 p-2">
      {/* ENCABEZADO DE OPERACIONES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Despacho Centralizado • Turno Mañana/Tarde
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Panel de Control de Operaciones - SIL
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span>{data ? formatearFechaLarga(data.fecha) : 'Cargando fecha...'}</span>
            <span>•</span>
            <span className="font-mono text-secondary font-semibold">
              Hub CEDI L&amp;H Principal
            </span>
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => refetch()}
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold transition-all shadow-sm"
          >
            <RefreshCw className="size-4 text-secondary" />
            <span>Actualizar Estado</span>
          </button>
          <Link
            to="/panel/rutas"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-secondary-foreground text-sm font-semibold transition-all shadow-md"
          >
            <Plus className="size-4" />
            <span>+ Planificar Nueva Ruta</span>
          </Link>
        </div>
      </div>

      {isPending && <p className="text-muted-foreground">Cargando resumen de operaciones...</p>}
      {error && <p className="text-destructive font-semibold">{mensajeDeError(error)}</p>}

      {data && (
        <>
          {/* TARJETAS KPI SUPERIORES (4 COLUMNAS EXACTAS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* KPI 1: Rutas Pendientes */}
            <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Por Secuenciar / Aprobar
                    </span>
                    <span className="text-xl font-extrabold text-foreground mt-1">
                      Rutas Pendientes
                    </span>
                  </div>
                  <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-foreground font-semibold">
                    <Truck className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {data.rutasPorEstado.borrador + data.rutasPorEstado.planificada}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">unidades</span>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                    VRP Listo
                  </span>
                </div>
                <div className="mt-3 pt-2 bg-muted/50 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Prioridad de despacho</span>
                  <span className="text-amber-600 font-bold uppercase">En revisión</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: En Curso */}
            <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Reparto Activo
                    </span>
                    <span className="text-xl font-extrabold text-foreground mt-1">En Curso</span>
                  </div>
                  <div className="size-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-semibold">
                    <Truck className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {data.rutasPorEstado.en_curso}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">vehículos</span>
                  </div>
                  <span className="font-mono text-secondary font-bold text-sm">68% Global</span>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-secondary h-full rounded-full transition-all duration-700"
                      style={{ width: '68%' }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Entregadas Hoy */}
            <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Efectividad de Entrega
                    </span>
                    <span className="text-xl font-extrabold text-foreground mt-1">
                      Entregadas Hoy
                    </span>
                  </div>
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-emerald-600 tracking-tight">
                      {data.paradas.entregadas}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      / {totalGuias} guías
                    </span>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                    {porcentajeEfectividad}%
                  </span>
                </div>
                <div className="mt-3 pt-2 bg-muted/50 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Pendientes en ruta</span>
                  <span className="text-foreground font-bold">
                    {data.paradas.pendientes} órdenes
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Conductores Disponibles */}
            <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all bg-card flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Turno Tarde En Base
                    </span>
                    <span className="text-xl font-extrabold text-foreground mt-1">
                      Conductores Listos
                    </span>
                  </div>
                  <div className="size-10 rounded-xl bg-blue-500/10 text-secondary flex items-center justify-center">
                    <Truck className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-foreground tracking-tight">
                      {data.conductoresEnRuta}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">en activo</span>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-secondary text-xs font-bold">
                    Lic. A3 / A2
                  </span>
                </div>
                <div className="mt-3 pt-2 bg-muted/50 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Disponibilidad flota</span>
                  <span className="text-emerald-600 font-bold">100% Habilitados</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ASIGNACIONES DEMORADAS / ALERTAS */}
          <Card className="border border-border/60 shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <div className="size-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                </div>
                Asignaciones sin responder (&gt;30 min)
              </CardTitle>
              <CardDescription>
                Rutas enviadas a conductores pendientes de aceptación inicial en el portal móvil
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.demoradas.length === 0 ? (
                <div className="bg-muted/40 p-4 rounded-xl text-center text-sm text-muted-foreground font-medium">
                  Excelente: No hay asignaciones demoradas ni alertas pendientes en el sistema.
                </div>
              ) : (
                <ul className="grid gap-2">
                  {data.demoradas.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 text-sm"
                    >
                      <Link
                        to="/panel/rutas/$rutaId"
                        params={{ rutaId: String(d.id) }}
                        className="font-mono font-bold text-secondary underline-offset-2 hover:underline"
                      >
                        {d.codigo}
                      </Link>
                      <span className="text-muted-foreground font-medium">
                        {d.conductorNombre} · esperando{' '}
                        <strong className="text-destructive">
                          {d.asignadaEn ? minutosDesde(d.asignadaEn) : '—'} min
                        </strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

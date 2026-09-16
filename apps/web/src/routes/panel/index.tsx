import type { EstadoRuta } from '@lh/shared'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, PackageCheck, PackageX, Truck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resumenHoyQuery } from '@/features/reportes/api'
import { EstadoRutaBadge } from '@/features/rutas/estado-ruta'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { formatearFechaLarga } from '@/lib/formato'

export const Route = createFileRoute('/panel/')({ component: InicioPanel })

function minutosDesde(fecha: string | Date) {
  return Math.round((Date.now() - new Date(fecha).getTime()) / 60_000)
}

function InicioPanel() {
  const usuario = useAuth((s) => s.usuario)
  const { data, isPending, error } = useQuery(resumenHoyQuery)

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Hola, {usuario?.nombre}</h1>
        {data && (
          <p className="text-sm text-muted-foreground capitalize">
            {formatearFechaLarga(data.fecha)}
          </p>
        )}
      </div>

      {isPending && <p className="text-muted-foreground">Cargando resumen…</p>}
      {error && <p className="text-destructive">{mensajeDeError(error)}</p>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="size-4 text-muted-foreground" aria-hidden="true" />
                  Rutas de hoy
                </CardTitle>
                <CardDescription>
                  {Object.values(data.rutasPorEstado).reduce((a, b) => a + b, 0)} en total
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {Object.entries(data.rutasPorEstado)
                  .filter(([, cantidad]) => cantidad > 0)
                  .map(([estado, cantidad]) => (
                    <span key={estado} className="flex items-center gap-1 text-sm">
                      <EstadoRutaBadge estado={estado as EstadoRuta} />
                      <span className="text-muted-foreground">×{cantidad}</span>
                    </span>
                  ))}
                {Object.values(data.rutasPorEstado).every((c) => c === 0) && (
                  <span className="text-sm text-muted-foreground">Sin rutas programadas hoy.</span>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PackageCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                  Entregas de hoy
                </CardTitle>
                <CardDescription>Paradas de las rutas de hoy, por resultado</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-semibold">{data.paradas.entregadas}</p>
                  <p className="text-xs text-muted-foreground">Entregadas</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{data.paradas.pendientes}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-destructive">{data.paradas.fallidas}</p>
                  <p className="text-xs text-muted-foreground">Fallidas</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PackageX className="size-4 text-muted-foreground" aria-hidden="true" />
                  Conductores en ruta
                </CardTitle>
                <CardDescription>Disponibilidad "en ruta" en este momento</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{data.conductoresEnRuta}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
                Asignaciones sin responder
              </CardTitle>
              <CardDescription>
                Rutas pendientes de aceptación hace más de 30 minutos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.demoradas.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay asignaciones demoradas.</p>
              ) : (
                <ul className="grid gap-2">
                  {data.demoradas.map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-sm">
                      <Link
                        to="/panel/rutas/$rutaId"
                        params={{ rutaId: String(d.id) }}
                        className="font-mono text-primary underline-offset-2 hover:underline"
                      >
                        {d.codigo}
                      </Link>
                      <span className="text-muted-foreground">
                        {d.conductorNombre} · esperando{' '}
                        {d.asignadaEn ? minutosDesde(d.asignadaEn) : '—'} min
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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { aceptarRuta, claveRutas, misRutasQuery, rechazarRuta } from '@/features/rutas/api'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { formatearFechaLarga, formatearKg } from '@/lib/formato'

export const Route = createFileRoute('/conductor/')({ component: InicioConductor })

function InicioConductor() {
  const usuario = useAuth((s) => s.usuario)
  const queryClient = useQueryClient()
  const { data: rutas, isPending } = useQuery(misRutasQuery)
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [rechazando, setRechazando] = useState<number | null>(null)
  const [motivo, setMotivo] = useState('')

  const invalidar = () => queryClient.invalidateQueries({ queryKey: claveRutas })

  async function aceptar(id: number) {
    setOcupado(id)
    try {
      const { error } = await aceptarRuta(id)
      if (error) return toast.error(mensajeDeError(error))
      toast.success('Ruta aceptada. Ya puede iniciarla desde "Mi ruta".')
      await invalidar()
    } finally {
      setOcupado(null)
    }
  }

  async function rechazar(id: number) {
    if (!motivo.trim()) return toast.error('Indique el motivo del rechazo.')
    setOcupado(id)
    try {
      const { error } = await rechazarRuta(id, { motivo })
      if (error) return toast.error(mensajeDeError(error))
      toast.success('Ruta rechazada.')
      setRechazando(null)
      setMotivo('')
      await invalidar()
    } finally {
      setOcupado(null)
    }
  }

  const pendientes = rutas?.filter((r) => r.estado === 'pendiente_aceptacion') ?? []
  const enCurso = rutas?.filter((r) => r.estado === 'asignada' || r.estado === 'en_curso') ?? []

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Hola, {usuario?.nombre}</h1>

      {!isPending && pendientes.length === 0 && enCurso.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sin rutas asignadas</CardTitle>
            <CardDescription>
              Cuando el coordinador le asigne una ruta aparecerá aquí para que la acepte.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Vuelva a revisar más tarde.
          </CardContent>
        </Card>
      )}

      {pendientes.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle className="font-mono">{r.codigo}</CardTitle>
            <CardDescription className="capitalize">
              {formatearFechaLarga(r.fecha)} · pendiente de aceptación
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              {r.totalParadas} parada(s) · {formatearKg(r.cargaKg)}
              {r.vehiculo && <> · {r.vehiculo.placa}</>}
            </p>
            {rechazando === r.id ? (
              <div className="grid gap-2">
                <Textarea
                  placeholder="Motivo del rechazo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRechazando(null)
                      setMotivo('')
                    }}
                    disabled={ocupado === r.id}
                  >
                    Volver
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rechazar(r.id)}
                    disabled={ocupado === r.id}
                  >
                    {ocupado === r.id ? 'Rechazando…' : 'Confirmar rechazo'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => aceptar(r.id)} disabled={ocupado !== null}>
                  {ocupado === r.id ? 'Aceptando…' : 'Aceptar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRechazando(r.id)}
                  disabled={ocupado !== null}
                >
                  Rechazar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {enCurso.map((r) => (
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
                Ver mi ruta
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

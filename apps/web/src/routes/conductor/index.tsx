import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-store'

export const Route = createFileRoute('/conductor/')({ component: InicioConductor })

function InicioConductor() {
  const usuario = useAuth((s) => s.usuario)
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Hola, {usuario?.nombre}</h1>
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
    </div>
  )
}

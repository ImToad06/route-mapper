import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-store'

export const Route = createFileRoute('/panel/')({ component: InicioPanel })

function InicioPanel() {
  const usuario = useAuth((s) => s.usuario)
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Hola, {usuario?.nombre}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Panel de despacho</CardTitle>
          <CardDescription>
            Aquí verá el resumen de rutas del día cuando estén disponibles los módulos de catálogos
            y rutas (fases 2 a 5). Por ahora puede administrar los usuarios desde el menú.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sistema de gestión y asignación de rutas · L&amp;H Distribuciones
        </CardContent>
      </Card>
    </div>
  )
}

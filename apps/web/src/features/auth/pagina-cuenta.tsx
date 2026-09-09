import { ETIQUETAS_ROL } from '@lh/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-store'
import { FormularioCambiarContrasena } from './formulario-cambiar-contrasena'

/** Página "Mi cuenta", compartida por el panel y la app del conductor. */
export function PaginaCuenta() {
  const usuario = useAuth((s) => s.usuario)
  return (
    <div className="grid max-w-lg gap-4">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <Card>
        <CardHeader>
          <CardTitle>{usuario?.nombre}</CardTitle>
          <CardDescription>
            {usuario?.correo} · {usuario ? ETIQUETAS_ROL[usuario.rol] : ''}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>
            Al cambiarla se cerrarán sus sesiones en otros dispositivos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioCambiarContrasena />
        </CardContent>
      </Card>
    </div>
  )
}

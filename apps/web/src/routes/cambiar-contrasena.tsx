import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormularioCambiarContrasena } from '@/features/auth/formulario-cambiar-contrasena'
import { useAuth } from '@/lib/auth-store'
import { cerrarSesion } from '@/lib/sesion'

/** Pantalla obligatoria cuando el usuario tiene una contraseña temporal. */
export const Route = createFileRoute('/cambiar-contrasena')({
  beforeLoad: () => {
    const { usuario } = useAuth.getState()
    if (!usuario) throw redirect({ to: '/ingresar' })
    if (!usuario.debeCambiarContrasena) throw redirect({ to: '/' })
  },
  component: CambiarContrasenaObligatorio,
})

function CambiarContrasenaObligatorio() {
  const navigate = useNavigate()
  const usuario = useAuth((s) => s.usuario)
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <KeyRound className="size-10 text-primary" aria-hidden="true" />
          <CardTitle className="text-xl">Cree su contraseña</CardTitle>
          <CardDescription>
            Hola, {usuario?.nombre}. Está usando una contraseña temporal; defina una nueva para
            continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormularioCambiarContrasena alTerminar={() => navigate({ to: '/' })} />
          <Button
            variant="ghost"
            onClick={() => cerrarSesion().then(() => navigate({ to: '/ingresar' }))}
          >
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

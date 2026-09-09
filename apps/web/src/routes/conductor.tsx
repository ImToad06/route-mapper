import { createFileRoute, redirect } from '@tanstack/react-router'
import { ConductorShell } from '@/components/layout/conductor-shell'
import { useAuth } from '@/lib/auth-store'

export const Route = createFileRoute('/conductor')({
  beforeLoad: ({ location }) => {
    const { usuario } = useAuth.getState()
    if (!usuario) throw redirect({ to: '/ingresar', search: { volverA: location.href } })
    if (usuario.debeCambiarContrasena) throw redirect({ to: '/cambiar-contrasena' })
    if (usuario.rol !== 'conductor') throw redirect({ to: '/panel' })
  },
  component: ConductorShell,
})

import { createFileRoute, redirect } from '@tanstack/react-router'
import { PanelShell } from '@/components/layout/panel-shell'
import { esPersonalDeDespacho, useAuth } from '@/lib/auth-store'

export const Route = createFileRoute('/panel')({
  beforeLoad: ({ location }) => {
    const { usuario } = useAuth.getState()
    if (!usuario) throw redirect({ to: '/ingresar', search: { volverA: location.href } })
    if (usuario.debeCambiarContrasena) throw redirect({ to: '/cambiar-contrasena' })
    if (!esPersonalDeDespacho(usuario.rol)) throw redirect({ to: '/conductor' })
  },
  component: PanelShell,
})

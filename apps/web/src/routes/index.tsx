import { createFileRoute, redirect } from '@tanstack/react-router'
import { esPersonalDeDespacho, useAuth } from '@/lib/auth-store'

/** Redirige según el rol: panel de despacho o app del conductor. */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { usuario } = useAuth.getState()
    if (!usuario) throw redirect({ to: '/ingresar' })
    if (usuario.debeCambiarContrasena) throw redirect({ to: '/cambiar-contrasena' })
    throw redirect({ to: esPersonalDeDespacho(usuario.rol) ? '/panel' : '/conductor' })
  },
})

import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Truck } from 'lucide-react'
import { Toaster } from 'sonner'
import { restaurarSesion } from '@/lib/sesion'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: () => restaurarSesion(),
  pendingComponent: Cargando,
  pendingMs: 150,
  component: RootLayout,
  notFoundComponent: () => (
    <main className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="mt-2 text-muted-foreground">La dirección que intentó abrir no existe.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">
        Volver al inicio
      </Link>
    </main>
  ),
})

function RootLayout() {
  return (
    <div className="min-h-dvh">
      <Outlet />
      <Toaster richColors position="top-center" closeButton />
    </div>
  )
}

/** Pantalla breve mientras se restaura la sesión al abrir la aplicación. */
function Cargando() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-sidebar text-sidebar-foreground">
      <Truck className="size-10 animate-pulse text-primary" aria-hidden="true" />
      <p className="text-sm" aria-live="polite">
        Cargando…
      </p>
    </main>
  )
}

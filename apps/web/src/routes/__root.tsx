import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
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
    </div>
  )
}

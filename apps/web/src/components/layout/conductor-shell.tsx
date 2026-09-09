import { Link, Outlet } from '@tanstack/react-router'
import { Home, Route as RouteIcon, UserRound } from 'lucide-react'
import { MenuUsuario } from './menu-usuario'

const pestanas = [
  { to: '/conductor' as const, etiqueta: 'Inicio', icono: Home, exact: true },
  {
    to: '/conductor' as const,
    etiqueta: 'Mi ruta',
    icono: RouteIcon,
    exact: true,
    deshabilitado: true,
  },
  { to: '/conductor/cuenta' as const, etiqueta: 'Cuenta', icono: UserRound, exact: false },
]

/** Diseño de la app del conductor: pensada para el teléfono, con navegación inferior. */
export function ConductorShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="text-sm font-semibold">Rutas L&amp;H</div>
        <MenuUsuario rutaCuenta="/conductor/cuenta" />
      </header>
      <main className="flex-1 p-4 pb-24">
        <Outlet />
      </main>
      <nav
        className="fixed inset-x-0 bottom-0 grid grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegación principal"
      >
        {pestanas.map((p) =>
          p.deshabilitado ? (
            <span
              key={p.etiqueta}
              className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground/50"
              aria-disabled="true"
              title="Disponible cuando tenga una ruta asignada"
            >
              <p.icono className="size-5" aria-hidden="true" />
              {p.etiqueta}
            </span>
          ) : (
            <Link
              key={p.etiqueta}
              to={p.to}
              activeOptions={{ exact: p.exact }}
              className="flex flex-col items-center gap-1 py-2 text-xs text-muted-foreground [&.active]:text-primary"
            >
              <p.icono className="size-5" aria-hidden="true" />
              {p.etiqueta}
            </Link>
          ),
        )}
      </nav>
    </div>
  )
}

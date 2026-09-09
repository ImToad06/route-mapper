import { Link, Outlet } from '@tanstack/react-router'
import { LayoutDashboard, Menu, Truck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/lib/auth-store'
import { MenuUsuario } from './menu-usuario'

interface Enlace {
  to: '/panel' | '/panel/usuarios'
  etiqueta: string
  icono: ReactNode
  soloAdmin?: boolean
}

const enlaces: Enlace[] = [
  {
    to: '/panel',
    etiqueta: 'Inicio',
    icono: <LayoutDashboard className="size-4" aria-hidden="true" />,
  },
  {
    to: '/panel/usuarios',
    etiqueta: 'Usuarios',
    icono: <Users className="size-4" aria-hidden="true" />,
    soloAdmin: true,
  },
]

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  const rol = useAuth((s) => s.usuario?.rol)
  return (
    <nav className="grid gap-1" aria-label="Secciones">
      {enlaces
        .filter((e) => !e.soloAdmin || rol === 'administrador')
        .map((e) => (
          <Link
            key={e.to}
            to={e.to}
            activeOptions={{ exact: e.to === '/panel' }}
            onClick={alNavegar}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground [&.active]:bg-sidebar-accent [&.active]:text-sidebar-foreground [&.active]:font-medium"
          >
            {e.icono}
            {e.etiqueta}
          </Link>
        ))}
    </nav>
  )
}

/** Diseño del panel de despacho: barra lateral en escritorio, menú desplegable en móvil. */
export function PanelShell() {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground md:flex">
        <Marca />
        <Navegacion />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-2 border-b bg-card px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={abierto} onOpenChange={setAbierto}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menú">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-4 text-sidebar-foreground">
                <SheetTitle className="sr-only">Menú</SheetTitle>
                <div className="grid gap-6">
                  <Marca />
                  <Navegacion alNavegar={() => setAbierto(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <Marca compacta />
          </div>
          <div className="ml-auto">
            <MenuUsuario rutaCuenta="/panel/cuenta" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Truck className="size-6 text-primary" aria-hidden="true" />
      {!compacta && (
        <div className="leading-tight">
          <div className="text-sm font-semibold">Rutas L&amp;H</div>
          <div className="text-xs text-sidebar-foreground/70">Panel de despacho</div>
        </div>
      )}
    </div>
  )
}

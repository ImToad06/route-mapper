import { ETIQUETAS_ROL } from '@lh/shared'
import { useNavigate } from '@tanstack/react-router'
import { LogOut, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth-store'
import { cerrarSesion } from '@/lib/sesion'

export function MenuUsuario({ rutaCuenta }: { rutaCuenta: '/panel/cuenta' | '/conductor/cuenta' }) {
  const usuario = useAuth((s) => s.usuario)
  const navigate = useNavigate()
  if (!usuario) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <UserRound className="size-4" aria-hidden="true" />
          <span className="max-w-32 truncate">{usuario.nombre}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="text-sm">{usuario.nombre}</div>
          <div className="text-xs font-normal text-muted-foreground">
            {ETIQUETAS_ROL[usuario.rol]}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: rutaCuenta })}>Mi cuenta</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => cerrarSesion().then(() => navigate({ to: '/ingresar' }))}>
          <LogOut className="size-4" aria-hidden="true" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

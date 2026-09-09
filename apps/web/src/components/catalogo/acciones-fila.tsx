import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  nombre: string
  activo: boolean
  alEditar: () => void
  alCambiarActivo: () => void
  children?: ReactNode
}

/** Menú de acciones estándar de una fila de catálogo: editar y activar/desactivar. */
export function AccionesFila({ nombre, activo, alEditar, alCambiarActivo, children }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones para ${nombre}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={alEditar}>
          <Pencil className="size-4" aria-hidden="true" /> Editar
        </DropdownMenuItem>
        {children}
        <DropdownMenuItem onSelect={alCambiarActivo}>
          {activo ? (
            <ToggleLeft className="size-4" aria-hidden="true" />
          ) : (
            <ToggleRight className="size-4" aria-hidden="true" />
          )}
          {activo ? 'Desactivar' : 'Activar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

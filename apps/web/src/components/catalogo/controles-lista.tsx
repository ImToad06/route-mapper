import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BarraProps {
  valor: string
  alCambiar: (v: string) => void
  placeholder: string
  children?: ReactNode
}

export function BarraBusqueda({ valor, alCambiar, placeholder, children }: BarraProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-56 flex-1">
        <Search
          className="absolute top-2.5 left-2.5 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          className="pl-8"
          placeholder={placeholder}
          value={valor}
          onChange={(e) => alCambiar(e.target.value)}
          aria-label={placeholder}
        />
      </div>
      {children}
    </div>
  )
}

interface PaginadorProps {
  pagina: number
  totalPaginas: number
  total: number
  sustantivo: string
  alCambiar: (p: number) => void
}

export function Paginador({ pagina, totalPaginas, total, sustantivo, alCambiar }: PaginadorProps) {
  if (totalPaginas <= 1) return null
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span className="tabular-nums">
        Página {pagina} de {totalPaginas} · {total} {sustantivo}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => alCambiar(pagina - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= totalPaginas}
          onClick={() => alCambiar(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}

/** Fila de tabla para los estados de carga, error y vacío. */
export function FilaEstado({
  colSpan,
  children,
  tono = 'neutro',
}: {
  colSpan: number
  children: ReactNode
  tono?: 'neutro' | 'error'
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={
          tono === 'error'
            ? 'p-4 text-center text-destructive'
            : 'p-4 text-center text-muted-foreground'
        }
      >
        {children}
      </td>
    </tr>
  )
}

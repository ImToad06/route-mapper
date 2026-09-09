import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Props {
  titulo: string
  descripcion?: string
  textoNuevo?: string
  alNuevo?: () => void
  soloActivos: boolean
  alCambiarActivos: (v: boolean) => void
  children?: ReactNode
}

export function EncabezadoCatalogo({
  titulo,
  descripcion,
  textoNuevo,
  alNuevo,
  soloActivos,
  alCambiarActivos,
  children,
}: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="solo-activos" checked={soloActivos} onCheckedChange={alCambiarActivos} />
          <Label htmlFor="solo-activos" className="text-sm">
            Solo activos
          </Label>
        </div>
        {children}
        {alNuevo && textoNuevo && (
          <Button onClick={alNuevo}>
            <Plus className="size-4" aria-hidden="true" /> {textoNuevo}
          </Button>
        )}
      </div>
    </div>
  )
}

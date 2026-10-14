import { type EstadoRuta, ETIQUETAS_ESTADO_RUTA } from '@lh/shared'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const CLASES: Record<EstadoRuta, string> = {
  borrador: 'border-border bg-muted text-muted-foreground',
  planificada:
    'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
  pendiente_aceptacion: 'border-warning/30 bg-warning/10 text-warning',
  asignada: 'border-secondary/25 bg-secondary/10 text-secondary',
  en_curso: 'border-primary bg-primary text-primary-foreground',
  completada: 'border-success/25 bg-success/10 text-success',
  incompleta: 'border-warning/30 bg-warning/10 text-warning',
  cancelada: 'border-destructive/25 bg-destructive/10 text-destructive',
}

export function EstadoRutaBadge({ estado, className }: { estado: EstadoRuta; className?: string }) {
  return (
    <Badge variant="outline" className={cn(CLASES[estado], className)}>
      {ETIQUETAS_ESTADO_RUTA[estado]}
    </Badge>
  )
}

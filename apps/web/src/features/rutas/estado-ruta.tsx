import { type EstadoRuta, ETIQUETAS_ESTADO_RUTA } from '@lh/shared'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const CLASES: Record<EstadoRuta, string> = {
  borrador: 'bg-muted text-muted-foreground',
  planificada: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200',
  pendiente_aceptacion: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  asignada: 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200',
  en_curso: 'bg-primary text-primary-foreground',
  completada: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  incompleta: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200',
  cancelada: 'bg-destructive/10 text-destructive',
}

export function EstadoRutaBadge({ estado, className }: { estado: EstadoRuta; className?: string }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', CLASES[estado], className)}>
      {ETIQUETAS_ESTADO_RUTA[estado]}
    </Badge>
  )
}

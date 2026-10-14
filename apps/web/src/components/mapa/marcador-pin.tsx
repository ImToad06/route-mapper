import { cn } from '@/lib/utils'

interface Props {
  numero?: number
  color?: 'primario' | 'neutro' | 'alerta'
  className?: string
}

/** Pin de mapa con número opcional. El ancla está en la punta inferior. */
export function MarcadorPin({ numero, color = 'primario', className }: Props) {
  const fondo = {
    primario: 'bg-primary text-primary-foreground',
    neutro: 'bg-muted-foreground text-background',
    alerta: 'bg-warning text-white',
  }[color]
  return (
    <div className={cn('relative flex flex-col items-center', className)} aria-hidden="true">
      <div
        className={cn(
          'flex size-7 items-center justify-center rounded-full border-2 border-white text-xs font-semibold shadow-md',
          fondo,
        )}
      >
        {numero ?? ''}
      </div>
      <div className={cn('-mt-1 size-2 rotate-45 border-r-2 border-b-2 border-white', fondo)} />
    </div>
  )
}

/** Leyenda de los colores del pin: confirmado por el coordinador o geocodificado y pendiente. */
export function LeyendaPines({ className }: { className?: string }) {
  return (
    <ul
      className={cn('mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground', className)}
    >
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
        Ubicación confirmada por el coordinador
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-warning" aria-hidden="true" />
        Geocodificada automáticamente, pendiente de verificar
      </li>
    </ul>
  )
}

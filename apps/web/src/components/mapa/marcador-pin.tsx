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
    alerta: 'bg-amber-500 text-white',
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

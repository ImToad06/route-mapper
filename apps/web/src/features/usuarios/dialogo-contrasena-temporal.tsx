import { Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  datos: { correo: string; contrasenaTemporal: string } | null
  alCerrar: () => void
}

/** Muestra una contraseña temporal una sola vez (no se vuelve a poder consultar). */
export function DialogoContrasenaTemporal({ datos, alCerrar }: Props) {
  // Conserva los últimos datos mientras el diálogo termina su animación de cierre.
  const [mostrados, setMostrados] = useState(datos)
  useEffect(() => {
    if (datos) setMostrados(datos)
  }, [datos])

  async function copiar() {
    if (!mostrados) return
    try {
      await navigator.clipboard.writeText(mostrados.contrasenaTemporal)
      toast.success('Contraseña copiada.')
    } catch {
      toast.error('No se pudo copiar. Anótela manualmente.')
    }
  }
  return (
    <Dialog open={Boolean(datos)} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contraseña temporal</DialogTitle>
          <DialogDescription>
            Entréguela a <strong>{mostrados?.correo}</strong>. Solo se muestra esta vez; el usuario
            deberá cambiarla al ingresar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-lg tracking-wider">
          <span className="flex-1 select-all">{mostrados?.contrasenaTemporal}</span>
          <Button variant="ghost" size="icon" onClick={copiar} aria-label="Copiar contraseña">
            <Copy className="size-4" />
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={alCerrar}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

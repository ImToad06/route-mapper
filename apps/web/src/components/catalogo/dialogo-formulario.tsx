import { type ReactNode, useEffect } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'

interface Props<TIn extends FieldValues, TOut extends FieldValues> {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  /** Formulario tipado con los valores de entrada (TIn) y los validados por Zod (TOut). */
  form: UseFormReturn<TIn, unknown, TOut>
  onSubmit: (datos: TOut) => unknown
  textoGuardar: string
  children: ReactNode
  ancho?: 'normal' | 'amplio'
}

/** Diálogo con formulario react-hook-form. Conserva el contenido mientras se cierra. */
export function DialogoFormulario<TIn extends FieldValues, TOut extends FieldValues = TIn>({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  form,
  onSubmit,
  textoGuardar,
  children,
  ancho = 'normal',
}: Props<TIn, TOut>) {
  // Al abrir se vuelve a los valores del registro (o vacíos): react-hook-form no descarta lo que el
  // usuario escribió si el prop `values` no cambió.
  useEffect(() => {
    if (abierto) form.reset()
  }, [abierto, form])
  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        if (!o) {
          alCerrar()
          form.reset()
        }
      }}
    >
      <DialogContent
        className={
          ancho === 'amplio'
            ? 'max-h-[92dvh] overflow-y-auto sm:max-w-3xl'
            : 'max-h-[92dvh] overflow-y-auto'
        }
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descripcion && <DialogDescription>{descripcion}</DialogDescription>}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((datos: TOut) => {
              void onSubmit(datos)
            })}
            className="grid gap-4"
            noValidate
          >
            {children}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={alCerrar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando…' : textoGuardar}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

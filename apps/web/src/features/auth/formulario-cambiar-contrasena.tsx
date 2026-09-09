import { zodResolver } from '@hookform/resolvers/zod'
import { type CambiarContrasenaInput, cambiarContrasenaSchema } from '@lh/shared'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { api, mensajeDeError } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'

export function FormularioCambiarContrasena({ alTerminar }: { alTerminar?: () => void }) {
  const form = useForm<CambiarContrasenaInput>({
    resolver: zodResolver(cambiarContrasenaSchema),
    defaultValues: { contrasenaActual: '', contrasenaNueva: '', confirmacion: '' },
  })

  async function onSubmit(datos: CambiarContrasenaInput) {
    const { error } = await api.auth['cambiar-contrasena'].post(datos)
    if (error) {
      toast.error(mensajeDeError(error))
      return
    }
    const { usuario, actualizarUsuario } = useAuth.getState()
    if (usuario) actualizarUsuario({ ...usuario, debeCambiarContrasena: false })
    toast.success('Contraseña actualizada.')
    form.reset()
    alTerminar?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormField
          control={form.control}
          name="contrasenaActual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña actual</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contrasenaNueva"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nueva contraseña</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>
                Mínimo 8 caracteres, con al menos una letra y un número.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmacion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar nueva contraseña</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </Form>
  )
}

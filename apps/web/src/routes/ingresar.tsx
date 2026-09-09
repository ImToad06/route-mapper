import { zodResolver } from '@hookform/resolvers/zod'
import { type LoginInput, loginSchema } from '@lh/shared'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Truck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { api, mensajeDeError } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'

/** Solo se acepta una ruta interna como destino de retorno. */
const rutaInterna = z
  .string()
  .regex(/^\/(?!\/)/)
  .optional()
  .catch(undefined)

export const Route = createFileRoute('/ingresar')({
  validateSearch: z.object({ volverA: rutaInterna }),
  beforeLoad: () => {
    if (useAuth.getState().usuario) throw redirect({ to: '/' })
  },
  component: Ingresar,
})

function Ingresar() {
  const navigate = useNavigate()
  const { volverA } = Route.useSearch()
  const fijarSesion = useAuth((s) => s.fijarSesion)
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', contrasena: '' },
  })

  async function onSubmit(datos: LoginInput) {
    const { data, error } = await api.auth.login.post(datos)
    if (error || !data) {
      toast.error(mensajeDeError(error))
      form.setValue('contrasena', '')
      return
    }
    fijarSesion(data.usuario, data.tokenAcceso)
    toast.success(`Bienvenido, ${data.usuario.nombre}`)
    await navigate({ to: (volverA ?? '/') as '/' })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Truck className="size-10 text-primary" aria-hidden="true" />
          <CardTitle className="text-xl">Rutas L&amp;H Distribuciones</CardTitle>
          <CardDescription>Ingrese con su correo y contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
              <FormField
                control={form.control}
                name="correo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="username"
                        inputMode="email"
                        placeholder="usuario@lh.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contrasena"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            ¿Olvidó su contraseña? Solicite al administrador que la restablezca.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

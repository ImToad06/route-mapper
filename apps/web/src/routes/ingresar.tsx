import { zodResolver } from '@hookform/resolvers/zod'
import { type LoginInput, loginSchema } from '@lh/shared'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { BadgeCheck, Eye, EyeOff, Lock, Truck, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  const [perfil, setPerfil] = useState<'coordinador' | 'transportista'>('coordinador')
  const [verPassword, setVerPassword] = useState(false)

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
    <main className="flex min-h-dvh items-center justify-center bg-sidebar p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950/90 to-slate-950 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Top Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-16 rounded-2xl bg-secondary/20 flex items-center justify-center mb-3 border border-secondary/30 shadow-inner text-secondary">
            <Truck className="size-8" aria-hidden="true" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-wider mb-2 border border-secondary/20">
            <span className="size-2 rounded-full bg-secondary animate-pulse"></span>
            Acceso Corporativo Seguro
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            L&amp;H Distribuciones
          </h1>
          <p className="text-sm text-slate-400 mt-1">Sistema de Información Logística (SIL)</p>
        </div>

        <Card className="w-full bg-card/95 backdrop-blur-md border-border/60 shadow-2xl rounded-2xl p-4">
          <CardHeader className="space-y-3 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tipo de Perfil
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={() => setPerfil('coordinador')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${perfil === 'coordinador' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <UserCheck className="size-4 text-secondary" /> Coordinador
                </button>
                <button
                  type="button"
                  onClick={() => setPerfil('transportista')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${perfil === 'transportista' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Truck className="size-4 text-secondary" /> Transportista
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
                <FormField
                  control={form.control}
                  name="correo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between font-semibold">
                        <span>Correo Corporativo</span>
                        <span className="text-xs text-secondary font-normal">
                          @lhdistribuciones.com
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-muted-foreground pointer-events-none">
                            <BadgeCheck className="size-4" />
                          </span>
                          <Input
                            type="email"
                            autoComplete="username"
                            inputMode="email"
                            placeholder="nombre.apellido"
                            className="pl-9 h-11 rounded-xl bg-muted/50 border-input font-medium"
                            {...field}
                          />
                        </div>
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
                      <div className="flex items-center justify-between">
                        <FormLabel className="font-semibold">Contraseña</FormLabel>
                        <span className="text-xs text-secondary hover:underline cursor-pointer">
                          ¿Olvidó su contraseña?
                        </span>
                      </div>
                      <FormControl>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-muted-foreground pointer-events-none">
                            <Lock className="size-4" />
                          </span>
                          <Input
                            type={verPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="••••••••••••"
                            className="pl-9 pr-10 h-11 rounded-xl bg-muted/50 border-input font-medium"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setVerPassword(!verPassword)}
                            className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {verPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold text-base shadow-md mt-2 transition-all"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Iniciando sesión…' : 'Iniciar Sesión'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

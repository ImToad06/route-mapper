import { zodResolver } from '@hookform/resolvers/zod'
import { type LoginInput, loginSchema } from '@lh/shared'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff, Truck, UserCheck } from 'lucide-react'
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
import { cerrarSesion } from '@/lib/sesion'

/** Solo se acepta una ruta interna como destino de retorno. */
const rutaInterna = z
  .string()
  .regex(/^\/(?!\/)/)
  .optional()
  .catch(undefined)

type Perfil = 'coordinador' | 'transportista'
const CLAVE_PERFIL = 'lh_perfil_ingreso'

/** Último perfil usado en este navegador (el conductor no tiene que cambiarlo en cada ingreso). */
function perfilGuardado(): Perfil {
  try {
    return localStorage.getItem(CLAVE_PERFIL) === 'transportista' ? 'transportista' : 'coordinador'
  } catch {
    return 'coordinador'
  }
}

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
  const [perfil, setPerfil] = useState<Perfil>(perfilGuardado)
  const [ayudaClave, setAyudaClave] = useState(false)
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
    // El perfil elegido debe corresponder a la cuenta: así un conductor no entra por error al panel
    // ni un coordinador a la app móvil. Si no coincide se cierra la sesión recién abierta.
    const perfilReal: Perfil = data.usuario.rol === 'conductor' ? 'transportista' : 'coordinador'
    if (perfilReal !== perfil) {
      await cerrarSesion()
      setPerfil(perfilReal)
      toast.error(
        perfilReal === 'transportista'
          ? 'Esta cuenta es de conductor. Cambié el perfil a Transportista; vuelva a pulsar Iniciar Sesión.'
          : 'Esta cuenta es de coordinación. Cambié el perfil a Coordinador; vuelva a pulsar Iniciar Sesión.',
      )
      form.setValue('contrasena', '')
      return
    }
    try {
      localStorage.setItem(CLAVE_PERFIL, perfil)
    } catch {}
    fijarSesion(data.usuario, data.tokenAcceso)
    toast.success(`Bienvenido, ${data.usuario.nombre}`)
    await navigate({ to: (volverA ?? '/') as '/' })
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3 text-white">
          <div className="flex size-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Truck className="size-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-semibold">L&amp;H Distribuciones</h1>
            <p className="text-sm text-slate-400">Sistema de información logística</p>
          </div>
        </div>

        <Card className="gap-5 py-6 shadow-lg">
          <CardHeader className="gap-1 px-6">
            <h2 className="text-base font-semibold">Iniciar sesión</h2>
            <p className="text-sm text-muted-foreground">
              Elija su perfil e ingrese con las credenciales que le asignó el administrador.
            </p>
          </CardHeader>
          <CardContent className="px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1.5 text-sm font-medium">Perfil</legend>
                  <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1">
                    {(
                      [
                        { valor: 'coordinador', etiqueta: 'Coordinador', Icono: UserCheck },
                        { valor: 'transportista', etiqueta: 'Transportista', Icono: Truck },
                      ] as const
                    ).map(({ valor, etiqueta, Icono }) => (
                      <button
                        key={valor}
                        type="button"
                        aria-pressed={perfil === valor}
                        onClick={() => setPerfil(valor)}
                        className={`flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${perfil === valor ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <Icono className="size-4" aria-hidden="true" /> {etiqueta}
                      </button>
                    ))}
                  </div>
                </fieldset>

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
                          placeholder="nombre@empresa.com"
                          className="h-10"
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
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={verPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            className="h-10 pr-10"
                            {...field}
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => setVerPassword(!verPassword)}
                          aria-label={verPassword ? 'Ocultar clave' : 'Mostrar clave'}
                          className="absolute top-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          {verPassword ? (
                            <EyeOff className="size-4" aria-hidden="true" />
                          ) : (
                            <Eye className="size-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-2">
                  <button
                    type="button"
                    aria-expanded={ayudaClave}
                    aria-controls="ayuda-clave"
                    onClick={() => setAyudaClave((v) => !v)}
                    className="w-fit text-sm text-secondary hover:underline"
                  >
                    ¿Olvidó su contraseña?
                  </button>
                  {ayudaClave && (
                    <p
                      id="ayuda-clave"
                      className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground"
                    >
                      Pida al administrador del sistema que restablezca su contraseña. Recibirá una
                      contraseña temporal y el sistema le pedirá crear una nueva al ingresar.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-10 w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Iniciando sesión…' : 'Iniciar Sesión'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-slate-500">
          Acceso restringido al personal autorizado de L&amp;H Distribuciones.
        </p>
      </div>
    </main>
  )
}

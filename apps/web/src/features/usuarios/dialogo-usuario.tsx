import { zodResolver } from '@hookform/resolvers/zod'
import {
  type CrearUsuarioInput,
  crearUsuarioSchema,
  ETIQUETAS_ROL,
  ROLES,
  type UsuarioPublico,
} from '@lh/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mensajeDeError } from '@/lib/api'
import { actualizarUsuario, claveUsuarios, crearUsuario } from './api'

interface Props {
  abierto: boolean
  alCerrar: () => void
  /** Si se pasa, el diálogo edita en lugar de crear. */
  usuario?: UsuarioPublico
  alCrear?: (resultado: { usuario: UsuarioPublico; contrasenaTemporal: string | null }) => void
}

export function DialogoUsuario({ abierto, alCerrar, usuario, alCrear }: Props) {
  const queryClient = useQueryClient()
  const editando = Boolean(usuario)
  const form = useForm<CrearUsuarioInput>({
    resolver: zodResolver(crearUsuarioSchema),
    values: {
      nombre: usuario?.nombre ?? '',
      correo: usuario?.correo ?? '',
      rol: usuario?.rol ?? 'coordinador',
    },
  })

  async function onSubmit(datos: CrearUsuarioInput) {
    if (usuario) {
      const { error } = await actualizarUsuario(usuario.id, datos)
      if (error) return toast.error(mensajeDeError(error))
      toast.success('Usuario actualizado.')
    } else {
      const { data, error } = await crearUsuario(datos)
      if (error || !data) return toast.error(mensajeDeError(error))
      toast.success('Usuario creado.')
      alCrear?.(data)
    }
    await queryClient.invalidateQueries({ queryKey: claveUsuarios })
    alCerrar()
  }

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'Cambie el nombre, el correo o el rol. Si cambia el rol se cerrarán sus sesiones.'
              : 'El sistema generará una contraseña temporal que deberá entregar al usuario.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="correo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ETIQUETAS_ROL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Los conductores se vinculan a su vehículo desde el módulo de conductores.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={alCerrar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Guardando…'
                  : editando
                    ? 'Guardar cambios'
                    : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

import { ETIQUETAS_ROL, ROLES, type Rol, type UsuarioPublico } from '@lh/shared'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { KeyRound, MoreHorizontal, Pencil, Plus, Search, UserCheck, UserX } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  cambiarEstadoUsuario,
  claveUsuarios,
  restablecerContrasena,
  usuariosQuery,
} from '@/features/usuarios/api'
import { DialogoContrasenaTemporal } from '@/features/usuarios/dialogo-contrasena-temporal'
import { DialogoUsuario } from '@/features/usuarios/dialogo-usuario'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { formatearFecha } from '@/lib/formato'

export const Route = createFileRoute('/panel/usuarios')({
  beforeLoad: () => {
    if (useAuth.getState().usuario?.rol !== 'administrador') throw redirect({ to: '/panel' })
  },
  component: Usuarios,
})

const TODOS = 'todos'

function Usuarios() {
  const queryClient = useQueryClient()
  const yo = useAuth((s) => s.usuario)
  const [buscar, setBuscar] = useState('')
  const [rol, setRol] = useState<Rol | typeof TODOS>(TODOS)
  const [pagina, setPagina] = useState(1)
  const [dialogo, setDialogo] = useState<{ abierto: boolean; usuario?: UsuarioPublico }>({
    abierto: false,
  })
  const [temporal, setTemporal] = useState<{ correo: string; contrasenaTemporal: string } | null>(
    null,
  )

  // La búsqueda se difiere para no lanzar una consulta por cada tecla, y se conserva la página
  // anterior mientras llega la nueva para no parpadear.
  const buscarDiferido = useDeferredValue(buscar.trim())
  const filtros = {
    pagina,
    porPagina: 20,
    buscar: buscarDiferido || undefined,
    rol: rol === TODOS ? undefined : rol,
  }
  const { data, isPending, error } = useQuery({
    ...usuariosQuery(filtros),
    placeholderData: keepPreviousData,
  })

  async function alternarEstado(u: UsuarioPublico) {
    const { error } = await cambiarEstadoUsuario(u.id, !u.activo)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(u.activo ? `Usuario ${u.correo} desactivado.` : `Usuario ${u.correo} activado.`)
    await queryClient.invalidateQueries({ queryKey: claveUsuarios })
  }

  async function restablecer(u: UsuarioPublico) {
    const { data, error } = await restablecerContrasena(u.id)
    if (error || !data) return toast.error(mensajeDeError(error))
    setTemporal({ correo: u.correo, contrasenaTemporal: data.contrasenaTemporal })
    await queryClient.invalidateQueries({ queryKey: claveUsuarios })
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <Button onClick={() => setDialogo({ abierto: true })}>
          <Plus className="size-4" aria-hidden="true" /> Nuevo usuario
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            className="absolute top-2.5 left-2.5 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-8"
            placeholder="Buscar por nombre o correo"
            value={buscar}
            onChange={(e) => {
              setBuscar(e.target.value)
              setPagina(1)
            }}
          />
        </div>
        <Select
          value={rol}
          onValueChange={(v) => {
            setRol(v as Rol | typeof TODOS)
            setPagina(1)
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ETIQUETAS_ROL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {error && (
              <TableRow>
                <TableCell colSpan={6} className="text-destructive">
                  {mensajeDeError(error)}
                </TableCell>
              </TableRow>
            )}
            {data?.datos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hay usuarios que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            )}
            {data?.datos.map((u) => (
              <TableRow key={u.id} className={u.activo ? '' : 'opacity-60'}>
                <TableCell className="font-medium">{u.nombre}</TableCell>
                <TableCell>{u.correo}</TableCell>
                <TableCell>{ETIQUETAS_ROL[u.rol]}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={u.activo ? 'secondary' : 'outline'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {u.debeCambiarContrasena && (
                      <Badge variant="outline">Contraseña temporal</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{formatearFecha(u.creadoEn)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Acciones para ${u.nombre}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setDialogo({ abierto: true, usuario: u })}>
                        <Pencil className="size-4" aria-hidden="true" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => restablecer(u)}>
                        <KeyRound className="size-4" aria-hidden="true" /> Restablecer contraseña
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => alternarEstado(u)}
                        disabled={u.id === yo?.id}
                      >
                        {u.activo ? (
                          <>
                            <UserX className="size-4" aria-hidden="true" /> Desactivar
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-4" aria-hidden="true" /> Activar
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums">
            Página {data.pagina} de {data.totalPaginas} · {data.total} usuarios
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= data.totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <DialogoUsuario
        abierto={dialogo.abierto}
        usuario={dialogo.usuario}
        alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
        alCrear={(r) => {
          if (r.contrasenaTemporal)
            setTemporal({ correo: r.usuario.correo, contrasenaTemporal: r.contrasenaTemporal })
        }}
      />
      <DialogoContrasenaTemporal datos={temporal} alCerrar={() => setTemporal(null)} />
    </div>
  )
}

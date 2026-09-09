import type { ActualizarUsuarioInput, CrearUsuarioInput, ListarUsuariosInput } from '@lh/shared'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const claveUsuarios = ['usuarios'] as const

export const usuariosQuery = (filtros: ListarUsuariosInput) =>
  queryOptions({
    queryKey: [...claveUsuarios, filtros],
    queryFn: async () => {
      const { data, error } = await api.usuarios.get({ query: filtros })
      if (error) throw error
      return data
    },
  })

export const crearUsuario = (datos: CrearUsuarioInput) => api.usuarios.post(datos)
export const actualizarUsuario = (id: number, datos: ActualizarUsuarioInput) =>
  api.usuarios({ id }).patch(datos)
export const cambiarEstadoUsuario = (id: number, activo: boolean) =>
  api.usuarios({ id }).estado.patch({ activo })
export const restablecerContrasena = (id: number) =>
  api.usuarios({ id })['restablecer-contrasena'].post()

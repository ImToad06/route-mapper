import type { UsuarioPublico } from '@lh/shared'
import { create } from 'zustand'

interface EstadoAuth {
  usuario: UsuarioPublico | null
  /** Token de acceso, solo en memoria; se renueva con la cookie de refresco. */
  tokenAcceso: string | null
  fijarSesion: (usuario: UsuarioPublico, tokenAcceso: string) => void
  actualizarUsuario: (usuario: UsuarioPublico) => void
  limpiar: () => void
}

export const useAuth = create<EstadoAuth>((set) => ({
  usuario: null,
  tokenAcceso: null,
  fijarSesion: (usuario, tokenAcceso) => set({ usuario, tokenAcceso }),
  actualizarUsuario: (usuario) => set({ usuario }),
  limpiar: () => set({ usuario: null, tokenAcceso: null }),
}))

export const esPersonalDeDespacho = (rol: UsuarioPublico['rol'] | undefined) =>
  rol === 'administrador' || rol === 'coordinador'

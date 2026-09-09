import { api, refrescarSesion } from './api'
import { useAuth } from './auth-store'
import { queryClient } from './query'

let restauracion: Promise<void> | null = null

/**
 * Al abrir la aplicación: intenta recuperar la sesión con la cookie de refresco. Se ejecuta una
 * sola vez mientras tenga éxito o el servidor niegue la sesión; si falló por red se reintenta en
 * la siguiente navegación.
 */
export function restaurarSesion(): Promise<void> {
  if (useAuth.getState().usuario) return Promise.resolve()
  if (!restauracion) {
    restauracion = refrescarSesion().then((token) => {
      if (!token) restauracion = null
    })
  }
  return restauracion
}

export async function cerrarSesion(): Promise<void> {
  try {
    await api.auth.cerrar.post()
  } finally {
    useAuth.getState().limpiar()
    queryClient.clear()
    restauracion = null
  }
}

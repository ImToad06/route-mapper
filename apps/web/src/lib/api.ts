import { treaty } from '@elysiajs/eden'
import type { App } from '@lh/api'
import type { UsuarioPublico } from '@lh/shared'
import { useAuth } from './auth-store'

/**
 * Cliente tipado de la API (Eden Treaty). En desarrollo Vite hace proxy de /api al servidor;
 * en producción Nginx hace lo mismo, así que la URL base es el propio origen.
 */
const baseUrl = import.meta.env.VITE_API_URL || window.location.origin

let refrescoEnCurso: Promise<string | null> | null = null

async function pedirRefresco(): Promise<string | null> {
  let res: Response
  try {
    res = await fetch(`${baseUrl}/api/auth/refrescar`, { method: 'POST', credentials: 'include' })
  } catch {
    // Sin red o API reiniciándose: se conserva lo que haya en memoria y se reintenta más tarde.
    return null
  }
  if (res.status === 401 || res.status === 403) {
    useAuth.getState().limpiar()
    return null
  }
  if (!res.ok) return null
  const datos = (await res.json()) as { tokenAcceso: string; usuario: UsuarioPublico }
  useAuth.getState().fijarSesion(datos.usuario, datos.tokenAcceso)
  return datos.tokenAcceso
}

/**
 * Pide un token de acceso nuevo usando la cookie de refresco. Devuelve null si no hay sesión.
 * Se serializa entre pestañas (Web Locks) porque el token de refresco rota en cada uso.
 */
export function refrescarSesion(): Promise<string | null> {
  if (refrescoEnCurso) return refrescoEnCurso
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  refrescoEnCurso = (locks ? locks.request('lh-refresco', pedirRefresco) : pedirRefresco()).finally(
    () => {
      refrescoEnCurso = null
    },
  )
  return refrescoEnCurso
}

const conToken = (init: RequestInit | undefined, token: string | null): RequestInit => {
  const headers = new Headers(init?.headers)
  if (token) headers.set('authorization', `Bearer ${token}`)
  return { ...init, headers, credentials: 'include' }
}

const SIN_REINTENTO = ['/api/auth/login', '/api/auth/refrescar', '/api/auth/cerrar']

/** fetch con token de acceso; ante un 401 con token renueva la sesión una vez y reintenta. */
async function fetchAutenticado(entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof entrada === 'string' ? entrada : entrada.toString()
  const token = useAuth.getState().tokenAcceso
  const res = await fetch(entrada, conToken(init, token))
  if (res.status !== 401 || !token || SIN_REINTENTO.some((r) => url.includes(r))) return res
  const nuevo = await refrescarSesion()
  if (!nuevo) return res
  return fetch(entrada, conToken(init, nuevo))
}

export const api = treaty<App>(baseUrl, { fetcher: fetchAutenticado as typeof fetch }).api

/** Extrae el mensaje en español que envía la API, o uno genérico. */
export function mensajeDeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const valor = 'value' in error ? (error as { value: unknown }).value : error
    if (valor && typeof valor === 'object' && 'mensaje' in valor) {
      return String((valor as { mensaje: unknown }).mensaje)
    }
    if (error instanceof Error && error.message) return error.message
  }
  return 'Ocurrió un error inesperado. Intente de nuevo.'
}

import { env } from '../config/env.ts'

interface ServidorConIp {
  requestIP(request: Request): { address: string } | null
}

/**
 * IP del cliente. Solo se confía en X-Forwarded-For cuando CONFIAR_PROXY=true, y en ese caso se toma
 * el último salto, que es el que añade Nginx ($proxy_add_x_forwarded_for) y no puede falsificar el cliente.
 */
export function ipCliente(request: Request, server: ServidorConIp | null | undefined): string {
  if (env.CONFIAR_PROXY) {
    const xff = request.headers.get('x-forwarded-for')
    const ultimo = xff
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .at(-1)
    if (ultimo) return ultimo
  }
  return server?.requestIP(request)?.address ?? 'desconocida'
}

/** Si la petición llegó por HTTPS (directo o vía proxy). */
export function esHttps(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (proto) return proto === 'https'
  return new URL(request.url).protocol === 'https:'
}

export function cookieSegura(request: Request): boolean {
  if (env.COOKIE_SEGURA === 'true') return true
  if (env.COOKIE_SEGURA === 'false') return false
  return esHttps(request)
}

/** Escapa comodines para usar texto libre dentro de un patrón LIKE/ILIKE. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, '\\$&')
}

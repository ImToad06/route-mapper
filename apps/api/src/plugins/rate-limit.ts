import { ipCliente } from '../lib/http.ts'
import { ErrorAplicacion } from './errores.ts'

interface Ventana {
  intentos: number
  reinicio: number
}

interface ContextoLimite {
  request: Request
  server: { requestIP(request: Request): { address: string } | null } | null
}

const MAX_ENTRADAS = 10_000

/**
 * Limitador en memoria de intentos fallidos por IP. `verificar` se usa como `beforeHandle`;
 * `registrarFallo` cuenta un intento fallido y `reiniciar` limpia la ventana tras un ingreso correcto.
 * Suficiente para una sola instancia de la API; con varias instancias debe moverse a Redis o similar.
 */
export function limitarPorIp(opciones: { maximo: number; ventanaMs: number }) {
  const ventanas = new Map<string, Ventana>()

  const limpiar = () => {
    const ahora = Date.now()
    for (const [ip, v] of ventanas) if (v.reinicio <= ahora) ventanas.delete(ip)
    // Si aún así crece demasiado (cabeceras falsificadas), se descartan las entradas más antiguas.
    while (ventanas.size > MAX_ENTRADAS) {
      const primera = ventanas.keys().next().value
      if (primera === undefined) break
      ventanas.delete(primera)
    }
  }
  setInterval(limpiar, opciones.ventanaMs).unref?.()

  const ipDe = ({ request, server }: ContextoLimite) => ipCliente(request, server)

  return {
    verificar(ctx: ContextoLimite) {
      const v = ventanas.get(ipDe(ctx))
      if (v && v.reinicio > Date.now() && v.intentos >= opciones.maximo) {
        throw new ErrorAplicacion(
          429,
          'Demasiados intentos. Espere unos minutos e intente de nuevo.',
        )
      }
    },
    registrarFallo(ctx: ContextoLimite) {
      const ip = ipDe(ctx)
      const ahora = Date.now()
      const v = ventanas.get(ip)
      if (!v || v.reinicio <= ahora) {
        if (ventanas.size >= MAX_ENTRADAS) limpiar()
        ventanas.set(ip, { intentos: 1, reinicio: ahora + opciones.ventanaMs })
      } else {
        v.intentos++
      }
    },
    reiniciar(ctx: ContextoLimite) {
      ventanas.delete(ipDe(ctx))
    },
  }
}

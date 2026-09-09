import { env } from '../../config/env.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { crearProveedorOsrm } from './osrm.ts'
import type { ProveedorEnrutamiento } from './proveedor.ts'
import { crearProveedorVroom } from './vroom.ts'

function crearProveedorPorDefecto(): ProveedorEnrutamiento | null {
  if (!env.OSRM_URL) return null
  const osrm = crearProveedorOsrm(env.OSRM_URL)
  return env.VROOM_URL ? crearProveedorVroom(env.VROOM_URL, osrm) : osrm
}

let proveedor: ProveedorEnrutamiento | null = crearProveedorPorDefecto()

/** Permite sustituir el motor (pruebas u otro proveedor). Con `null` vuelve al configurado por entorno. */
export function usarProveedorEnrutamiento(p: ProveedorEnrutamiento | null) {
  proveedor = p ?? crearProveedorPorDefecto()
}

export function obtenerProveedorEnrutamiento(): ProveedorEnrutamiento {
  if (!proveedor) {
    throw new ErrorAplicacion(
      503,
      'El motor de rutas no está configurado (OSRM_URL). Contacte al administrador.',
    )
  }
  return proveedor
}

export const motorConfigurado = () => proveedor !== null

import type { Coordenadas } from '@lh/shared'
import { inArray } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { configuracion } from '../../db/schema/index.ts'
import type { UsuarioActual } from '../../plugins/auth.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { registrarOperacion } from '../bitacora/bitacora.service.ts'

export interface Bodega extends Coordenadas {
  direccion: string
}

const CLAVES = ['bodega.direccion', 'bodega.latitud', 'bodega.longitud'] as const

/** Bodega de L&H: inicio y fin de todas las rutas. */
export async function obtenerBodega(): Promise<Bodega> {
  const filas = await db
    .select()
    .from(configuracion)
    .where(inArray(configuracion.clave, [...CLAVES]))
  const v = Object.fromEntries(filas.map((f) => [f.clave, f.valor]))
  const latitud = Number(v['bodega.latitud']?.trim() || Number.NaN)
  const longitud = Number(v['bodega.longitud']?.trim() || Number.NaN)
  if (!v['bodega.direccion']?.trim() || !Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    throw new ErrorAplicacion(
      409,
      'La bodega no está configurada. El administrador debe registrar su dirección y ubicación.',
    )
  }
  return { direccion: v['bodega.direccion'], latitud, longitud }
}

export async function guardarBodega(datos: Bodega, actor: UsuarioActual): Promise<Bodega> {
  const valores: Record<(typeof CLAVES)[number], string> = {
    'bodega.direccion': datos.direccion,
    'bodega.latitud': String(datos.latitud),
    'bodega.longitud': String(datos.longitud),
  }
  for (const clave of CLAVES) {
    await db
      .insert(configuracion)
      .values({ clave, valor: valores[clave] })
      .onConflictDoUpdate({
        target: configuracion.clave,
        set: { valor: valores[clave], actualizadoEn: new Date() },
      })
  }
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'configuracion',
    descripcion: `Actualizó la ubicación de la bodega (${datos.direccion})`,
  })
  return obtenerBodega()
}

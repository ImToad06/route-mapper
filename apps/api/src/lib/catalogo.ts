import { and, count, eq, ilike, or, type SQL } from 'drizzle-orm'
import type { PgColumn, PgSelect } from 'drizzle-orm/pg-core'
import { escaparLike } from './http.ts'
import { construirPagina, type Pagina } from './paginacion.ts'

/** Condición de búsqueda ILIKE sobre varias columnas. */
export function condicionBusqueda(
  texto: string | undefined,
  columnas: PgColumn[],
): SQL | undefined {
  if (!texto) return undefined
  const patron = `%${escaparLike(texto)}%`
  return or(...columnas.map((c) => ilike(c, patron)))
}

export function condicionActivo(activo: boolean | undefined, columna: PgColumn): SQL | undefined {
  return activo === undefined ? undefined : eq(columna, activo)
}

export function combinar(...condiciones: (SQL | undefined)[]): SQL | undefined {
  const validas = condiciones.filter((c): c is SQL => c !== undefined)
  return validas.length ? and(...validas) : undefined
}

export function paginar<T extends PgSelect>(consulta: T, pagina: number, porPagina: number): T {
  return consulta.limit(porPagina).offset((pagina - 1) * porPagina) as T
}

export const contar = count

/** Ejecuta en paralelo la página pedida y el conteo total, y arma la respuesta paginada. */
export async function paginarYContar<T extends PgSelect, R>(
  consulta: T,
  conteo: Promise<{ total: number }[]>,
  f: { pagina: number; porPagina: number },
  mapear: (fila: Awaited<T>[number]) => R,
): Promise<Pagina<R>> {
  const [filas, [total]] = await Promise.all([paginar(consulta, f.pagina, f.porPagina), conteo])
  return construirPagina(
    (filas as Awaited<T>).map(mapear),
    total?.total ?? 0,
    f.pagina,
    f.porPagina,
  )
}

/** true si una actualización parcial no trae ningún campo (Drizzle falla con "No values to set"). */
export const sinCambios = (datos: object) => Object.values(datos).every((v) => v === undefined)

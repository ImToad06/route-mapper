export interface Pagina<T> {
  datos: T[]
  total: number
  pagina: number
  porPagina: number
  totalPaginas: number
}

export function construirPagina<T>(
  datos: T[],
  total: number,
  pagina: number,
  porPagina: number,
): Pagina<T> {
  return {
    datos,
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
  }
}

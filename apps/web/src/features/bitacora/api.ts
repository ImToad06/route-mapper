import type { ListarBitacoraInput } from '@lh/shared'
import { queryOptions } from '@tanstack/react-query'
import { api, datosDe, descargarArchivo } from '@/lib/api'

export const claveBitacora = ['bitacora'] as const

export const bitacoraQuery = (f: ListarBitacoraInput) =>
  queryOptions({
    queryKey: [...claveBitacora, f],
    queryFn: () => datosDe(api.bitacora.get({ query: f })),
  })

export const exportarBitacora = (f: Omit<ListarBitacoraInput, 'pagina' | 'porPagina'>) => {
  const params = new URLSearchParams()
  if (f.entidad) params.set('entidad', f.entidad)
  if (f.accion) params.set('accion', f.accion)
  if (f.usuarioId) params.set('usuarioId', String(f.usuarioId))
  if (f.desde) params.set('desde', f.desde)
  if (f.hasta) params.set('hasta', f.hasta)
  return descargarArchivo(`/bitacora/exportar?${params.toString()}`, 'bitacora.xlsx')
}

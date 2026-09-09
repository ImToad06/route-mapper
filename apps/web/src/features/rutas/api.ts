import type {
  ActualizarRutaInput,
  CrearRutaInput,
  ListarRutasInput,
  ParadasRutaInput,
} from '@lh/shared'
import { queryOptions } from '@tanstack/react-query'
import { api, datosDe } from '@/lib/api'

export const claveRutas = ['rutas'] as const

export const rutasQuery = (f: ListarRutasInput) =>
  queryOptions({
    queryKey: [...claveRutas, f],
    queryFn: () => datosDe(api.rutas.get({ query: f })),
  })
export const obtenerRutaDetalle = (id: number) => datosDe(api.rutas({ id }).get())
export const rutaQuery = (id: number) =>
  queryOptions({ queryKey: [...claveRutas, 'detalle', id], queryFn: () => obtenerRutaDetalle(id) })
export const historialRutaQuery = (id: number) =>
  queryOptions({
    queryKey: [...claveRutas, 'historial', id],
    queryFn: () => datosDe(api.rutas({ id }).historial.get()),
  })
export const bodegaQuery = queryOptions({
  queryKey: ['configuracion', 'bodega'],
  queryFn: () => datosDe(api.configuracion.bodega.get()),
  staleTime: 10 * 60_000,
})
export const motorRutasQuery = queryOptions({
  queryKey: ['configuracion', 'motor-rutas'],
  queryFn: () => datosDe(api.configuracion['motor-rutas'].get()),
  staleTime: 10 * 60_000,
})

export type RutaDetalle = Awaited<ReturnType<typeof obtenerRutaDetalle>>

export const crearRuta = (d: CrearRutaInput) => api.rutas.post(d)
export const actualizarRuta = (id: number, d: ActualizarRutaInput) => api.rutas({ id }).patch(d)
export const guardarParadas = (id: number, d: ParadasRutaInput) => api.rutas({ id }).paradas.put(d)
export const calcularRecorrido = (id: number) => api.rutas({ id }).calcular.post()
export const optimizarRuta = (id: number) => api.rutas({ id }).optimizar.post()
export const planificarRuta = (id: number) => api.rutas({ id }).planificar.post()
export const volverABorrador = (id: number) => api.rutas({ id }).borrador.post()
export const cancelarRuta = (id: number, motivo?: string) =>
  api.rutas({ id }).cancelar.post({ motivo })

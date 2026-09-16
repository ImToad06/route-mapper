import type {
  ActualizarRutaInput,
  AsignarRutaInput,
  CrearRutaInput,
  FallarParadaInput,
  ListarRutasInput,
  ParadasRutaInput,
  ReasignarRutaInput,
  RechazarRutaInput,
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
export const asignarRuta = (id: number, d: AsignarRutaInput) => api.rutas({ id }).asignar.post(d)
export const reasignarRuta = (id: number, d: ReasignarRutaInput) =>
  api.rutas({ id }).reasignar.post(d)

// ---------- App del conductor (RF-16 … RF-21) ----------

export const misRutasQuery = queryOptions({
  queryKey: [...claveRutas, 'mias'],
  queryFn: () => datosDe(api.rutas.mias.get()),
  staleTime: 15_000,
})
export const aceptarRuta = (id: number) => api.rutas({ id }).aceptar.post()
export const rechazarRuta = (id: number, d: RechazarRutaInput) => api.rutas({ id }).rechazar.post(d)
export const iniciarRuta = (id: number) => api.rutas({ id }).iniciar.post()
export const finalizarRuta = (id: number) => api.rutas({ id }).finalizar.post()
export const entregarParada = (id: number, paradaId: number) =>
  api.rutas({ id }).paradas({ paradaId }).entregar.post()
export const fallarParada = (id: number, paradaId: number, d: FallarParadaInput) =>
  api.rutas({ id }).paradas({ paradaId }).fallar.post(d)

import type {
  ActualizarConductorInput,
  CrearConductorInput,
  DestinoInput,
  ImportarDestinosInput,
  ListarCatalogoInput,
  ListarConductoresInput,
  ListarDestinosInput,
  ProductoInput,
  VehiculoInput,
  ZonaInput,
} from '@lh/shared'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Convierte el resultado de Eden en datos o lanza el error con mensaje de la API. */
async function datosDe<T>(p: Promise<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error || data === null) throw error ?? new Error('Sin respuesta del servidor')
  return data
}

export const claves = {
  vehiculos: ['vehiculos'] as const,
  conductores: ['conductores'] as const,
  productos: ['productos'] as const,
  zonas: ['zonas'] as const,
  destinos: ['destinos'] as const,
}

export const vehiculosQuery = (f: ListarCatalogoInput) =>
  queryOptions({
    queryKey: [...claves.vehiculos, f],
    queryFn: () => datosDe(api.vehiculos.get({ query: f })),
  })
export const crearVehiculo = (d: VehiculoInput) => api.vehiculos.post(d)
export const actualizarVehiculo = (id: number, d: Partial<VehiculoInput>) =>
  api.vehiculos({ id }).patch(d)
export const cambiarActivoVehiculo = (id: number, activo: boolean) =>
  api.vehiculos({ id }).estado.patch({ activo })

export const conductoresQuery = (f: ListarConductoresInput) =>
  queryOptions({
    queryKey: [...claves.conductores, f],
    queryFn: () => datosDe(api.conductores.get({ query: f })),
  })
export const crearConductor = (d: CrearConductorInput) => api.conductores.post(d)
export const actualizarConductor = (id: number, d: ActualizarConductorInput) =>
  api.conductores({ id }).patch(d)
export const cambiarActivoConductor = (id: number, activo: boolean) =>
  api.conductores({ id }).estado.patch({ activo })

export const productosQuery = (f: ListarCatalogoInput) =>
  queryOptions({
    queryKey: [...claves.productos, f],
    queryFn: () => datosDe(api.productos.get({ query: f })),
  })
export const crearProducto = (d: ProductoInput) => api.productos.post(d)
export const actualizarProducto = (id: number, d: Partial<ProductoInput>) =>
  api.productos({ id }).patch(d)
export const cambiarActivoProducto = (id: number, activo: boolean) =>
  api.productos({ id }).estado.patch({ activo })

export const zonasQuery = (f: ListarCatalogoInput) =>
  queryOptions({
    queryKey: [...claves.zonas, f],
    queryFn: () => datosDe(api.zonas.get({ query: f })),
  })
/** Todas las zonas activas, para selectores. */
export const zonasActivasQuery = queryOptions({
  queryKey: [...claves.zonas, 'activas'],
  queryFn: () => datosDe(api.zonas.get({ query: { pagina: 1, porPagina: 100, activo: true } })),
  staleTime: 5 * 60_000,
})
export const crearZona = (d: ZonaInput) => api.zonas.post(d)
export const actualizarZona = (id: number, d: Partial<ZonaInput>) => api.zonas({ id }).patch(d)
export const cambiarActivoZona = (id: number, activo: boolean) =>
  api.zonas({ id }).estado.patch({ activo })

export const destinosQuery = (f: ListarDestinosInput) =>
  queryOptions({
    queryKey: [...claves.destinos, f],
    queryFn: () => datosDe(api.destinos.get({ query: f })),
  })
export const destinosMapaQuery = (zonaId?: number) =>
  queryOptions({
    queryKey: [...claves.destinos, 'mapa', zonaId],
    queryFn: () => datosDe(api.destinos.mapa.get({ query: { zonaId } })),
  })
export const crearDestino = (d: DestinoInput) => api.destinos.post(d)
export const actualizarDestino = (id: number, d: Partial<DestinoInput>) =>
  api.destinos({ id }).patch(d)
export const cambiarActivoDestino = (id: number, activo: boolean) =>
  api.destinos({ id }).estado.patch({ activo })
export const importarDestinos = (d: ImportarDestinosInput) => api.destinos.importar.post(d)
export const geocodificar = (direccion: string) =>
  datosDe(api.geocodificar.get({ query: { direccion } }))

/** Vehículos activos, para selectores. */
export const vehiculosActivosQuery = queryOptions({
  queryKey: [...claves.vehiculos, 'activos'],
  queryFn: () => datosDe(api.vehiculos.get({ query: { pagina: 1, porPagina: 100, activo: true } })),
  staleTime: 60_000,
})

import type { Coordenadas } from '@lh/shared'

export interface Tramo {
  distanciaM: number
  duracionS: number
}

/** Resultado de un recorrido por una secuencia de puntos (bodega → paradas → bodega). */
export interface RecorridoCalculado {
  /** Polilínea codificada (precisión 5), lista para dibujar en el mapa. */
  geometria: string
  distanciaM: number
  duracionS: number
  /** Un tramo por cada par consecutivo de puntos. */
  tramos: Tramo[]
}

export interface ParadaOptimizable {
  id: number
  punto: Coordenadas
  /** Ventana de atención en segundos desde medianoche. */
  ventana?: { inicio: number; fin: number } | null
  /** Tiempo de servicio en el punto, en segundos. */
  servicioS: number
  cargaKg: number
}

export interface ResultadoOptimizacion {
  /** ids de parada en el orden óptimo. */
  orden: number[]
  /** ids que no cupieron por capacidad o ventana horaria. */
  noAsignadas: number[]
  recorrido: RecorridoCalculado
}

/** Motor de rutas: geometría/distancias (OSRM) y optimización del orden (VROOM). */
export interface ProveedorEnrutamiento {
  calcularRecorrido(puntos: Coordenadas[]): Promise<RecorridoCalculado>
  optimizar(
    deposito: Coordenadas,
    paradas: ParadaOptimizable[],
    capacidadKg?: number,
  ): Promise<ResultadoOptimizacion>
}

export const aLonLat = (c: Coordenadas): [number, number] => [c.longitud, c.latitud]

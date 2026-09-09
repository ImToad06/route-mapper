import { describe, expect, test } from 'bun:test'
import { crearProveedorOsrm } from './osrm.ts'
import type { ProveedorEnrutamiento } from './proveedor.ts'
import { crearProveedorVroom } from './vroom.ts'

const bodega = { latitud: 11.0053, longitud: -74.7936 }
const paradas = [
  {
    id: 7,
    punto: { latitud: 11.01, longitud: -74.8 },
    servicioS: 600,
    cargaKg: 100,
    ventana: null,
  },
  {
    id: 8,
    punto: { latitud: 10.99, longitud: -74.79 },
    servicioS: 600,
    cargaKg: 200,
    ventana: { inicio: 28800, fin: 64800 },
  },
  {
    id: 9,
    punto: { latitud: 10.95, longitud: -74.78 },
    servicioS: 600,
    cargaKg: 900,
    ventana: null,
  },
]
const respaldo: ProveedorEnrutamiento = {
  calcularRecorrido: async () => ({ geometria: '', distanciaM: 0, duracionS: 0, tramos: [] }),
  optimizar: async () => ({
    orden: [],
    noAsignadas: [],
    recorrido: { geometria: '', distanciaM: 0, duracionS: 0, tramos: [] },
  }),
}

describe('proveedor VROOM', () => {
  test('envía capacidad, ventanas y servicio; los tramos salen de los acumulados de viaje', async () => {
    let cuerpo: Record<string, unknown> = {}
    const fetchFalso = (async (_url: unknown, init?: RequestInit) => {
      cuerpo = JSON.parse(String(init?.body))
      return Response.json({
        code: 0,
        unassigned: [{ id: 9 }],
        routes: [
          {
            geometry: 'abc',
            distance: 9000,
            duration: 900,
            steps: [
              { type: 'start', arrival: 0, duration: 0, distance: 0 },
              { type: 'job', id: 8, arrival: 300, duration: 300, distance: 3000 },
              { type: 'job', id: 7, arrival: 1200, duration: 600, distance: 6000 },
              { type: 'end', arrival: 2100, duration: 900, distance: 9000 },
            ],
          },
        ],
      })
    }) as unknown as typeof fetch
    const r = await crearProveedorVroom('http://vroom', respaldo, fetchFalso).optimizar(
      bodega,
      paradas,
      1000,
    )
    const vehiculos = cuerpo.vehicles as { capacity: number[] }[]
    const jobs = cuerpo.jobs as {
      id: number
      delivery?: number[]
      time_windows?: number[][]
      service: number
    }[]
    expect(vehiculos[0]?.capacity).toEqual([1000])
    expect(jobs.find((j) => j.id === 8)?.time_windows).toEqual([[28800, 64800]])
    expect(jobs.find((j) => j.id === 9)?.delivery).toEqual([900])
    expect(r.orden).toEqual([8, 7])
    expect(r.noAsignadas).toEqual([9])
    expect(r.recorrido.tramos).toEqual([
      { distanciaM: 3000, duracionS: 300 },
      { distanciaM: 3000, duracionS: 300 },
      { distanciaM: 3000, duracionS: 300 },
    ])
    expect(r.recorrido.duracionS).toBe(900)
  })
  test('si VROOM no responde se usa el respaldo', async () => {
    const fetchFalso = (async () => {
      throw new Error('conexión rechazada')
    }) as unknown as typeof fetch
    const r = await crearProveedorVroom('http://vroom', respaldo, fetchFalso).optimizar(
      bodega,
      paradas,
    )
    expect(r.orden).toEqual([])
  })
})

describe('proveedor OSRM', () => {
  test('trip devuelve el orden de las paradas a partir de waypoint_index', async () => {
    const fetchFalso = (async () =>
      Response.json({
        code: 'Ok',
        trips: [
          {
            geometry: 'g',
            distance: 5000,
            duration: 500,
            legs: [
              { distance: 1000, duration: 100 },
              { distance: 2000, duration: 200 },
              { distance: 2000, duration: 200 },
            ],
          },
        ],
        waypoints: [{ waypoint_index: 0 }, { waypoint_index: 2 }, { waypoint_index: 1 }],
      })) as unknown as typeof fetch
    const r = await crearProveedorOsrm('http://osrm', fetchFalso).optimizar(
      bodega,
      paradas.slice(0, 2),
    )
    expect(r.orden).toEqual([8, 7])
    expect(r.recorrido.tramos).toHaveLength(3)
  })
  test('sin camino: 422 con mensaje en español', async () => {
    const fetchFalso = (async () =>
      Response.json({ code: 'NoRoute', message: 'x' }, { status: 400 })) as unknown as typeof fetch
    await expect(
      crearProveedorOsrm('http://osrm', fetchFalso).calcularRecorrido([
        bodega,
        paradas[0]?.punto ?? bodega,
      ]),
    ).rejects.toThrow(/camino/)
  })
})

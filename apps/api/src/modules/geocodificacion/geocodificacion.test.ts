import { describe, expect, test } from 'bun:test'
import { crearProveedorNominatim, normalizarConsulta } from './geocodificacion.service.ts'

describe('proveedor Nominatim', () => {
  test('construye la consulta acotada a Barranquilla y mapea los resultados', async () => {
    let urlUsada = ''
    const fetchFalso = (async (url: string | URL | Request, init?: RequestInit) => {
      urlUsada = url.toString()
      expect(new Headers(init?.headers).get('user-agent')).toBeTruthy()
      return Response.json([
        { lat: '10.99', lon: '-74.79', display_name: 'Calle 72, Barranquilla' },
      ])
    }) as unknown as typeof fetch
    const proveedor = crearProveedorNominatim(fetchFalso)
    const r = await proveedor.buscar('Calle 72 # 45-23')
    expect(urlUsada).toContain('countrycodes=co')
    expect(urlUsada).toContain('viewbox=')
    expect(r).toEqual([{ etiqueta: 'Calle 72, Barranquilla', latitud: 10.99, longitud: -74.79 }])
  })
  test('un error del servicio se traduce a un mensaje en español', async () => {
    const proveedor = crearProveedorNominatim(
      (async () => new Response('x', { status: 503 })) as unknown as typeof fetch,
    )
    await expect(proveedor.buscar('Calle 1')).rejects.toThrow(/servicio de mapas/)
  })
  test('normaliza la consulta para la caché', () => {
    expect(normalizarConsulta('  Calle   72  # 45-23 ')).toBe('calle 72 # 45-23')
  })
})

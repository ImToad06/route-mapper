import { describe, expect, test } from 'bun:test'
import { app } from './app.ts'

describe('GET /api/salud', () => {
  test('responde ok con la base de datos disponible', async () => {
    const res = await app.handle(new Request('http://localhost/api/salud'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { estado: string; baseDeDatos: string; version: string }
    expect(body.estado).toBe('ok')
    expect(body.baseDeDatos).toBe('ok')
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/)
  })
  test('ruta inexistente responde 404 en español', async () => {
    const res = await app.handle(new Request('http://localhost/api/no-existe'))
    expect(res.status).toBe(404)
    expect(((await res.json()) as { mensaje: string }).mensaje).toBe('Recurso no encontrado.')
  })
})

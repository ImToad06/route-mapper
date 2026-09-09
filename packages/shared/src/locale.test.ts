import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { filaImportacionDestinoSchema } from './index.ts'

describe('mensajes en español', () => {
  test('los mensajes por defecto de Zod salen en español', () => {
    const r = z.object({ edad: z.number() }).safeParse({ edad: 'x' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toMatch(/número|number/i)
    if (!r.success) expect(r.error.issues[0]?.message).not.toMatch(/^Invalid input/)
  })
  test('fila de importación sin cliente', () => {
    const r = filaImportacionDestinoSchema.safeParse({ direccion: 'Calle 1 # 2-3', zona: 'Norte' })
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Falta el nombre del cliente')
  })
})

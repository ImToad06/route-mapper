import { describe, expect, test } from 'bun:test'
import { ESTADOS_RUTA, ETIQUETAS_ESTADO_RUTA, ROLES } from './enums.ts'

describe('enums', () => {
  test('todo estado de ruta tiene etiqueta en español', () => {
    for (const estado of ESTADOS_RUTA) expect(ETIQUETAS_ESTADO_RUTA[estado]).toBeTruthy()
  })
  test('existen los tres roles del artículo (RF-02)', () => {
    expect(ROLES).toEqual(['administrador', 'coordinador', 'conductor'])
  })
})

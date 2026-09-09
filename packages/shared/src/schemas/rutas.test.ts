import { describe, expect, test } from 'bun:test'
import { interpretarHorario, paradasRutaSchema, puedeTransicionar } from './rutas.ts'

describe('máquina de estados de ruta', () => {
  test('el conductor acepta y el coordinador no', () => {
    expect(puedeTransicionar('pendiente_aceptacion', 'asignada', 'conductor')).toBe(true)
    expect(puedeTransicionar('pendiente_aceptacion', 'asignada', 'coordinador')).toBe(false)
  })
  test('el administrador hereda lo del coordinador', () => {
    expect(puedeTransicionar('borrador', 'planificada', 'administrador')).toBe(true)
    expect(puedeTransicionar('en_curso', 'completada', 'administrador')).toBe(false)
  })
  test('los estados terminales no salen', () => {
    expect(puedeTransicionar('completada', 'borrador', 'administrador')).toBe(false)
  })
})

describe('paradas', () => {
  test('rechaza destinos repetidos', () => {
    const r = paradasRutaSchema.safeParse({ paradas: [{ destinoId: 1 }, { destinoId: 1 }] })
    expect(r.success).toBe(false)
  })
})

describe('interpretarHorario', () => {
  test('formatos aceptados', () => {
    expect(interpretarHorario('08:00-18:00')).toEqual({ inicio: 28800, fin: 64800 })
    expect(interpretarHorario('7:30 a 12:00')).toEqual({ inicio: 27000, fin: 43200 })
    expect(interpretarHorario('todo el día')).toBeNull()
    expect(interpretarHorario('18:00-08:00')).toBeNull()
  })
})

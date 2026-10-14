import { describe, expect, test } from 'bun:test'
import { leerCsv, resumir, tabla } from './resumen.ts'

const ENC =
  'fecha,ruta,metodo,paradas,minutos_planificacion,errores_solapamiento,errores_sobrecapacidad,errores_otros,entregas_realizadas,entregas_fallidas'

describe('resumen del piloto', () => {
  test('calcula medias, errores por 100 rutas y variaciones', () => {
    const csv = [
      ENC,
      '2026-01-01,A,manual,10,60,1,0,1,9,1',
      '2026-01-02,B,manual,10,40,0,1,0,10,0',
      '2026-01-01,C,sistema,10,20,0,0,0,9,1',
      '2026-01-02,D,sistema,10,10,0,0,0,10,0',
    ].join('\n')
    const r = resumir(leerCsv(csv))
    expect(r.manual.minutosMedia).toBe(50)
    expect(r.sistema.minutosMedia).toBe(15)
    expect(r.variacionTiempoPct).toBeCloseTo(-70)
    expect(r.manual.erroresPor100Rutas).toBe(150)
    expect(r.sistema.erroresPor100Rutas).toBe(0)
    expect(r.variacionErroresPct).toBeCloseTo(-100)
    expect(r.manual.minutosMediana).toBe(50)
    expect(r.sistema.fallidasPct).toBeCloseTo(5)
    expect(tabla(r)).toContain('| Rutas medidas | 2 | 2 | |')
  })

  test('rechaza encabezados, métodos y números inválidos', () => {
    expect(() => leerCsv('a,b')).toThrow('Encabezado inesperado')
    expect(() => leerCsv(`${ENC}\n2026-01-01,A,otro,1,1,0,0,0,1,0`)).toThrow('metodo')
    expect(() => leerCsv(`${ENC}\n2026-01-01,A,manual,1,x,0,0,0,1,0`)).toThrow(
      'minutos_planificacion',
    )
  })

  test('sin filas de un método devuelve n/d sin lanzar', () => {
    const r = resumir(leerCsv(`${ENC}\n2026-01-01,A,manual,5,30,0,0,0,5,0`))
    expect(r.sistema.rutas).toBe(0)
    expect(tabla(r)).toContain('n/d')
  })
})

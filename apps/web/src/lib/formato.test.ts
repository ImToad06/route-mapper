import { aFechaIso, formatearDuracion, formatearFechaLarga } from './formato'

describe('fechas sin hora', () => {
  it('conserva el día aunque Eden entregue un Date en UTC', () => {
    expect(aFechaIso(new Date('2031-03-10T00:00:00.000Z'))).toBe('2031-03-10')
    expect(aFechaIso('2031-03-10')).toBe('2031-03-10')
    expect(formatearFechaLarga('2030-01-15')).toMatch(/15 de enero de 2030/)
  })
  it('la duración redondea sin producir 60 min', () => {
    expect(formatearDuracion(3590)).toBe('1 h 00 min')
    expect(formatearDuracion(7190)).toBe('2 h 00 min')
    expect(formatearDuracion(1500)).toBe('25 min')
  })
})

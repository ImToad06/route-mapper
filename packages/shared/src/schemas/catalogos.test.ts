import { describe, expect, test } from 'bun:test'
import { crearConductorSchema, destinoSchema, productoSchema, vehiculoSchema } from './catalogos.ts'

describe('catálogos', () => {
  test('placa se normaliza a mayúsculas y valida el formato', () => {
    expect(
      vehiculoSchema.parse({ placa: ' abc123 ', tipo: 'Camión', capacidadKg: '1800' }).placa,
    ).toBe('ABC123')
    expect(
      vehiculoSchema.safeParse({ placa: '12ABC', tipo: 'Camión', capacidadKg: 1 }).success,
    ).toBe(false)
  })
  test('capacidad debe ser positiva', () => {
    expect(
      vehiculoSchema.safeParse({ placa: 'ABC123', tipo: 'Camión', capacidadKg: 0 }).success,
    ).toBe(false)
  })
  test('producto: código en mayúsculas y peso no negativo', () => {
    expect(
      productoSchema.parse({
        codigo: 'arr-25',
        descripcion: 'Arroz',
        unidadMedida: 'unidad',
        pesoKg: '25',
      }).codigo,
    ).toBe('ARR-25')
    expect(
      productoSchema.safeParse({
        codigo: 'ARR',
        descripcion: 'Arroz',
        unidadMedida: 'unidad',
        pesoKg: -1,
      }).success,
    ).toBe(false)
  })
  test('conductor: teléfono vacío se vuelve null (borra el valor)', () => {
    const r = crearConductorSchema.parse({
      nombre: 'Pedro Pérez',
      documento: '12345678',
      licencia: 'C2-123',
      telefono: '',
      correo: 'p@lh.test',
    })
    expect(r.telefono).toBeNull()
  })
  test('destino: exige coordenadas válidas', () => {
    expect(
      destinoSchema.safeParse({
        zonaId: 1,
        nombreCliente: 'Tienda',
        direccion: 'Calle 1 # 2-3',
        latitud: 100,
        longitud: -74,
      }).success,
    ).toBe(false)
  })
})

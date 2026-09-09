import { describe, expect, test } from 'bun:test'
import { cambiarContrasenaSchema, contrasenaSchema, loginSchema } from './auth.ts'

describe('loginSchema', () => {
  test('normaliza el correo', () => {
    const r = loginSchema.parse({ correo: '  Admin@LH.local ', contrasena: 'x' })
    expect(r.correo).toBe('admin@lh.local')
  })
  test('rechaza correo inválido con mensaje en español', () => {
    const r = loginSchema.safeParse({ correo: 'no-es-correo', contrasena: 'x' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Ingrese un correo válido')
  })
})

describe('contrasenaSchema', () => {
  test('exige letras y números', () => {
    expect(contrasenaSchema.safeParse('12345678').success).toBe(false)
    expect(contrasenaSchema.safeParse('abcdefgh').success).toBe(false)
    expect(contrasenaSchema.safeParse('Clave1234').success).toBe(true)
  })
})

describe('cambiarContrasenaSchema', () => {
  test('la confirmación debe coincidir', () => {
    const r = cambiarContrasenaSchema.safeParse({
      contrasenaActual: 'a',
      contrasenaNueva: 'Clave1234',
      confirmacion: 'Clave1235',
    })
    expect(r.success).toBe(false)
  })
})

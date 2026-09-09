import { describe, expect, test } from 'bun:test'
import { ErrorAplicacion } from './errores.ts'
import { limitarPorIp } from './rate-limit.ts'

const ctx = (ip: string) => ({
  request: new Request('http://localhost/api/auth/login'),
  server: { requestIP: () => ({ address: ip }) },
})

describe('limitarPorIp', () => {
  test('bloquea cuando se alcanza el máximo de fallos para la misma IP', () => {
    const l = limitarPorIp({ maximo: 3, ventanaMs: 60_000 })
    for (let i = 0; i < 3; i++) {
      expect(() => l.verificar(ctx('1.1.1.1'))).not.toThrow()
      l.registrarFallo(ctx('1.1.1.1'))
    }
    expect(() => l.verificar(ctx('1.1.1.1'))).toThrow(ErrorAplicacion)
    try {
      l.verificar(ctx('1.1.1.1'))
    } catch (e) {
      expect((e as ErrorAplicacion).status).toBe(429)
    }
  })
  test('un ingreso correcto reinicia la ventana', () => {
    const l = limitarPorIp({ maximo: 1, ventanaMs: 60_000 })
    l.registrarFallo(ctx('2.2.2.2'))
    expect(() => l.verificar(ctx('2.2.2.2'))).toThrow()
    l.reiniciar(ctx('2.2.2.2'))
    expect(() => l.verificar(ctx('2.2.2.2'))).not.toThrow()
  })
  test('otra IP tiene su propia ventana', () => {
    const l = limitarPorIp({ maximo: 1, ventanaMs: 60_000 })
    l.registrarFallo(ctx('3.3.3.3'))
    expect(() => l.verificar(ctx('4.4.4.4'))).not.toThrow()
  })
  test('sin CONFIAR_PROXY la cabecera X-Forwarded-For se ignora', () => {
    const l = limitarPorIp({ maximo: 1, ventanaMs: 60_000 })
    const conXff = (ip: string) => ({
      request: new Request('http://localhost/api/auth/login', {
        headers: { 'x-forwarded-for': ip },
      }),
      server: { requestIP: () => ({ address: '9.9.9.9' }) },
    })
    l.registrarFallo(conXff('10.0.0.1'))
    expect(() => l.verificar(conXff('10.0.0.2'))).toThrow()
  })
})

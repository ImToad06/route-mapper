import type { Rol } from '@lh/shared'
import { jwtVerify, SignJWT } from 'jose'
import { env } from '../config/env.ts'

const clave = new TextEncoder().encode(env.JWT_SECRET)
const EMISOR = 'lh-rutas'

export interface ClaimsAcceso {
  /** id del usuario */
  sub: number
  rol: Rol
  nombre: string
  /** id de la sesión (refresh) que emitió este token */
  sid: string
}

export async function firmarTokenAcceso(claims: ClaimsAcceso): Promise<string> {
  return new SignJWT({ rol: claims.rol, nombre: claims.nombre, sid: claims.sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(claims.sub))
    .setIssuer(EMISOR)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(clave)
}

export async function verificarTokenAcceso(token: string): Promise<ClaimsAcceso | null> {
  try {
    const { payload } = await jwtVerify(token, clave, { issuer: EMISOR })
    if (!payload.sub || typeof payload.rol !== 'string' || typeof payload.sid !== 'string')
      return null
    return {
      sub: Number(payload.sub),
      rol: payload.rol as Rol,
      nombre: String(payload.nombre ?? ''),
      sid: payload.sid,
    }
  } catch {
    return null
  }
}

/** Token de refresco opaco: 32 bytes aleatorios en base64url. Solo se guarda su hash. */
export function generarTokenRefresco(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
}

export function hashTokenRefresco(token: string): string {
  return new Bun.CryptoHasher('sha256').update(token).digest('hex')
}

/** Contraseña temporal legible: 10 caracteres sin ambigüedades, con letra y número garantizados. */
export function generarContrasenaTemporal(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'
  const digitos = '23456789'
  const todo = letras + digitos
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  const chars = Array.from(bytes, (b, i) => {
    if (i === 0) return letras[b % letras.length]
    if (i === 1) return digitos[b % digitos.length]
    return todo[b % todo.length]
  })
  return chars.join('')
}

export function hashContrasena(contrasena: string): Promise<string> {
  return Bun.password.hash(contrasena, { algorithm: 'argon2id', memoryCost: 19456, timeCost: 2 })
}

export function verificarContrasena(contrasena: string, hash: string): Promise<boolean> {
  return Bun.password.verify(contrasena, hash)
}

/** Hash de relleno para que un correo inexistente tarde lo mismo que una contraseña errada. */
export const HASH_FICTICIO = await hashContrasena('relleno-para-tiempo-constante')

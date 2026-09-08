import { sql as drizzleSql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from '../../db/client.ts'
import { VERSION } from '../../lib/version.ts'

export const saludController = new Elysia({ prefix: '/salud', tags: ['Salud'] }).get(
  '/',
  async ({ set }) => {
    let baseDeDatos: 'ok' | 'error' = 'ok'
    try {
      await db.execute(drizzleSql`select 1`)
    } catch {
      baseDeDatos = 'error'
      set.status = 503
    }
    return {
      estado: baseDeDatos === 'ok' ? 'ok' : 'degradado',
      baseDeDatos,
      version: VERSION,
      hora: new Date().toISOString(),
    }
  },
  { detail: { summary: 'Estado del servicio y de la base de datos' } },
)

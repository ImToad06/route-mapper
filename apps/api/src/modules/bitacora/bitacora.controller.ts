import { listarBitacoraSchema } from '@lh/shared'
import { Elysia } from 'elysia'
import { autenticacion } from '../../plugins/auth.ts'
import { listarBitacora } from './bitacora.service.ts'

export const bitacoraController = new Elysia({ prefix: '/bitacora', tags: ['Bitácora'] })
  .use(autenticacion)
  .get('/', ({ query }) => listarBitacora(query), {
    roles: ['administrador'],
    query: listarBitacoraSchema,
    detail: { summary: 'Bitácora de operaciones (solo administrador)' },
  })

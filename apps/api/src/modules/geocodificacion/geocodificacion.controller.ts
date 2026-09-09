import { geocodificarSchema } from '@lh/shared'
import { Elysia } from 'elysia'
import { autenticacion } from '../../plugins/auth.ts'
import { geocodificar } from './geocodificacion.service.ts'

export const geocodificacionController = new Elysia({
  prefix: '/geocodificar',
  tags: ['Geocodificación'],
})
  .use(autenticacion)
  .get('/', async ({ query }) => ({ candidatos: await geocodificar(query.direccion) }), {
    roles: ['coordinador'],
    query: geocodificarSchema,
    detail: { summary: 'Candidatos de coordenadas para una dirección (Nominatim, con caché)' },
  })

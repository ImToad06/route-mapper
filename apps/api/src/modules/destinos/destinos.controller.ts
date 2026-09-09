import {
  actualizarDestinoSchema,
  cambiarActivoSchema,
  destinoSchema,
  idSchema,
  importarDestinosSchema,
  listarDestinosSchema,
} from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './destinos.service.ts'

const params = z.object({ id: idSchema })

export const destinosController = new Elysia({ prefix: '/destinos', tags: ['Destinos'] })
  .use(autenticacion)
  .guard({ roles: ['coordinador'] })
  .get('/', ({ query }) => servicio.listarDestinos(query), {
    query: listarDestinosSchema,
    detail: { summary: 'Listar destinos (RF-10)' },
  })
  .get('/mapa', ({ query }) => servicio.listarDestinosParaMapa(query.zonaId), {
    query: z.object({ zonaId: z.coerce.number().int().positive().optional() }),
    detail: { summary: 'Destinos activos con coordenadas para el mapa' },
  })
  .get('/:id', ({ params: { id } }) => servicio.obtenerDestino(id), { params })
  .post(
    '/',
    async ({ body, usuario, set }) => {
      set.status = 201
      return servicio.crearDestino(body, usuario)
    },
    { body: destinoSchema },
  )
  .post('/importar', ({ body, usuario }) => servicio.importarDestinos(body, usuario), {
    body: importarDestinosSchema,
    detail: {
      summary:
        'Importar destinos desde planilla (máx. 100 filas; geocodifica las que no traen coordenadas)',
    },
  })
  .patch(
    '/:id',
    ({ params: { id }, body, usuario }) => servicio.actualizarDestino(id, body, usuario),
    { params, body: actualizarDestinoSchema },
  )
  .patch(
    '/:id/estado',
    ({ params: { id }, body, usuario }) => servicio.cambiarActivoDestino(id, body.activo, usuario),
    { params, body: cambiarActivoSchema },
  )

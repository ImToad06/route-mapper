import {
  actualizarZonaSchema,
  cambiarActivoSchema,
  idSchema,
  listarCatalogoSchema,
  zonaSchema,
} from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './zonas.service.ts'

const params = z.object({ id: idSchema })

export const zonasController = new Elysia({ prefix: '/zonas', tags: ['Zonas'] })
  .use(autenticacion)
  .guard({ roles: ['coordinador'] })
  .get('/', ({ query }) => servicio.listarZonas(query), {
    query: listarCatalogoSchema,
    detail: { summary: 'Listar zonas (RF-11)' },
  })
  .get('/:id', ({ params: { id } }) => servicio.obtenerZona(id), { params })
  .post(
    '/',
    async ({ body, usuario, set }) => {
      set.status = 201
      return servicio.crearZona(body, usuario)
    },
    { body: zonaSchema },
  )
  .patch(
    '/:id',
    ({ params: { id }, body, usuario }) => servicio.actualizarZona(id, body, usuario),
    { params, body: actualizarZonaSchema },
  )
  .patch(
    '/:id/estado',
    ({ params: { id }, body, usuario }) => servicio.cambiarActivoZona(id, body.activo, usuario),
    { params, body: cambiarActivoSchema },
  )

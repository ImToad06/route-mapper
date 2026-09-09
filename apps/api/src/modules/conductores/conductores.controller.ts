import {
  actualizarConductorSchema,
  cambiarActivoSchema,
  crearConductorSchema,
  idSchema,
  listarConductoresSchema,
} from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './conductores.service.ts'

const params = z.object({ id: idSchema })

export const conductoresController = new Elysia({ prefix: '/conductores', tags: ['Conductores'] })
  .use(autenticacion)
  .get('/', ({ query }) => servicio.listarConductores(query), {
    roles: ['coordinador'],
    query: listarConductoresSchema,
    detail: { summary: 'Listar conductores con su vehículo y disponibilidad (RF-06)' },
  })
  .get('/:id', ({ params: { id } }) => servicio.obtenerConductor(id), {
    roles: ['coordinador'],
    params,
  })
  .guard({ roles: ['administrador'] })
  .post(
    '/',
    async ({ body, usuario, set }) => {
      set.status = 201
      return servicio.crearConductor(body, usuario)
    },
    { body: crearConductorSchema, detail: { summary: 'Registrar conductor y su usuario (RF-04)' } },
  )
  .patch(
    '/:id',
    ({ params: { id }, body, usuario }) => servicio.actualizarConductor(id, body, usuario),
    { params, body: actualizarConductorSchema },
  )
  .patch(
    '/:id/estado',
    ({ params: { id }, body, usuario }) =>
      servicio.cambiarActivoConductor(id, body.activo, usuario),
    { params, body: cambiarActivoSchema },
  )

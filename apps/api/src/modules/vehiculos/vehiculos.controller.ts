import {
  actualizarVehiculoSchema,
  cambiarActivoSchema,
  idSchema,
  listarCatalogoSchema,
  vehiculoSchema,
} from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './vehiculos.service.ts'

const params = z.object({ id: idSchema })

export const vehiculosController = new Elysia({ prefix: '/vehiculos', tags: ['Vehículos'] })
  .use(autenticacion)
  .get('/', ({ query }) => servicio.listarVehiculos(query), {
    roles: ['coordinador'],
    query: listarCatalogoSchema,
    detail: { summary: 'Listar vehículos' },
  })
  .get('/:id', ({ params: { id } }) => servicio.obtenerVehiculo(id), {
    roles: ['coordinador'],
    params,
  })
  .guard({ roles: ['administrador'] })
  .post(
    '/',
    async ({ body, usuario, set }) => {
      set.status = 201
      return servicio.crearVehiculo(body, usuario)
    },
    { body: vehiculoSchema, detail: { summary: 'Registrar vehículo (RF-26, solo administrador)' } },
  )
  .patch(
    '/:id',
    ({ params: { id }, body, usuario }) => servicio.actualizarVehiculo(id, body, usuario),
    {
      params,
      body: actualizarVehiculoSchema,
    },
  )
  .patch(
    '/:id/estado',
    ({ params: { id }, body, usuario }) => servicio.cambiarActivoVehiculo(id, body.activo, usuario),
    {
      params,
      body: cambiarActivoSchema,
    },
  )

import {
  actualizarProductoSchema,
  cambiarActivoSchema,
  idSchema,
  listarCatalogoSchema,
  productoSchema,
} from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './productos.service.ts'

const params = z.object({ id: idSchema })

export const productosController = new Elysia({ prefix: '/productos', tags: ['Productos'] })
  .use(autenticacion)
  .guard({ roles: ['coordinador'] })
  .get('/', ({ query }) => servicio.listarProductos(query), {
    query: listarCatalogoSchema,
    detail: { summary: 'Listar productos' },
  })
  .get('/activos', () => servicio.listarProductosActivos(), {
    detail: { summary: 'Productos activos (sin paginar)' },
  })
  .get('/:id', ({ params: { id } }) => servicio.obtenerProducto(id), { params })
  .post(
    '/',
    async ({ body, usuario, set }) => {
      set.status = 201
      return servicio.crearProducto(body, usuario)
    },
    { body: productoSchema, detail: { summary: 'Registrar producto (RF-07)' } },
  )
  .patch(
    '/:id',
    ({ params: { id }, body, usuario }) => servicio.actualizarProducto(id, body, usuario),
    { params, body: actualizarProductoSchema },
  )
  .patch(
    '/:id/estado',
    ({ params: { id }, body, usuario }) => servicio.cambiarActivoProducto(id, body.activo, usuario),
    { params, body: cambiarActivoSchema },
  )

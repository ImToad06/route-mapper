import { idSchema, listarNotificacionesSchema } from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './notificaciones.service.ts'

const params = z.object({ id: idSchema })

/** RF-19: notificaciones propias del usuario autenticado (panel y app del conductor). */
export const notificacionesController = new Elysia({
  prefix: '/notificaciones',
  tags: ['Notificaciones'],
})
  .use(autenticacion)
  .get(
    '/',
    ({ query, usuario }) => servicio.listarNotificaciones(usuario.sub, query.soloNoLeidas),
    {
      auth: true,
      query: listarNotificacionesSchema,
      detail: { summary: 'Listar mis notificaciones' },
    },
  )
  .get('/contador', ({ usuario }) => servicio.contarNoLeidas(usuario.sub), {
    auth: true,
    detail: { summary: 'Cantidad de notificaciones sin leer (badge, sondeo)' },
  })
  .post(
    '/:id/leer',
    async ({ params: { id }, usuario }) => {
      await servicio.marcarLeida(id, usuario.sub)
      return { mensaje: 'Notificación marcada como leída.' }
    },
    { auth: true, params, detail: { summary: 'Marcar una notificación como leída' } },
  )

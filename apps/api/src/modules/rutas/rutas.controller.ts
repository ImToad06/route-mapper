import {
  actualizarRutaSchema,
  crearRutaSchema,
  idSchema,
  listarRutasSchema,
  paradasRutaSchema,
} from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './rutas.service.ts'

const params = z.object({ id: idSchema })

export const rutasController = new Elysia({ prefix: '/rutas', tags: ['Rutas'] })
  .use(autenticacion)
  .guard({ roles: ['coordinador'] })
  .get('/', ({ query }) => servicio.listarRutas(query), {
    query: listarRutasSchema,
    detail: { summary: 'Listar rutas' },
  })
  .post(
    '/',
    async ({ body, usuario, set }) => {
      set.status = 201
      return servicio.crearRuta(body, usuario)
    },
    { body: crearRutaSchema, detail: { summary: 'Crear ruta en borrador (RF-12)' } },
  )
  .get('/:id', ({ params: { id } }) => servicio.obtenerRuta(id), {
    params,
    detail: { summary: 'Detalle con paradas, productos y recorrido' },
  })
  .get('/:id/historial', ({ params: { id } }) => servicio.obtenerHistorial(id), {
    params,
    detail: { summary: 'Historial de estados (RF-21)' },
  })
  .patch(
    '/:id',
    ({ params: { id }, body, usuario }) => servicio.actualizarRuta(id, body, usuario),
    { params, body: actualizarRutaSchema },
  )
  .put(
    '/:id/paradas',
    ({ params: { id }, body, usuario }) => servicio.reemplazarParadas(id, body, usuario),
    {
      params,
      body: paradasRutaSchema,
      detail: { summary: 'Definir paradas, orden y productos (RF-12, RF-13)' },
    },
  )
  .post('/:id/calcular', ({ params: { id }, usuario }) => servicio.calcularRecorrido(id, usuario), {
    params,
    detail: { summary: 'Calcular geometría y tiempos con el orden actual' },
  })
  .post('/:id/optimizar', ({ params: { id }, usuario }) => servicio.optimizarRuta(id, usuario), {
    params,
    detail: { summary: 'Optimizar el orden (VRP con capacidad y horarios)' },
  })
  .post('/:id/planificar', ({ params: { id }, usuario }) => servicio.planificarRuta(id, usuario), {
    params,
    detail: { summary: 'Marcar como planificada validando capacidad (RF-14)' },
  })
  .post('/:id/borrador', ({ params: { id }, usuario }) => servicio.volverABorrador(id, usuario), {
    params,
    detail: { summary: 'Volver a borrador para editar' },
  })
  .post(
    '/:id/cancelar',
    ({ params: { id }, body, usuario }) => servicio.cancelarRuta(id, body?.motivo, usuario),
    {
      params,
      body: z.object({ motivo: z.string().trim().max(255).optional() }).optional(),
      detail: { summary: 'Cancelar la ruta' },
    },
  )

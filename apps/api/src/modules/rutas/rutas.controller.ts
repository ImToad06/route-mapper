import {
  actualizarRutaSchema,
  asignarRutaSchema,
  crearRutaSchema,
  fallarParadaSchema,
  idSchema,
  listarRutasSchema,
  paradasRutaSchema,
  reasignarRutaSchema,
  rechazarRutaSchema,
} from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './rutas.service.ts'

const params = z.object({ id: idSchema })
const paramsParada = z.object({ id: idSchema, paradaId: idSchema })

export const rutasController = new Elysia({ prefix: '/rutas', tags: ['Rutas'] })
  .use(autenticacion)
  // Detalle e historial: el coordinador/administrador ven cualquier ruta; el conductor solo la suya
  // (el servicio hace ese control de acceso, ya que ambos roles comparten la misma ruta HTTP).
  .guard({ auth: true }, (app) =>
    app
      .get('/:id', ({ params: { id }, usuario }) => servicio.verRuta(id, usuario), {
        params,
        detail: { summary: 'Detalle con paradas, productos y recorrido' },
      })
      .get('/:id/historial', ({ params: { id }, usuario }) => servicio.verHistorial(id, usuario), {
        params,
        detail: { summary: 'Historial de estados (RF-21)' },
      }),
  )
  .guard({ roles: ['coordinador'] }, (app) =>
    app
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
      .post(
        '/:id/calcular',
        ({ params: { id }, usuario }) => servicio.calcularRecorrido(id, usuario),
        { params, detail: { summary: 'Calcular geometría y tiempos con el orden actual' } },
      )
      .post(
        '/:id/optimizar',
        ({ params: { id }, usuario }) => servicio.optimizarRuta(id, usuario),
        { params, detail: { summary: 'Optimizar el orden (VRP con capacidad y horarios)' } },
      )
      .post(
        '/:id/planificar',
        ({ params: { id }, usuario }) => servicio.planificarRuta(id, usuario),
        { params, detail: { summary: 'Marcar como planificada validando capacidad (RF-14)' } },
      )
      .post(
        '/:id/borrador',
        ({ params: { id }, usuario }) => servicio.volverABorrador(id, usuario),
        { params, detail: { summary: 'Volver a borrador para editar' } },
      )
      .post(
        '/:id/cancelar',
        ({ params: { id }, body, usuario }) => servicio.cancelarRuta(id, body.motivo, usuario),
        {
          params,
          body: z.object({ motivo: z.string().trim().max(255).optional() }).default({}),
          detail: { summary: 'Cancelar la ruta' },
        },
      )
      .post(
        '/:id/asignar',
        ({ params: { id }, body, usuario }) => servicio.asignarRuta(id, body, usuario),
        {
          params,
          body: asignarRutaSchema,
          detail: { summary: 'Asignar conductor y vehículo (RF-15)' },
        },
      )
      .post(
        '/:id/reasignar',
        ({ params: { id }, body, usuario }) => servicio.reasignarRuta(id, body, usuario),
        {
          params,
          body: reasignarRutaSchema,
          detail: { summary: 'Reasignar a otro conductor (RF-17)' },
        },
      ),
  )
  .guard({ roles: ['conductor'] }, (app) =>
    app
      .get('/mias', ({ usuario }) => servicio.misRutas(usuario), {
        detail: { summary: 'Rutas activas del conductor autenticado (Inicio, Mi ruta)' },
      })
      .post('/:id/aceptar', ({ params: { id }, usuario }) => servicio.aceptarRuta(id, usuario), {
        params,
        detail: { summary: 'El conductor acepta la ruta asignada' },
      })
      .post(
        '/:id/rechazar',
        ({ params: { id }, body, usuario }) => servicio.rechazarRuta(id, body, usuario),
        {
          params,
          body: rechazarRutaSchema,
          detail: { summary: 'El conductor rechaza la ruta (RF-18)' },
        },
      )
      .post('/:id/iniciar', ({ params: { id }, usuario }) => servicio.iniciarRuta(id, usuario), {
        params,
        detail: { summary: 'El conductor inicia el recorrido' },
      })
      .post(
        '/:id/paradas/:paradaId/entregar',
        ({ params: { id, paradaId }, usuario }) => servicio.entregarParada(id, paradaId, usuario),
        { params: paramsParada, detail: { summary: 'Marcar una parada como entregada (RF-20)' } },
      )
      .post(
        '/:id/paradas/:paradaId/fallar',
        ({ params: { id, paradaId }, body, usuario }) =>
          servicio.fallarParada(id, paradaId, body, usuario),
        {
          params: paramsParada,
          body: fallarParadaSchema,
          detail: { summary: 'Reportar una novedad en una parada (RF-20)' },
        },
      )
      .post(
        '/:id/finalizar',
        ({ params: { id }, usuario }) => servicio.finalizarRuta(id, usuario),
        {
          params,
          detail: { summary: 'Finalizar la ruta (RF-21)' },
        },
      ),
  )

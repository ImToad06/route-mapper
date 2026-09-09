import { coordenadasColombiaSchema } from '@lh/shared'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { autenticacion } from '../../plugins/auth.ts'
import { motorConfigurado } from '../enrutamiento/enrutamiento.service.ts'
import * as servicio from './configuracion.service.ts'

export const bodegaSchema = coordenadasColombiaSchema.extend({
  direccion: z
    .string({ error: 'Ingrese la dirección de la bodega' })
    .trim()
    .min(5, 'Ingrese la dirección de la bodega')
    .max(255),
})

export const configuracionController = new Elysia({
  prefix: '/configuracion',
  tags: ['Configuración'],
})
  .use(autenticacion)
  .get('/bodega', () => servicio.obtenerBodega(), {
    roles: ['coordinador'],
    detail: { summary: 'Ubicación de la bodega' },
  })
  .get('/motor-rutas', () => ({ disponible: motorConfigurado() }), {
    roles: ['coordinador'],
    detail: { summary: 'Indica si OSRM/VROOM están configurados' },
  })
  .put('/bodega', ({ body, usuario }) => servicio.guardarBodega(body, usuario), {
    roles: ['administrador'],
    body: bodegaSchema,
    detail: { summary: 'Registrar la bodega (solo administrador)' },
  })

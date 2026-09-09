import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { env } from './config/env.ts'
import { VERSION } from './lib/version.ts'
import { authController } from './modules/auth/auth.controller.ts'
import { bitacoraController } from './modules/bitacora/bitacora.controller.ts'
import { conductoresController } from './modules/conductores/conductores.controller.ts'
import { destinosController } from './modules/destinos/destinos.controller.ts'
import { geocodificacionController } from './modules/geocodificacion/geocodificacion.controller.ts'
import { productosController } from './modules/productos/productos.controller.ts'
import { saludController } from './modules/salud/salud.controller.ts'
import { usuariosController } from './modules/usuarios/usuarios.controller.ts'
import { vehiculosController } from './modules/vehiculos/vehiculos.controller.ts'
import { zonasController } from './modules/zonas/zonas.controller.ts'
import { manejadorErrores } from './plugins/errores.ts'
import { registroPeticiones } from './plugins/registro.ts'

export const app = new Elysia({ prefix: '/api' })
  .use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()), credentials: true }))
  .use(
    openapi({
      path: '/docs',
      mapJsonSchema: { zod: z.toJSONSchema },
      documentation: {
        info: {
          title: 'API — Gestión y asignación de rutas, L&H Distribuciones',
          version: VERSION,
          description: 'Servicios REST del sistema de información logística.',
        },
      },
    }),
  )
  .use(manejadorErrores)
  .use(registroPeticiones)
  .use(saludController)
  .use(authController)
  .use(usuariosController)
  .use(bitacoraController)
  .use(vehiculosController)
  .use(conductoresController)
  .use(productosController)
  .use(zonasController)
  .use(destinosController)
  .use(geocodificacionController)

export type App = typeof app

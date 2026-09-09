import { app } from './app.ts'
import { env } from './config/env.ts'
import { logger } from './lib/logger.ts'

// idleTimeout: Bun cierra conexiones sin respuesta a los 30 s por defecto; importaciones y reportes tardan más.
app.listen({ port: env.API_PORT, idleTimeout: 120 })
logger.info(`API escuchando en http://localhost:${env.API_PORT}/api — docs en /api/docs`)

export type { App } from './app.ts'

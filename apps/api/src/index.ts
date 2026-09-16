import { app } from './app.ts'
import { env } from './config/env.ts'
import { logger } from './lib/logger.ts'

// idleTimeout: Bun cierra conexiones sin respuesta a los 30 s por defecto; importaciones y reportes tardan más.
// maxRequestBodySize: el default de Bun (128 MiB) es excesivo para esta API — todo el cuerpo es JSON
// pequeño (la importación de destinos ya limita a 100 filas); 2 MiB deja margen sin exponer a payloads gigantes.
app.listen({ port: env.API_PORT, idleTimeout: 120, maxRequestBodySize: 2 * 1024 * 1024 })
logger.info(`API escuchando en http://localhost:${env.API_PORT}/api — docs en /api/docs`)

export type { App } from './app.ts'

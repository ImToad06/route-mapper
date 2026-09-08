import { app } from './app.ts'
import { env } from './config/env.ts'
import { logger } from './lib/logger.ts'

app.listen(env.API_PORT)
logger.info(`API escuchando en http://localhost:${env.API_PORT}/api — docs en /api/docs`)

export type { App } from './app.ts'

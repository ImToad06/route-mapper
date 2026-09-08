import pino from 'pino'
import { env, esProduccion } from '../config/env.ts'

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(esProduccion ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
})

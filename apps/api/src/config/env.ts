import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ error: 'DATABASE_URL debe ser una URL de PostgreSQL válida' }),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** Intentos fallidos de ingreso permitidos por IP cada 15 minutos (RNF-04). */
  LOGIN_MAX_INTENTOS: z.coerce.number().int().positive().default(10),
  /** `auto`: la cookie es Secure solo si la petición llegó por HTTPS (X-Forwarded-Proto o URL). */
  COOKIE_SEGURA: z.enum(['auto', 'true', 'false']).default('auto'),
  /** true cuando la API está detrás de Nginx: se toma la IP real del último salto de X-Forwarded-For. */
  CONFIAR_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OSRM_URL: z.url().optional(),
  VROOM_URL: z.url().optional(),
  NOMINATIM_URL: z.url().default('https://nominatim.openstreetmap.org'),
  NOMINATIM_USER_AGENT: z.string().default('lh-rutas/0.1'),
})

export type Env = z.infer<typeof envSchema>

const resultado = envSchema.safeParse(process.env)
if (!resultado.success) {
  console.error('Variables de entorno inválidas:')
  for (const issue of resultado.error.issues)
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  process.exit(1)
}

export const env: Env = resultado.data
export const esProduccion = env.NODE_ENV === 'production'

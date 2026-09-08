import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../config/env.ts'
import * as schema from './schema/index.ts'

export const sql = postgres(env.DATABASE_URL, { max: 10, onnotice: () => {} })
export const db = drizzle(sql, { schema, casing: 'snake_case' })
export type Db = typeof db

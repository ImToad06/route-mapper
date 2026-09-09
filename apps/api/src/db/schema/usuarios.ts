import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { rolEnum } from './enums.ts'

/** Roles (RF-02). Catálogo fijo poblado por el seed. */
export const rol = pgTable('rol', {
  id: serial().primaryKey(),
  nombre: rolEnum().notNull().unique(),
})

/** Usuarios del sistema (RF-01, RF-25). */
export const usuario = pgTable('usuario', {
  id: serial().primaryKey(),
  rolId: integer()
    .notNull()
    .references(() => rol.id),
  nombre: varchar({ length: 120 }).notNull(),
  correo: varchar({ length: 160 }).notNull().unique(),
  contrasenaHash: varchar({ length: 255 }).notNull(),
  debeCambiarContrasena: boolean().notNull().default(false),
  activo: boolean().notNull().default(true),
  creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

/** Sesiones con refresh token rotativo (RF-03, RNF-03). */
export const sesion = pgTable(
  'sesion',
  {
    id: uuid().primaryKey().defaultRandom(),
    usuarioId: integer()
      .notNull()
      .references(() => usuario.id, { onDelete: 'cascade' }),
    refreshTokenHash: varchar({ length: 255 }).notNull(),
    userAgent: varchar({ length: 255 }),
    ip: varchar({ length: 64 }),
    expiraEn: timestamp({ withTimezone: true }).notNull(),
    revocadaEn: timestamp({ withTimezone: true }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sesion_refresh_token_hash_idx').on(t.refreshTokenHash),
    index('sesion_usuario_id_idx').on(t.usuarioId),
  ],
)

/** Registro de accesos e intentos de acceso (RNF-04). */
export const intentoAcceso = pgTable('intento_acceso', {
  id: serial().primaryKey(),
  correo: varchar({ length: 160 }).notNull(),
  exito: boolean().notNull(),
  ip: varchar({ length: 64 }),
  userAgent: varchar({ length: 255 }),
  fechaHora: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const rolRelations = relations(rol, ({ many }) => ({ usuarios: many(usuario) }))
export const usuarioRelations = relations(usuario, ({ one, many }) => ({
  rol: one(rol, { fields: [usuario.rolId], references: [rol.id] }),
  sesiones: many(sesion),
}))
export const sesionRelations = relations(sesion, ({ one }) => ({
  usuario: one(usuario, { fields: [sesion.usuarioId], references: [usuario.id] }),
}))

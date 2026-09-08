import { relations } from 'drizzle-orm'
import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { ruta } from './rutas.ts'
import { usuario } from './usuarios.ts'

/** Bitácora de operaciones de los usuarios (RF-27). */
export const bitacora = pgTable('bitacora', {
  id: serial().primaryKey(),
  usuarioId: integer().references(() => usuario.id, { onDelete: 'set null' }),
  accion: varchar({ length: 40 }).notNull(),
  entidad: varchar({ length: 40 }).notNull(),
  entidadId: integer(),
  descripcion: text().notNull(),
  fechaHora: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

/** Notificaciones en la aplicación (RF-18). */
export const notificacion = pgTable('notificacion', {
  id: serial().primaryKey(),
  usuarioId: integer()
    .notNull()
    .references(() => usuario.id, { onDelete: 'cascade' }),
  tipo: varchar({ length: 40 }).notNull(),
  titulo: varchar({ length: 120 }).notNull(),
  cuerpo: varchar({ length: 500 }).notNull(),
  rutaId: integer().references(() => ruta.id, { onDelete: 'cascade' }),
  leidaEn: timestamp({ withTimezone: true }),
  creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const bitacoraRelations = relations(bitacora, ({ one }) => ({
  usuario: one(usuario, { fields: [bitacora.usuarioId], references: [usuario.id] }),
}))
export const notificacionRelations = relations(notificacion, ({ one }) => ({
  usuario: one(usuario, { fields: [notificacion.usuarioId], references: [usuario.id] }),
  ruta: one(ruta, { fields: [notificacion.rutaId], references: [ruta.id] }),
}))

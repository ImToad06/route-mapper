import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { disponibilidadEnum, unidadMedidaEnum } from './enums.ts'
import { usuario } from './usuarios.ts'

/** Vehículos de la flota (RF-26). */
export const vehiculo = pgTable(
  'vehiculo',
  {
    id: serial().primaryKey(),
    placa: varchar({ length: 10 }).notNull().unique(),
    tipo: varchar({ length: 60 }).notNull(),
    capacidadKg: numeric({ precision: 10, scale: 2 }).notNull(),
    activo: boolean().notNull().default(true),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('vehiculo_capacidad_positiva', sql`${t.capacidadKg} > 0`)],
)

/** Conductores (RF-04, RF-05, RF-06). Cada conductor está ligado a un usuario con rol `conductor`. */
export const conductor = pgTable('conductor', {
  id: serial().primaryKey(),
  usuarioId: integer()
    .notNull()
    .unique()
    .references(() => usuario.id),
  nombre: varchar({ length: 120 }).notNull(),
  documento: varchar({ length: 30 }).notNull().unique(),
  licencia: varchar({ length: 30 }).notNull(),
  telefono: varchar({ length: 30 }),
  disponibilidad: disponibilidadEnum().notNull().default('disponible'),
  vehiculoId: integer().references(() => vehiculo.id, { onDelete: 'set null' }),
  activo: boolean().notNull().default(true),
  creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

/** Zonas geográficas de entrega (RF-11). */
export const zona = pgTable('zona', {
  id: serial().primaryKey(),
  nombre: varchar({ length: 80 }).notNull().unique(),
  descripcion: varchar({ length: 255 }),
  activo: boolean().notNull().default(true),
})

/** Puntos de entrega / clientes (RF-10). Coordenadas para el mapa y el motor de rutas. */
export const destino = pgTable('destino', {
  id: serial().primaryKey(),
  zonaId: integer()
    .notNull()
    .references(() => zona.id),
  nombreCliente: varchar({ length: 120 }).notNull(),
  direccion: varchar({ length: 255 }).notNull(),
  horarioAtencion: varchar({ length: 120 }),
  telefono: varchar({ length: 30 }),
  latitud: doublePrecision().notNull(),
  longitud: doublePrecision().notNull(),
  /** true cuando el coordinador confirmó o movió el marcador; false si vino de geocodificación automática. */
  ubicacionVerificada: boolean().notNull().default(false),
  activo: boolean().notNull().default(true),
  creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  actualizadoEn: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

/** Caché de geocodificación para no repetir consultas a Nominatim (política de uso: 1 req/s). */
export const geocodificacionCache = pgTable('geocodificacion_cache', {
  id: serial().primaryKey(),
  consulta: varchar({ length: 300 }).notNull().unique(),
  resultados: jsonb().$type<{ etiqueta: string; latitud: number; longitud: number }[]>().notNull(),
  creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

/** Productos o mercancías a distribuir (RF-07). */
export const producto = pgTable(
  'producto',
  {
    id: serial().primaryKey(),
    codigo: varchar({ length: 40 }).notNull().unique(),
    descripcion: varchar({ length: 160 }).notNull(),
    unidadMedida: unidadMedidaEnum().notNull().default('unidad'),
    pesoKg: numeric({ precision: 10, scale: 3 }).notNull(),
    activo: boolean().notNull().default(true),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('producto_peso_no_negativo', sql`${t.pesoKg} >= 0`)],
)

/** Parámetros globales (dirección y coordenadas de la bodega, etc.). */
export const configuracion = pgTable('configuracion', {
  clave: varchar({ length: 60 }).primaryKey(),
  valor: varchar({ length: 500 }).notNull(),
  descripcion: varchar({ length: 255 }),
  actualizadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const vehiculoRelations = relations(vehiculo, ({ many }) => ({
  conductores: many(conductor),
}))
export const conductorRelations = relations(conductor, ({ one }) => ({
  usuario: one(usuario, { fields: [conductor.usuarioId], references: [usuario.id] }),
  vehiculo: one(vehiculo, { fields: [conductor.vehiculoId], references: [vehiculo.id] }),
}))
export const zonaRelations = relations(zona, ({ many }) => ({ destinos: many(destino) }))
export const destinoRelations = relations(destino, ({ one }) => ({
  zona: one(zona, { fields: [destino.zonaId], references: [zona.id] }),
}))

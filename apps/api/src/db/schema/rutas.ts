import { ESTADOS_RUTA_TERMINALES } from '@lh/shared'
import { relations, sql } from 'drizzle-orm'
import {
  check,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'
import { conductor, destino, producto, vehiculo } from './catalogos.ts'
import { estadoParadaEnum, estadoRutaEnum, tipoNovedadEnum } from './enums.ts'
import { usuario } from './usuarios.ts'

const estadosTerminalesSql = sql.join(
  ESTADOS_RUTA_TERMINALES.map((estado) => sql.raw(`'${estado}'`)),
  sql`, `,
)

/** Ruta de distribución (RF-12 … RF-21). */
export const ruta = pgTable(
  'ruta',
  {
    id: serial().primaryKey(),
    codigo: varchar({ length: 30 }).notNull().unique(),
    fecha: date().notNull(),
    estado: estadoRutaEnum().notNull().default('borrador'),
    conductorId: integer().references(() => conductor.id),
    vehiculoId: integer().references(() => vehiculo.id),
    creadoPor: integer()
      .notNull()
      .references(() => usuario.id),
    observaciones: text(),
    // Resultado del motor de rutas (OSRM / VROOM), cacheado.
    distanciaM: integer(),
    duracionS: integer(),
    geometria: text(),
    optimizadaEn: timestamp({ withTimezone: true }),
    // Marcas de tiempo del ciclo de vida (RF-21).
    asignadaEn: timestamp({ withTimezone: true }),
    aceptadaEn: timestamp({ withTimezone: true }),
    iniciadaEn: timestamp({ withTimezone: true }),
    finalizadaEn: timestamp({ withTimezone: true }),
    motivoRechazo: varchar({ length: 255 }),
    creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // RF-16: un conductor no puede tener dos rutas activas el mismo día.
    // Los estados terminales salen de @lh/shared para tener una sola fuente de verdad.
    uniqueIndex('ruta_conductor_fecha_activa_idx')
      .on(t.conductorId, t.fecha)
      .where(sql`${t.estado} NOT IN (${estadosTerminalesSql})`),
  ],
)

/** Paradas de una ruta en orden (RF-13, RF-20). */
export const rutaParada = pgTable(
  'ruta_parada',
  {
    id: serial().primaryKey(),
    rutaId: integer()
      .notNull()
      .references(() => ruta.id, { onDelete: 'cascade' }),
    destinoId: integer()
      .notNull()
      .references(() => destino.id),
    orden: integer().notNull(),
    estadoEntrega: estadoParadaEnum().notNull().default('pendiente'),
    horaConfirmacion: timestamp({ withTimezone: true }),
    novedadTipo: tipoNovedadEnum(),
    novedadNota: varchar({ length: 500 }),
    etaS: integer(),
    distanciaDesdeAnteriorM: integer(),
  },
  (t) => [
    unique('ruta_parada_orden_unico').on(t.rutaId, t.orden),
    unique('ruta_parada_destino_unico').on(t.rutaId, t.destinoId),
    check('ruta_parada_orden_positivo', sql`${t.orden} >= 1`),
  ],
)

/** Productos y cantidades por parada (RF-08, RF-09). */
export const paradaProducto = pgTable(
  'parada_producto',
  {
    id: serial().primaryKey(),
    rutaParadaId: integer()
      .notNull()
      .references(() => rutaParada.id, { onDelete: 'cascade' }),
    productoId: integer()
      .notNull()
      .references(() => producto.id),
    cantidad: numeric({ precision: 10, scale: 2 }).notNull(),
  },
  (t) => [
    unique('parada_producto_unico').on(t.rutaParadaId, t.productoId),
    check('parada_producto_cantidad_positiva', sql`${t.cantidad} > 0`),
  ],
)

/** Historial de cambios de estado de rutas y paradas (RF-21, RF-27). */
export const rutaHistorialEstado = pgTable('ruta_historial_estado', {
  id: serial().primaryKey(),
  rutaId: integer()
    .notNull()
    .references(() => ruta.id, { onDelete: 'cascade' }),
  paradaId: integer().references(() => rutaParada.id, { onDelete: 'cascade' }),
  estadoAnterior: varchar({ length: 30 }),
  estadoNuevo: varchar({ length: 30 }).notNull(),
  usuarioId: integer().references(() => usuario.id),
  nota: varchar({ length: 500 }),
  fechaHora: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const rutaRelations = relations(ruta, ({ one, many }) => ({
  conductor: one(conductor, { fields: [ruta.conductorId], references: [conductor.id] }),
  vehiculo: one(vehiculo, { fields: [ruta.vehiculoId], references: [vehiculo.id] }),
  creador: one(usuario, { fields: [ruta.creadoPor], references: [usuario.id] }),
  paradas: many(rutaParada),
  historial: many(rutaHistorialEstado),
}))
export const rutaParadaRelations = relations(rutaParada, ({ one, many }) => ({
  ruta: one(ruta, { fields: [rutaParada.rutaId], references: [ruta.id] }),
  destino: one(destino, { fields: [rutaParada.destinoId], references: [destino.id] }),
  productos: many(paradaProducto),
}))
export const paradaProductoRelations = relations(paradaProducto, ({ one }) => ({
  parada: one(rutaParada, { fields: [paradaProducto.rutaParadaId], references: [rutaParada.id] }),
  producto: one(producto, { fields: [paradaProducto.productoId], references: [producto.id] }),
}))
export const rutaHistorialEstadoRelations = relations(rutaHistorialEstado, ({ one }) => ({
  ruta: one(ruta, { fields: [rutaHistorialEstado.rutaId], references: [ruta.id] }),
}))

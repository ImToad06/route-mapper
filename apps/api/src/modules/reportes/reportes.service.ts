import { ESTADOS_RUTA, type EstadoRuta, type PeriodoReporteInput } from '@lh/shared'
import { and, count, eq, gte, isNotNull, lte, type SQL, sql } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { conductor, destino, ruta, rutaParada, zona } from '../../db/schema/index.ts'
import { contar } from '../../lib/catalogo.ts'

/**
 * Fecha de hoy en la zona horaria del proceso (TZ=America/Bogota, ver .env): `toISOString()` daría
 * la fecha en UTC, que ya cambió de día entre las 19:00 y la medianoche hora de Barranquilla.
 */
const hoyIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Rutas agrupadas por estado con una sola consulta; los estados sin rutas quedan en 0. */
const conteoPorEstado = (filas: { estado: EstadoRuta; total: number }[]) => {
  const conteo = Object.fromEntries(ESTADOS_RUTA.map((e) => [e, 0])) as Record<EstadoRuta, number>
  for (const f of filas) conteo[f.estado] = f.total
  return conteo
}

/** Cuenta paradas por resultado con `count(*) filter`, para no traer una fila por parada (RNF-05). */
const cuentaParadas = (estado: 'entregada' | 'pendiente' | 'fallida') =>
  sql<number>`count(*) filter (where ${rutaParada.estadoEntrega} = ${estado})`.mapWith(Number)

const rutasPorEstado = (condicion: SQL | undefined) =>
  db
    .select({ estado: ruta.estado, total: count() })
    .from(ruta)
    .where(condicion)
    .groupBy(ruta.estado)

const totalesParadas = async (condicion: SQL | undefined) => {
  const [fila] = await db
    .select({
      entregadas: cuentaParadas('entregada'),
      pendientes: cuentaParadas('pendiente'),
      fallidas: cuentaParadas('fallida'),
    })
    .from(rutaParada)
    .innerJoin(ruta, eq(ruta.id, rutaParada.rutaId))
    .where(condicion)
  return {
    entregadas: fila?.entregadas ?? 0,
    pendientes: fila?.pendientes ?? 0,
    fallidas: fila?.fallidas ?? 0,
  }
}

/** Minutos que lleva una ruta pendiente de aceptación sin respuesta del conductor. */
const MINUTOS_DEMORA_ACEPTACION = 30

/**
 * Resumen del día para el panel (RF-22, caso de uso "monitorear el estado general de las entregas"):
 * rutas de hoy por estado, paradas por resultado, conductores en ruta y asignaciones sin responder.
 */
export async function resumenHoy() {
  const fecha = hoyIso()
  const hoy = eq(ruta.fecha, fecha)
  const [porEstado, paradas] = await Promise.all([rutasPorEstado(hoy), totalesParadas(hoy)])

  const conteoConductores = (disponibilidad: 'en_ruta' | 'disponible') =>
    db
      .select({ total: contar() })
      .from(conductor)
      .where(and(eq(conductor.disponibilidad, disponibilidad), eq(conductor.activo, true)))
  const [[conductoresEnRuta], [conductoresDisponibles]] = await Promise.all([
    conteoConductores('en_ruta'),
    conteoConductores('disponible'),
  ])

  const limite = new Date(Date.now() - MINUTOS_DEMORA_ACEPTACION * 60_000)
  const demoradas = await db
    .select({
      id: ruta.id,
      codigo: ruta.codigo,
      asignadaEn: ruta.asignadaEn,
      conductorNombre: conductor.nombre,
    })
    .from(ruta)
    .innerJoin(conductor, eq(conductor.id, ruta.conductorId))
    .where(and(eq(ruta.estado, 'pendiente_aceptacion'), lte(ruta.asignadaEn, limite)))
    .orderBy(ruta.asignadaEn)

  return {
    fecha,
    rutasPorEstado: conteoPorEstado(porEstado),
    paradas,
    conductoresEnRuta: conductoresEnRuta?.total ?? 0,
    conductoresDisponibles: conductoresDisponibles?.total ?? 0,
    demoradas,
  }
}

/** RF-22: rutas por estado y entregas realizadas/pendientes/fallidas en un periodo. */
export async function reporteRutas(f: PeriodoReporteInput) {
  const condicion = and(gte(ruta.fecha, f.desde), lte(ruta.fecha, f.hasta))
  const [porEstado, paradas] = await Promise.all([
    rutasPorEstado(condicion),
    totalesParadas(condicion),
  ])

  return {
    desde: f.desde,
    hasta: f.hasta,
    totalRutas: porEstado.reduce((acc, r) => acc + r.total, 0),
    rutasPorEstado: conteoPorEstado(porEstado),
    entregas: {
      realizadas: paradas.entregadas,
      pendientes: paradas.pendientes,
      fallidas: paradas.fallidas,
    },
  }
}

/** RF-23: desempeño por conductor en un periodo (rutas, paradas, novedades y aceptación a tiempo). */
export async function reporteConductores(f: PeriodoReporteInput) {
  const condicion = and(
    gte(ruta.fecha, f.desde),
    lte(ruta.fecha, f.hasta),
    isNotNull(ruta.conductorId),
  )
  const cuentaRutas = (estado: EstadoRuta) =>
    sql<number>`count(*) filter (where ${ruta.estado} = ${estado})`.mapWith(Number)

  const [rutasPorConductor, paradasPorConductor] = await Promise.all([
    db
      .select({
        conductorId: ruta.conductorId,
        totalRutas: count(),
        completadas: cuentaRutas('completada'),
        incompletas: cuentaRutas('incompleta'),
        canceladas: cuentaRutas('cancelada'),
        minutosAceptacionProm: sql<
          number | null
        >`avg(extract(epoch from (${ruta.aceptadaEn} - ${ruta.asignadaEn})) / 60) filter (where ${ruta.asignadaEn} is not null and ${ruta.aceptadaEn} is not null)`.mapWith(
          (v) => (v == null ? null : Math.round(Number(v))),
        ),
      })
      .from(ruta)
      .where(condicion)
      .groupBy(ruta.conductorId),
    db
      .select({
        conductorId: ruta.conductorId,
        paradasEntregadas: cuentaParadas('entregada'),
        paradasFallidas: cuentaParadas('fallida'),
        novedades:
          sql<number>`count(*) filter (where ${rutaParada.novedadTipo} is not null)`.mapWith(
            Number,
          ),
      })
      .from(rutaParada)
      .innerJoin(ruta, eq(ruta.id, rutaParada.rutaId))
      .where(condicion)
      .groupBy(ruta.conductorId),
  ])
  if (rutasPorConductor.length === 0) return []

  const nombres = await db.select({ id: conductor.id, nombre: conductor.nombre }).from(conductor)
  const nombrePorId = new Map(nombres.map((c) => [c.id, c.nombre]))
  const paradasPorId = new Map(paradasPorConductor.map((p) => [p.conductorId, p]))

  return rutasPorConductor
    .map((r) => {
      const p = paradasPorId.get(r.conductorId)
      return {
        conductorId: r.conductorId as number,
        nombre: nombrePorId.get(r.conductorId as number) ?? '',
        totalRutas: r.totalRutas,
        completadas: r.completadas,
        incompletas: r.incompletas,
        canceladas: r.canceladas,
        paradasEntregadas: p?.paradasEntregadas ?? 0,
        paradasFallidas: p?.paradasFallidas ?? 0,
        novedades: p?.novedades ?? 0,
        minutosAceptacionProm: r.minutosAceptacionProm,
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** RF-23: desempeño por zona de distribución en un periodo. */
export async function reporteZonas(f: PeriodoReporteInput) {
  const condicion = and(gte(ruta.fecha, f.desde), lte(ruta.fecha, f.hasta))
  const filas = await db
    .select({
      zonaId: zona.id,
      nombre: zona.nombre,
      totalParadas: count(),
      entregadas: cuentaParadas('entregada'),
      fallidas: cuentaParadas('fallida'),
      pendientes: cuentaParadas('pendiente'),
    })
    .from(rutaParada)
    .innerJoin(ruta, eq(ruta.id, rutaParada.rutaId))
    .innerJoin(destino, eq(destino.id, rutaParada.destinoId))
    .innerJoin(zona, eq(zona.id, destino.zonaId))
    .where(condicion)
    .groupBy(zona.id, zona.nombre)
    .orderBy(zona.nombre)
  return filas
}

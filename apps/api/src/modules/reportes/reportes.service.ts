import { ESTADOS_RUTA, type EstadoRuta, type PeriodoReporteInput } from '@lh/shared'
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm'
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

const conteoPorEstado = (rutas: { estado: EstadoRuta }[]) =>
  Object.fromEntries(
    ESTADOS_RUTA.map((e) => [e, rutas.filter((r) => r.estado === e).length]),
  ) as Record<EstadoRuta, number>

/** Minutos que lleva una ruta pendiente de aceptación sin respuesta del conductor. */
const MINUTOS_DEMORA_ACEPTACION = 30

/**
 * Resumen del día para el panel (RF-22, caso de uso "monitorear el estado general de las entregas"):
 * rutas de hoy por estado, paradas por resultado, conductores en ruta y asignaciones sin responder.
 */
export async function resumenHoy() {
  const fecha = hoyIso()
  const rutasHoy = await db
    .select({ id: ruta.id, estado: ruta.estado })
    .from(ruta)
    .where(eq(ruta.fecha, fecha))
  const idsHoy = rutasHoy.map((r) => r.id)
  const paradasHoy = idsHoy.length
    ? await db
        .select({ estadoEntrega: rutaParada.estadoEntrega })
        .from(rutaParada)
        .where(inArray(rutaParada.rutaId, idsHoy))
    : []

  const [conductoresEnRuta] = await db
    .select({ total: contar() })
    .from(conductor)
    .where(eq(conductor.disponibilidad, 'en_ruta'))

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
    rutasPorEstado: conteoPorEstado(rutasHoy),
    paradas: {
      entregadas: paradasHoy.filter((p) => p.estadoEntrega === 'entregada').length,
      pendientes: paradasHoy.filter((p) => p.estadoEntrega === 'pendiente').length,
      fallidas: paradasHoy.filter((p) => p.estadoEntrega === 'fallida').length,
    },
    conductoresEnRuta: conductoresEnRuta?.total ?? 0,
    demoradas,
  }
}

/** RF-22: rutas por estado y entregas realizadas/pendientes/fallidas en un periodo. */
export async function reporteRutas(f: PeriodoReporteInput) {
  const condicion = and(gte(ruta.fecha, f.desde), lte(ruta.fecha, f.hasta))
  const rutas = await db.select({ estado: ruta.estado }).from(ruta).where(condicion)
  const paradas = await db
    .select({ estadoEntrega: rutaParada.estadoEntrega })
    .from(rutaParada)
    .innerJoin(ruta, eq(ruta.id, rutaParada.rutaId))
    .where(condicion)

  return {
    desde: f.desde,
    hasta: f.hasta,
    totalRutas: rutas.length,
    rutasPorEstado: conteoPorEstado(rutas),
    entregas: {
      realizadas: paradas.filter((p) => p.estadoEntrega === 'entregada').length,
      pendientes: paradas.filter((p) => p.estadoEntrega === 'pendiente').length,
      fallidas: paradas.filter((p) => p.estadoEntrega === 'fallida').length,
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
  const rutasPeriodo = await db
    .select({
      id: ruta.id,
      conductorId: ruta.conductorId,
      estado: ruta.estado,
      asignadaEn: ruta.asignadaEn,
      aceptadaEn: ruta.aceptadaEn,
    })
    .from(ruta)
    .where(condicion)

  const idsRutas = rutasPeriodo.map((r) => r.id)
  const paradas = idsRutas.length
    ? await db
        .select({
          rutaId: rutaParada.rutaId,
          estadoEntrega: rutaParada.estadoEntrega,
          novedadTipo: rutaParada.novedadTipo,
        })
        .from(rutaParada)
        .where(inArray(rutaParada.rutaId, idsRutas))
    : []

  const idsConductores = [...new Set(rutasPeriodo.map((r) => r.conductorId as number))]
  const conductores = idsConductores.length
    ? await db
        .select({ id: conductor.id, nombre: conductor.nombre })
        .from(conductor)
        .where(inArray(conductor.id, idsConductores))
    : []

  return conductores
    .map((c) => {
      const rutasC = rutasPeriodo.filter((r) => r.conductorId === c.id)
      const idsC = new Set(rutasC.map((r) => r.id))
      const paradasC = paradas.filter((p) => idsC.has(p.rutaId))
      const aceptadasATiempo = rutasC.filter((r) => r.asignadaEn && r.aceptadaEn)
      const minutosAceptacionProm = aceptadasATiempo.length
        ? Math.round(
            aceptadasATiempo.reduce(
              (acc, r) =>
                acc +
                ((r.aceptadaEn as Date).getTime() - (r.asignadaEn as Date).getTime()) / 60_000,
              0,
            ) / aceptadasATiempo.length,
          )
        : null
      return {
        conductorId: c.id,
        nombre: c.nombre,
        totalRutas: rutasC.length,
        completadas: rutasC.filter((r) => r.estado === 'completada').length,
        incompletas: rutasC.filter((r) => r.estado === 'incompleta').length,
        canceladas: rutasC.filter((r) => r.estado === 'cancelada').length,
        paradasEntregadas: paradasC.filter((p) => p.estadoEntrega === 'entregada').length,
        paradasFallidas: paradasC.filter((p) => p.estadoEntrega === 'fallida').length,
        novedades: paradasC.filter((p) => p.novedadTipo != null).length,
        minutosAceptacionProm,
      }
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

/** RF-23: desempeño por zona de distribución en un periodo. */
export async function reporteZonas(f: PeriodoReporteInput) {
  const condicion = and(gte(ruta.fecha, f.desde), lte(ruta.fecha, f.hasta))
  const filas = await db
    .select({ zonaId: zona.id, estadoEntrega: rutaParada.estadoEntrega })
    .from(rutaParada)
    .innerJoin(ruta, eq(ruta.id, rutaParada.rutaId))
    .innerJoin(destino, eq(destino.id, rutaParada.destinoId))
    .innerJoin(zona, eq(zona.id, destino.zonaId))
    .where(condicion)

  const zonas = await db
    .select({ id: zona.id, nombre: zona.nombre })
    .from(zona)
    .orderBy(zona.nombre)
  return zonas
    .map((z) => {
      const filasZ = filas.filter((f) => f.zonaId === z.id)
      return {
        zonaId: z.id,
        nombre: z.nombre,
        totalParadas: filasZ.length,
        entregadas: filasZ.filter((f) => f.estadoEntrega === 'entregada').length,
        fallidas: filasZ.filter((f) => f.estadoEntrega === 'fallida').length,
        pendientes: filasZ.filter((f) => f.estadoEntrega === 'pendiente').length,
      }
    })
    .filter((z) => z.totalParadas > 0)
}

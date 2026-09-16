import { ETIQUETAS_ESTADO_RUTA, periodoReporteSchema } from '@lh/shared'
import { Elysia } from 'elysia'
import { libroXlsx, respuestaXlsx } from '../../lib/exportar.ts'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './reportes.service.ts'

export const reportesController = new Elysia({ prefix: '/reportes', tags: ['Reportes'] })
  .use(autenticacion)
  .guard({ roles: ['coordinador'] })
  .get('/resumen-hoy', () => servicio.resumenHoy(), {
    detail: { summary: 'Resumen del día para el panel de despacho' },
  })
  .get('/rutas', ({ query }) => servicio.reporteRutas(query), {
    query: periodoReporteSchema,
    detail: { summary: 'Rutas y entregas por periodo (RF-22)' },
  })
  .get(
    '/rutas/exportar',
    async ({ query }) => {
      const r = await servicio.reporteRutas(query)
      const buffer = await libroXlsx([
        {
          nombre: 'Rutas',
          columnas: [
            { encabezado: 'Indicador', clave: 'indicador', ancho: 32 },
            { encabezado: 'Valor', clave: 'valor' },
          ],
          filas: [
            { indicador: 'Periodo', valor: `${r.desde} a ${r.hasta}` },
            { indicador: 'Total de rutas', valor: r.totalRutas },
            ...Object.entries(r.rutasPorEstado).map(([estado, cantidad]) => ({
              indicador: ETIQUETAS_ESTADO_RUTA[estado as keyof typeof ETIQUETAS_ESTADO_RUTA],
              valor: cantidad,
            })),
            { indicador: 'Entregas realizadas', valor: r.entregas.realizadas },
            { indicador: 'Entregas pendientes', valor: r.entregas.pendientes },
            { indicador: 'Entregas fallidas', valor: r.entregas.fallidas },
          ],
        },
      ])
      return respuestaXlsx(buffer, `reporte-rutas-${r.desde}-a-${r.hasta}.xlsx`)
    },
    { query: periodoReporteSchema, detail: { summary: 'Exportar el reporte de rutas a Excel' } },
  )
  .get('/conductores', ({ query }) => servicio.reporteConductores(query), {
    query: periodoReporteSchema,
    detail: { summary: 'Desempeño por conductor en un periodo (RF-23)' },
  })
  .get(
    '/conductores/exportar',
    async ({ query }) => {
      const filas = await servicio.reporteConductores(query)
      const buffer = await libroXlsx([
        {
          nombre: 'Conductores',
          columnas: [
            { encabezado: 'Conductor', clave: 'nombre', ancho: 28 },
            { encabezado: 'Rutas totales', clave: 'totalRutas' },
            { encabezado: 'Completadas', clave: 'completadas' },
            { encabezado: 'Incompletas', clave: 'incompletas' },
            { encabezado: 'Canceladas', clave: 'canceladas' },
            { encabezado: 'Paradas entregadas', clave: 'paradasEntregadas' },
            { encabezado: 'Paradas fallidas', clave: 'paradasFallidas' },
            { encabezado: 'Novedades', clave: 'novedades' },
            { encabezado: 'Aceptación promedio (min)', clave: 'minutosAceptacionProm' },
          ],
          filas,
        },
      ])
      return respuestaXlsx(buffer, `reporte-conductores-${query.desde}-a-${query.hasta}.xlsx`)
    },
    {
      query: periodoReporteSchema,
      detail: { summary: 'Exportar el reporte de conductores a Excel' },
    },
  )
  .get('/zonas', ({ query }) => servicio.reporteZonas(query), {
    query: periodoReporteSchema,
    detail: { summary: 'Desempeño por zona de distribución en un periodo (RF-23)' },
  })
  .get(
    '/zonas/exportar',
    async ({ query }) => {
      const filas = await servicio.reporteZonas(query)
      const buffer = await libroXlsx([
        {
          nombre: 'Zonas',
          columnas: [
            { encabezado: 'Zona', clave: 'nombre', ancho: 28 },
            { encabezado: 'Paradas totales', clave: 'totalParadas' },
            { encabezado: 'Entregadas', clave: 'entregadas' },
            { encabezado: 'Fallidas', clave: 'fallidas' },
            { encabezado: 'Pendientes', clave: 'pendientes' },
          ],
          filas,
        },
      ])
      return respuestaXlsx(buffer, `reporte-zonas-${query.desde}-a-${query.hasta}.xlsx`)
    },
    { query: periodoReporteSchema, detail: { summary: 'Exportar el reporte de zonas a Excel' } },
  )

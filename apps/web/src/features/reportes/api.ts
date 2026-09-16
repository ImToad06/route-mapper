import type { PeriodoReporteInput } from '@lh/shared'
import { queryOptions } from '@tanstack/react-query'
import { api, datosDe, descargarArchivo } from '@/lib/api'

const claveReportes = ['reportes'] as const

export const resumenHoyQuery = queryOptions({
  queryKey: [...claveReportes, 'resumen-hoy'],
  queryFn: () => datosDe(api.reportes['resumen-hoy'].get()),
  staleTime: 30_000,
})

const obtenerReporteRutas = (f: PeriodoReporteInput) =>
  datosDe(api.reportes.rutas.get({ query: f }))
const obtenerReporteConductores = (f: PeriodoReporteInput) =>
  datosDe(api.reportes.conductores.get({ query: f }))
const obtenerReporteZonas = (f: PeriodoReporteInput) =>
  datosDe(api.reportes.zonas.get({ query: f }))

export type ReporteRutas = Awaited<ReturnType<typeof obtenerReporteRutas>>
export type ReporteConductores = Awaited<ReturnType<typeof obtenerReporteConductores>>
export type ReporteZonas = Awaited<ReturnType<typeof obtenerReporteZonas>>

export const reporteRutasQuery = (f: PeriodoReporteInput) =>
  queryOptions({ queryKey: [...claveReportes, 'rutas', f], queryFn: () => obtenerReporteRutas(f) })
export const reporteConductoresQuery = (f: PeriodoReporteInput) =>
  queryOptions({
    queryKey: [...claveReportes, 'conductores', f],
    queryFn: () => obtenerReporteConductores(f),
  })
export const reporteZonasQuery = (f: PeriodoReporteInput) =>
  queryOptions({ queryKey: [...claveReportes, 'zonas', f], queryFn: () => obtenerReporteZonas(f) })

const periodo = (f: PeriodoReporteInput) => `desde=${f.desde}&hasta=${f.hasta}`

export const exportarReporteRutas = (f: PeriodoReporteInput) =>
  descargarArchivo(
    `/reportes/rutas/exportar?${periodo(f)}`,
    `reporte-rutas-${f.desde}-a-${f.hasta}.xlsx`,
  )
export const exportarReporteConductores = (f: PeriodoReporteInput) =>
  descargarArchivo(
    `/reportes/conductores/exportar?${periodo(f)}`,
    `reporte-conductores-${f.desde}-a-${f.hasta}.xlsx`,
  )
export const exportarReporteZonas = (f: PeriodoReporteInput) =>
  descargarArchivo(
    `/reportes/zonas/exportar?${periodo(f)}`,
    `reporte-zonas-${f.desde}-a-${f.hasta}.xlsx`,
  )

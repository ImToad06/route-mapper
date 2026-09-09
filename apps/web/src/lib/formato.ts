const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })
const fechaLarga = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const kg = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

export const formatearFechaHora = (iso: string | Date) => fechaHora.format(new Date(iso))
export const formatearFecha = (iso: string | Date) => fecha.format(new Date(iso))
/**
 * Normaliza una fecha sin hora a "AAAA-MM-DD". El cliente Eden convierte las cadenas ISO de la API en
 * objetos Date (interpretados en UTC), así que se leen sus componentes UTC para no correr un día.
 */
export const aFechaIso = (v: string | Date): string => {
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}-${String(v.getUTCDate()).padStart(2, '0')}`
  }
  return v.slice(0, 10)
}

/** Fecha sin hora como "lunes, 15 de enero de 2030". */
export const formatearFechaLarga = (v: string | Date) => {
  const [a, m, d] = aFechaIso(v).split('-').map(Number)
  return fechaLarga.format(new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1))
}
export const formatearKg = (n: number) => `${kg.format(n)} kg`
export const formatearDistancia = (m: number | null | undefined) =>
  m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
export const formatearDuracion = (s: number | null | undefined) => {
  if (s == null) return '—'
  const totalMin = Math.round(s / 60)
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return h > 0 ? `${h} h ${String(min).padStart(2, '0')} min` : `${min} min`
}

/** Fecha de hoy "AAAA-MM-DD" en la zona horaria del navegador (no la UTC). */
export const hoyIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

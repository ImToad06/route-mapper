const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

export const formatearFechaHora = (iso: string | Date) => fechaHora.format(new Date(iso))
export const formatearFecha = (iso: string | Date) => fecha.format(new Date(iso))

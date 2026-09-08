/** Roles del sistema (RF-02). `administrador` incluye todos los permisos de `coordinador`. */
export const ROLES = ['administrador', 'coordinador', 'conductor'] as const
export type Rol = (typeof ROLES)[number]

/** Estados de una ruta. Ver PLAN-DESARROLLO.md §1.4. */
export const ESTADOS_RUTA = [
  'borrador',
  'planificada',
  'pendiente_aceptacion',
  'asignada',
  'en_curso',
  'completada',
  'incompleta',
  'cancelada',
] as const
export type EstadoRuta = (typeof ESTADOS_RUTA)[number]

export const ESTADOS_RUTA_TERMINALES: readonly EstadoRuta[] = [
  'completada',
  'incompleta',
  'cancelada',
]

/** Estados de una parada dentro de una ruta (RF-20). */
export const ESTADOS_PARADA = ['pendiente', 'entregada', 'fallida'] as const
export type EstadoParada = (typeof ESTADOS_PARADA)[number]

/** Tipos de novedad que un conductor puede reportar en una parada (RF-20). */
export const TIPOS_NOVEDAD = [
  'cliente_ausente',
  'rechazo_mercancia',
  'direccion_incorrecta',
  'devolucion_parcial',
  'otro',
] as const
export type TipoNovedad = (typeof TIPOS_NOVEDAD)[number]

/** Disponibilidad del conductor (RF-06). */
export const DISPONIBILIDAD_CONDUCTOR = ['disponible', 'en_ruta', 'inactivo'] as const
export type DisponibilidadConductor = (typeof DISPONIBILIDAD_CONDUCTOR)[number]

/** Unidades de medida de productos (RF-07). */
export const UNIDADES_MEDIDA = ['unidad', 'caja', 'paquete', 'kg', 'litro'] as const
export type UnidadMedida = (typeof UNIDADES_MEDIDA)[number]

/** Etiquetas en español para mostrar en la interfaz. */
export const ETIQUETAS_ESTADO_RUTA: Record<EstadoRuta, string> = {
  borrador: 'Borrador',
  planificada: 'Planificada',
  pendiente_aceptacion: 'Pendiente de aceptación',
  asignada: 'Asignada',
  en_curso: 'En curso',
  completada: 'Completada',
  incompleta: 'Incompleta',
  cancelada: 'Cancelada',
}

export const ETIQUETAS_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  coordinador: 'Coordinador de rutas',
  conductor: 'Conductor',
}

export const ETIQUETAS_ESTADO_PARADA: Record<EstadoParada, string> = {
  pendiente: 'Pendiente',
  entregada: 'Entregada',
  fallida: 'Fallida',
}

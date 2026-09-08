import {
  DISPONIBILIDAD_CONDUCTOR,
  ESTADOS_PARADA,
  ESTADOS_RUTA,
  ROLES,
  TIPOS_NOVEDAD,
  UNIDADES_MEDIDA,
} from '@lh/shared'
import { pgEnum } from 'drizzle-orm/pg-core'

export const rolEnum = pgEnum('rol_nombre', ROLES)
export const estadoRutaEnum = pgEnum('estado_ruta', ESTADOS_RUTA)
export const estadoParadaEnum = pgEnum('estado_parada', ESTADOS_PARADA)
export const tipoNovedadEnum = pgEnum('tipo_novedad', TIPOS_NOVEDAD)
export const disponibilidadEnum = pgEnum('disponibilidad_conductor', DISPONIBILIDAD_CONDUCTOR)
export const unidadMedidaEnum = pgEnum('unidad_medida', UNIDADES_MEDIDA)

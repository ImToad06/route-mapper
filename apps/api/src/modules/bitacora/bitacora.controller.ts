import { listarBitacoraSchema } from '@lh/shared'
import { Elysia } from 'elysia'
import { libroXlsx, respuestaXlsx } from '../../lib/exportar.ts'
import { autenticacion } from '../../plugins/auth.ts'
import * as servicio from './bitacora.service.ts'

export const bitacoraController = new Elysia({ prefix: '/bitacora', tags: ['Bitácora'] })
  .use(autenticacion)
  .get('/', ({ query }) => servicio.listarBitacora(query), {
    roles: ['administrador'],
    query: listarBitacoraSchema,
    detail: { summary: 'Bitácora de operaciones (solo administrador)' },
  })
  .get(
    '/exportar',
    async ({ query }) => {
      const { filas, truncado } = await servicio.listarBitacoraParaExportar(query)
      const buffer = await libroXlsx([
        {
          nombre: 'Bitácora',
          columnas: [
            { encabezado: 'Fecha y hora', clave: 'fechaHora', ancho: 22 },
            { encabezado: 'Usuario', clave: 'usuarioNombre', ancho: 26 },
            { encabezado: 'Acción', clave: 'accion' },
            { encabezado: 'Entidad', clave: 'entidad' },
            { encabezado: 'ID', clave: 'entidadId' },
            { encabezado: 'Descripción', clave: 'descripcion', ancho: 50 },
          ],
          filas: truncado
            ? [
                {
                  descripcion:
                    '⚠ Hay más registros de los que caben aquí; se exportaron solo los más recientes. Acote el periodo o los filtros para ver el resto.',
                },
                ...filas,
              ]
            : filas,
        },
      ])
      return respuestaXlsx(buffer, 'bitacora.xlsx')
    },
    {
      roles: ['administrador'],
      query: listarBitacoraSchema,
      detail: { summary: 'Exportar la bitácora a Excel (solo administrador)' },
    },
  )

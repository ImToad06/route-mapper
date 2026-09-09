import type { DestinoInput, ImportarDestinosInput, ListarDestinosInput } from '@lh/shared'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { destino, zona } from '../../db/schema/index.ts'
import {
  combinar,
  condicionActivo,
  condicionBusqueda,
  contar,
  paginar,
  sinCambios,
} from '../../lib/catalogo.ts'
import { construirPagina } from '../../lib/paginacion.ts'
import type { UsuarioActual } from '../../plugins/auth.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { registrarOperacion } from '../bitacora/bitacora.service.ts'
import { obtenerOCrearZonaPorNombre, obtenerZona } from '../zonas/zonas.service.ts'

const columnas = {
  id: destino.id,
  zonaId: destino.zonaId,
  zona: zona.nombre,
  nombreCliente: destino.nombreCliente,
  direccion: destino.direccion,
  horarioAtencion: destino.horarioAtencion,
  telefono: destino.telefono,
  latitud: destino.latitud,
  longitud: destino.longitud,
  ubicacionVerificada: destino.ubicacionVerificada,
  activo: destino.activo,
  creadoEn: destino.creadoEn,
}

const consultaBase = () =>
  db.select(columnas).from(destino).innerJoin(zona, eq(zona.id, destino.zonaId))

export async function listarDestinos(f: ListarDestinosInput) {
  const where = combinar(
    condicionBusqueda(f.buscar, [destino.nombreCliente, destino.direccion]),
    condicionActivo(f.activo, destino.activo),
    f.zonaId ? eq(destino.zonaId, f.zonaId) : undefined,
    f.verificados === undefined ? undefined : eq(destino.ubicacionVerificada, f.verificados),
  )
  const [filas, [total]] = await Promise.all([
    paginar(
      consultaBase().where(where).orderBy(desc(destino.creadoEn)).$dynamic(),
      f.pagina,
      f.porPagina,
    ),
    db.select({ total: contar() }).from(destino).where(where),
  ])
  return construirPagina(filas, total?.total ?? 0, f.pagina, f.porPagina)
}

/** Todos los destinos activos con coordenadas, para el mapa y el constructor de rutas (sin paginar). */
export async function listarDestinosParaMapa(zonaId?: number) {
  return consultaBase()
    .where(combinar(eq(destino.activo, true), zonaId ? eq(destino.zonaId, zonaId) : undefined))
    .orderBy(destino.nombreCliente)
}

export async function obtenerDestino(id: number) {
  const [d] = await consultaBase().where(eq(destino.id, id))
  if (!d) throw new ErrorAplicacion(404, 'El destino no existe.')
  return d
}

export async function crearDestino(datos: DestinoInput, actor: UsuarioActual) {
  await obtenerZona(datos.zonaId)
  const [d] = await db.insert(destino).values(datos).returning({ id: destino.id })
  if (!d) throw new Error('No se pudo crear el destino')
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'crear',
    entidad: 'destino',
    entidadId: d.id,
    descripcion: `Registró el destino ${datos.nombreCliente}`,
  })
  return obtenerDestino(d.id)
}

export async function actualizarDestino(
  id: number,
  datos: Partial<DestinoInput>,
  actor: UsuarioActual,
) {
  const actual = await obtenerDestino(id)
  if (sinCambios(datos)) return actual
  if (datos.zonaId) await obtenerZona(datos.zonaId)
  // Si cambia la dirección sin confirmar de nuevo el marcador, la ubicación deja de estar verificada.
  const cambiaDireccion = datos.direccion !== undefined && datos.direccion !== actual.direccion
  const cambios = {
    ...datos,
    ...(cambiaDireccion &&
      datos.ubicacionVerificada === undefined && { ubicacionVerificada: false }),
  }
  await db.update(destino).set(cambios).where(eq(destino.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'destino',
    entidadId: id,
    descripcion: `Actualizó el destino ${actual.nombreCliente}`,
  })
  return obtenerDestino(id)
}

export async function cambiarActivoDestino(id: number, activo: boolean, actor: UsuarioActual) {
  const actual = await obtenerDestino(id)
  await db.update(destino).set({ activo }).where(eq(destino.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: activo ? 'activar' : 'desactivar',
    entidad: 'destino',
    entidadId: id,
    descripcion: `${activo ? 'Activó' : 'Desactivó'} el destino ${actual.nombreCliente}`,
  })
  return obtenerDestino(id)
}

export interface ResultadoImportacion {
  creados: number
  errores: { fila: number; mensaje: string }[]
}

/**
 * Importa filas de la planilla. Todas deben traer coordenadas: el navegador geocodifica antes las
 * que no las tienen y las envía con `ubicacionVerificada: false` para que el coordinador confirme el marcador.
 */
export async function importarDestinos(
  datos: ImportarDestinosInput,
  actor: UsuarioActual,
): Promise<ResultadoImportacion> {
  const resultado: ResultadoImportacion = { creados: 0, errores: [] }
  const zonas = new Map<string, number>()
  for (const [i, fila] of datos.filas.entries()) {
    const numero = fila.numero ?? i + 1
    try {
      if (fila.latitud === undefined || fila.longitud === undefined) {
        resultado.errores.push({ fila: numero, mensaje: 'La fila no trae coordenadas.' })
        continue
      }
      const clave = fila.zona.trim().toLowerCase()
      let zonaId = zonas.get(clave)
      if (!zonaId) {
        zonaId = (await obtenerOCrearZonaPorNombre(fila.zona, actor)).id
        zonas.set(clave, zonaId)
      }
      await db.insert(destino).values({
        zonaId,
        nombreCliente: fila.nombreCliente,
        direccion: fila.direccion,
        horarioAtencion: fila.horarioAtencion ?? null,
        telefono: fila.telefono ?? null,
        latitud: fila.latitud,
        longitud: fila.longitud,
        ubicacionVerificada: fila.ubicacionVerificada ?? true,
      })
      resultado.creados++
    } catch (err) {
      resultado.errores.push({
        fila: numero,
        mensaje: err instanceof ErrorAplicacion ? err.message : 'No se pudo importar la fila.',
      })
    }
  }
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'crear',
    entidad: 'destino',
    descripcion: `Importó ${resultado.creados} destinos desde planilla (${resultado.errores.length} con error)`,
  })
  return resultado
}

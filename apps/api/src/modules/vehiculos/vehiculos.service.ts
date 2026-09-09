import type { ListarCatalogoInput, VehiculoInput } from '@lh/shared'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { conductor, vehiculo } from '../../db/schema/index.ts'
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

const aPublico = (v: typeof vehiculo.$inferSelect) => ({ ...v, capacidadKg: Number(v.capacidadKg) })

export async function listarVehiculos(f: ListarCatalogoInput) {
  const where = combinar(
    condicionBusqueda(f.buscar, [vehiculo.placa, vehiculo.tipo]),
    condicionActivo(f.activo, vehiculo.activo),
  )
  const [filas, [total]] = await Promise.all([
    paginar(
      db.select().from(vehiculo).where(where).orderBy(desc(vehiculo.creadoEn)).$dynamic(),
      f.pagina,
      f.porPagina,
    ),
    db.select({ total: contar() }).from(vehiculo).where(where),
  ])
  return construirPagina(filas.map(aPublico), total?.total ?? 0, f.pagina, f.porPagina)
}

export async function obtenerVehiculo(id: number) {
  const [v] = await db.select().from(vehiculo).where(eq(vehiculo.id, id))
  if (!v) throw new ErrorAplicacion(404, 'El vehículo no existe.')
  return aPublico(v)
}

async function placaEnUso(placa: string, exceptoId?: number) {
  const [v] = await db.select({ id: vehiculo.id }).from(vehiculo).where(eq(vehiculo.placa, placa))
  return Boolean(v && v.id !== exceptoId)
}

export async function crearVehiculo(datos: VehiculoInput, actor: UsuarioActual) {
  if (await placaEnUso(datos.placa))
    throw new ErrorAplicacion(409, 'Ya existe un vehículo con esa placa.')
  const [v] = await db
    .insert(vehiculo)
    .values({ ...datos, capacidadKg: String(datos.capacidadKg) })
    .returning()
  if (!v) throw new Error('No se pudo crear el vehículo')
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'crear',
    entidad: 'vehiculo',
    entidadId: v.id,
    descripcion: `Registró el vehículo ${v.placa}`,
  })
  return aPublico(v)
}

export async function actualizarVehiculo(
  id: number,
  datos: Partial<VehiculoInput>,
  actor: UsuarioActual,
) {
  const actual = await obtenerVehiculo(id)
  if (sinCambios(datos)) return actual
  if (datos.placa && (await placaEnUso(datos.placa, id))) {
    throw new ErrorAplicacion(409, 'Ya existe un vehículo con esa placa.')
  }
  const { capacidadKg, ...resto } = datos
  await db
    .update(vehiculo)
    .set({ ...resto, ...(capacidadKg !== undefined && { capacidadKg: String(capacidadKg) }) })
    .where(eq(vehiculo.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'vehiculo',
    entidadId: id,
    descripcion: `Actualizó el vehículo ${actual.placa}`,
  })
  return obtenerVehiculo(id)
}

export async function cambiarActivoVehiculo(id: number, activo: boolean, actor: UsuarioActual) {
  const actual = await obtenerVehiculo(id)
  if (!activo) {
    // Al desactivar se desvincula de los conductores que lo tenían asignado.
    await db.update(conductor).set({ vehiculoId: null }).where(eq(conductor.vehiculoId, id))
  }
  await db.update(vehiculo).set({ activo }).where(eq(vehiculo.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: activo ? 'activar' : 'desactivar',
    entidad: 'vehiculo',
    entidadId: id,
    descripcion: `${activo ? 'Activó' : 'Desactivó'} el vehículo ${actual.placa}`,
  })
  return obtenerVehiculo(id)
}

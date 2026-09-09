import type {
  ActualizarConductorInput,
  CrearConductorInput,
  ListarConductoresInput,
} from '@lh/shared'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import { conductor, usuario, vehiculo } from '../../db/schema/index.ts'
import {
  combinar,
  condicionActivo,
  condicionBusqueda,
  contar,
  paginar,
  sinCambios,
} from '../../lib/catalogo.ts'
import { construirPagina } from '../../lib/paginacion.ts'
import { generarContrasenaTemporal, hashContrasena } from '../../lib/tokens.ts'
import type { UsuarioActual } from '../../plugins/auth.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { registrarOperacion } from '../bitacora/bitacora.service.ts'
import * as usuarios from '../usuarios/usuarios.repository.ts'
import { obtenerVehiculo } from '../vehiculos/vehiculos.service.ts'

const columnas = {
  id: conductor.id,
  usuarioId: conductor.usuarioId,
  nombre: conductor.nombre,
  documento: conductor.documento,
  licencia: conductor.licencia,
  telefono: conductor.telefono,
  disponibilidad: conductor.disponibilidad,
  activo: conductor.activo,
  creadoEn: conductor.creadoEn,
  correo: usuario.correo,
  vehiculo: {
    id: vehiculo.id,
    placa: vehiculo.placa,
    tipo: vehiculo.tipo,
    capacidadKg: vehiculo.capacidadKg,
  },
}

const consultaBase = () =>
  db
    .select(columnas)
    .from(conductor)
    .innerJoin(usuario, eq(usuario.id, conductor.usuarioId))
    .leftJoin(vehiculo, eq(vehiculo.id, conductor.vehiculoId))

type Fila = Awaited<ReturnType<typeof consultaBase>>[number]

const aPublico = (f: Fila) => ({
  ...f,
  vehiculo: f.vehiculo ? { ...f.vehiculo, capacidadKg: Number(f.vehiculo.capacidadKg) } : null,
})

export async function listarConductores(f: ListarConductoresInput) {
  const where = combinar(
    condicionBusqueda(f.buscar, [conductor.nombre, conductor.documento, usuario.correo]),
    condicionActivo(f.activo, conductor.activo),
    f.disponibilidad ? eq(conductor.disponibilidad, f.disponibilidad) : undefined,
  )
  const [filas, [total]] = await Promise.all([
    paginar(
      consultaBase().where(where).orderBy(desc(conductor.creadoEn)).$dynamic(),
      f.pagina,
      f.porPagina,
    ),
    db
      .select({ total: contar() })
      .from(conductor)
      .innerJoin(usuario, eq(usuario.id, conductor.usuarioId))
      .where(where),
  ])
  return construirPagina(filas.map(aPublico), total?.total ?? 0, f.pagina, f.porPagina)
}

export async function obtenerConductor(id: number) {
  const [c] = await consultaBase().where(eq(conductor.id, id))
  if (!c) throw new ErrorAplicacion(404, 'El conductor no existe.')
  return aPublico(c)
}

async function documentoEnUso(documento: string, exceptoId?: number) {
  const [c] = await db
    .select({ id: conductor.id })
    .from(conductor)
    .where(eq(conductor.documento, documento))
  return Boolean(c && c.id !== exceptoId)
}

async function validarVehiculo(vehiculoId: number | null | undefined) {
  if (vehiculoId == null) return
  const v = await obtenerVehiculo(vehiculoId)
  if (!v.activo) throw new ErrorAplicacion(400, 'El vehículo seleccionado está desactivado.')
}

/** RF-04/RF-05: crea el usuario (rol conductor) y la ficha del conductor en una transacción. */
export async function crearConductor(datos: CrearConductorInput, actor: UsuarioActual) {
  if (await usuarios.buscarPorCorreo(datos.correo))
    throw new ErrorAplicacion(409, 'Ya existe un usuario con ese correo.')
  if (await documentoEnUso(datos.documento))
    throw new ErrorAplicacion(409, 'Ya existe un conductor con ese documento.')
  await validarVehiculo(datos.vehiculoId)
  const contrasenaTemporal = datos.contrasena ? null : generarContrasenaTemporal()
  const contrasenaHash = await hashContrasena(datos.contrasena ?? contrasenaTemporal ?? '')
  const rolId = await usuarios.idDeRol('conductor')

  const id = await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(usuario)
      .values({
        rolId,
        nombre: datos.nombre,
        correo: datos.correo,
        contrasenaHash,
        debeCambiarContrasena: true,
      })
      .returning({ id: usuario.id })
    if (!u) throw new Error('No se pudo crear el usuario del conductor')
    const [c] = await tx
      .insert(conductor)
      .values({
        usuarioId: u.id,
        nombre: datos.nombre,
        documento: datos.documento,
        licencia: datos.licencia,
        telefono: datos.telefono ?? null,
        vehiculoId: datos.vehiculoId ?? null,
      })
      .returning({ id: conductor.id })
    if (!c) throw new Error('No se pudo crear el conductor')
    return c.id
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'crear',
    entidad: 'conductor',
    entidadId: id,
    descripcion: `Registró al conductor ${datos.nombre} (${datos.documento})`,
  })
  return { conductor: await obtenerConductor(id), contrasenaTemporal }
}

export async function actualizarConductor(
  id: number,
  datos: ActualizarConductorInput,
  actor: UsuarioActual,
) {
  const actual = await obtenerConductor(id)
  if (sinCambios(datos)) return actual
  if (datos.documento && (await documentoEnUso(datos.documento, id)))
    throw new ErrorAplicacion(409, 'Ya existe un conductor con ese documento.')
  if (datos.disponibilidad && !actual.activo) {
    throw new ErrorAplicacion(
      400,
      'El conductor está desactivado; actívelo antes de cambiar su disponibilidad.',
    )
  }
  if (datos.disponibilidad && actual.disponibilidad === 'en_ruta') {
    throw new ErrorAplicacion(
      400,
      'El conductor está en ruta; su disponibilidad cambiará al finalizarla.',
    )
  }
  if (datos.vehiculoId !== undefined) await validarVehiculo(datos.vehiculoId)
  await db.transaction(async (tx) => {
    await tx.update(conductor).set(datos).where(eq(conductor.id, id))
    if (datos.nombre)
      await tx
        .update(usuario)
        .set({ nombre: datos.nombre })
        .where(eq(usuario.id, actual.usuarioId as number))
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'conductor',
    entidadId: id,
    descripcion: `Actualizó al conductor ${actual.nombre}`,
  })
  return obtenerConductor(id)
}

/** Desactivar un conductor desactiva también su usuario y cierra sus sesiones. */
export async function cambiarActivoConductor(id: number, activo: boolean, actor: UsuarioActual) {
  const actual = await obtenerConductor(id)
  if (actual.disponibilidad === 'en_ruta' && !activo)
    throw new ErrorAplicacion(400, 'No se puede desactivar un conductor que está en ruta.')
  const usuarioId = actual.usuarioId as number
  await db.transaction(async (tx) => {
    await tx
      .update(conductor)
      .set({ activo, disponibilidad: activo ? 'disponible' : 'inactivo' })
      .where(eq(conductor.id, id))
    await tx.update(usuario).set({ activo }).where(eq(usuario.id, usuarioId))
  })
  if (!activo) await usuarios.revocarSesiones(usuarioId)
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: activo ? 'activar' : 'desactivar',
    entidad: 'conductor',
    entidadId: id,
    descripcion: `${activo ? 'Activó' : 'Desactivó'} al conductor ${actual.nombre}`,
  })
  return obtenerConductor(id)
}

import {
  type ActualizarRutaInput,
  type CrearRutaInput,
  ESTADOS_RUTA_EDITABLES,
  type EstadoRuta,
  ETIQUETAS_ESTADO_RUTA,
  interpretarHorario,
  type ListarRutasInput,
  type ParadasRutaInput,
  puedeTransicionar,
} from '@lh/shared'
import { and, asc, desc, eq, gte, inArray, like, lte, type SQL, sql } from 'drizzle-orm'
import { db } from '../../db/client.ts'
import {
  conductor,
  destino,
  paradaProducto,
  producto,
  ruta,
  rutaHistorialEstado,
  rutaParada,
  vehiculo,
  zona,
} from '../../db/schema/index.ts'
import { combinar, condicionBusqueda, contar, paginar, sinCambios } from '../../lib/catalogo.ts'
import { construirPagina } from '../../lib/paginacion.ts'
import type { UsuarioActual } from '../../plugins/auth.ts'
import { ErrorAplicacion } from '../../plugins/errores.ts'
import { registrarOperacion } from '../bitacora/bitacora.service.ts'
import { obtenerBodega } from '../configuracion/configuracion.service.ts'
import { obtenerProveedorEnrutamiento } from '../enrutamiento/enrutamiento.service.ts'
import type { ParadaOptimizable, RecorridoCalculado } from '../enrutamiento/proveedor.ts'
import { obtenerVehiculo } from '../vehiculos/vehiculos.service.ts'

/** Tiempo estimado de entrega en cada parada (descarga y firma), en segundos. */
export const SERVICIO_PARADA_S = 10 * 60

// ---------- Lectura ----------

const columnasResumen = {
  id: ruta.id,
  codigo: ruta.codigo,
  fecha: ruta.fecha,
  estado: ruta.estado,
  observaciones: ruta.observaciones,
  distanciaM: ruta.distanciaM,
  duracionS: ruta.duracionS,
  optimizadaEn: ruta.optimizadaEn,
  creadoEn: ruta.creadoEn,
  vehiculo: {
    id: vehiculo.id,
    placa: vehiculo.placa,
    tipo: vehiculo.tipo,
    capacidadKg: vehiculo.capacidadKg,
  },
  conductor: { id: conductor.id, nombre: conductor.nombre },
  totalParadas:
    sql<number>`(select count(*) from ${rutaParada} where ${rutaParada.rutaId} = ${ruta.id})`.mapWith(
      Number,
    ),
  cargaKg: sql<number>`(
    select coalesce(sum(${paradaProducto.cantidad} * ${producto.pesoKg}), 0)
    from ${rutaParada}
    join ${paradaProducto} on ${paradaProducto.rutaParadaId} = ${rutaParada.id}
    join ${producto} on ${producto.id} = ${paradaProducto.productoId}
    where ${rutaParada.rutaId} = ${ruta.id}
  )`.mapWith(Number),
}

const consultaResumen = () =>
  db
    .select(columnasResumen)
    .from(ruta)
    .leftJoin(vehiculo, eq(vehiculo.id, ruta.vehiculoId))
    .leftJoin(conductor, eq(conductor.id, ruta.conductorId))

type FilaResumen = Awaited<ReturnType<ReturnType<typeof consultaResumen>['where']>>[number]

const aResumen = (f: FilaResumen) => ({
  ...f,
  vehiculo: f.vehiculo?.id ? { ...f.vehiculo, capacidadKg: Number(f.vehiculo.capacidadKg) } : null,
  conductor: f.conductor?.id ? f.conductor : null,
  cargaKg: Math.round(f.cargaKg * 100) / 100,
})

export async function listarRutas(f: ListarRutasInput) {
  const condiciones: (SQL | undefined)[] = [
    condicionBusqueda(f.buscar, [ruta.codigo, ruta.observaciones]),
    f.estado ? eq(ruta.estado, f.estado) : undefined,
    f.desde ? gte(ruta.fecha, f.desde) : undefined,
    f.hasta ? lte(ruta.fecha, f.hasta) : undefined,
    f.conductorId ? eq(ruta.conductorId, f.conductorId) : undefined,
  ]
  const where = combinar(...condiciones)
  const [filas, [total]] = await Promise.all([
    paginar(
      consultaResumen().where(where).orderBy(desc(ruta.fecha), desc(ruta.id)).$dynamic(),
      f.pagina,
      f.porPagina,
    ),
    db.select({ total: contar() }).from(ruta).where(where),
  ])
  return construirPagina(filas.map(aResumen), total?.total ?? 0, f.pagina, f.porPagina)
}

async function obtenerParadas(rutaId: number) {
  const paradas = await db
    .select({
      id: rutaParada.id,
      orden: rutaParada.orden,
      estadoEntrega: rutaParada.estadoEntrega,
      horaConfirmacion: rutaParada.horaConfirmacion,
      novedadTipo: rutaParada.novedadTipo,
      novedadNota: rutaParada.novedadNota,
      etaS: rutaParada.etaS,
      distanciaDesdeAnteriorM: rutaParada.distanciaDesdeAnteriorM,
      destino: {
        id: destino.id,
        nombreCliente: destino.nombreCliente,
        direccion: destino.direccion,
        horarioAtencion: destino.horarioAtencion,
        telefono: destino.telefono,
        latitud: destino.latitud,
        longitud: destino.longitud,
        ubicacionVerificada: destino.ubicacionVerificada,
        zona: zona.nombre,
      },
    })
    .from(rutaParada)
    .innerJoin(destino, eq(destino.id, rutaParada.destinoId))
    .innerJoin(zona, eq(zona.id, destino.zonaId))
    .where(eq(rutaParada.rutaId, rutaId))
    .orderBy(asc(rutaParada.orden))
  const ids = paradas.map((p) => p.id)
  const productos = ids.length
    ? await db
        .select({
          rutaParadaId: paradaProducto.rutaParadaId,
          productoId: producto.id,
          codigo: producto.codigo,
          descripcion: producto.descripcion,
          unidadMedida: producto.unidadMedida,
          pesoKg: producto.pesoKg,
          cantidad: paradaProducto.cantidad,
        })
        .from(paradaProducto)
        .innerJoin(producto, eq(producto.id, paradaProducto.productoId))
        .where(inArray(paradaProducto.rutaParadaId, ids))
    : []
  return paradas.map((p) => {
    const lineas = productos
      .filter((x) => x.rutaParadaId === p.id)
      .map((x) => ({
        ...x,
        pesoKg: Number(x.pesoKg),
        cantidad: Number(x.cantidad),
        rutaParadaId: undefined,
      }))
    const cargaKg = lineas.reduce((acc, l) => acc + l.pesoKg * l.cantidad, 0)
    return { ...p, productos: lineas, cargaKg: Math.round(cargaKg * 100) / 100 }
  })
}

export async function obtenerRuta(id: number) {
  const [fila] = await consultaResumen().where(eq(ruta.id, id))
  if (!fila) throw new ErrorAplicacion(404, 'La ruta no existe.')
  const [extra] = await db
    .select({
      geometria: ruta.geometria,
      creadoPor: ruta.creadoPor,
      asignadaEn: ruta.asignadaEn,
      aceptadaEn: ruta.aceptadaEn,
      iniciadaEn: ruta.iniciadaEn,
      finalizadaEn: ruta.finalizadaEn,
      motivoRechazo: ruta.motivoRechazo,
    })
    .from(ruta)
    .where(eq(ruta.id, id))
  const paradas = await obtenerParadas(id)
  const resumen = aResumen(fila)
  return {
    ...resumen,
    ...extra,
    paradas,
    /** RF-14: true si la carga cabe en el vehículo elegido (o si aún no hay vehículo). */
    capacidadOk: resumen.vehiculo ? resumen.cargaKg <= resumen.vehiculo.capacidadKg : null,
  }
}

export async function obtenerHistorial(id: number) {
  return db
    .select()
    .from(rutaHistorialEstado)
    .where(eq(rutaHistorialEstado.rutaId, id))
    .orderBy(asc(rutaHistorialEstado.fechaHora))
}

// ---------- Escritura ----------

/** Siguiente código libre para la fecha: R-AAAAMMDD-NN a partir del mayor sufijo ya usado. */
async function siguienteCodigo(fecha: string, extra = 0): Promise<string> {
  const compacta = fecha.replaceAll('-', '')
  const prefijo = `R-${compacta}-`
  const usados = await db
    .select({ codigo: ruta.codigo })
    .from(ruta)
    .where(like(ruta.codigo, `${prefijo}%`))
  const mayor = usados.reduce(
    (max, u) => Math.max(max, Number(u.codigo.slice(prefijo.length)) || 0),
    0,
  )
  return `${prefijo}${String(mayor + 1 + extra).padStart(2, '0')}`
}

const esCodigoDuplicado = (err: unknown) => {
  let e = err as { code?: string; constraint_name?: string; cause?: unknown } | undefined
  for (let i = 0; i < 3 && e; i++) {
    if (e.code === '23505' && e.constraint_name === 'ruta_codigo_unique') return true
    e = e.cause as typeof e
  }
  return false
}

async function validarVehiculo(vehiculoId: number | null | undefined) {
  if (vehiculoId == null) return null
  const v = await obtenerVehiculo(vehiculoId)
  if (!v.activo) throw new ErrorAplicacion(400, 'El vehículo está desactivado.')
  return v
}

export async function crearRuta(datos: CrearRutaInput, actor: UsuarioActual) {
  await validarVehiculo(datos.vehiculoId)
  let id: number | undefined
  let codigo = ''
  // Dos coordinadores pueden crear a la vez para la misma fecha: ante un código duplicado se reintenta.
  for (let intento = 0; intento < 5 && id === undefined; intento++) {
    codigo = await siguienteCodigo(datos.fecha, intento)
    try {
      const [r] = await db
        .insert(ruta)
        .values({
          codigo,
          fecha: datos.fecha,
          vehiculoId: datos.vehiculoId ?? null,
          observaciones: datos.observaciones ?? null,
          creadoPor: actor.sub,
        })
        .returning({ id: ruta.id })
      id = r?.id
    } catch (err) {
      if (!esCodigoDuplicado(err)) throw err
    }
  }
  if (id === undefined)
    throw new ErrorAplicacion(409, 'No se pudo generar un código de ruta; intente de nuevo.')
  await db
    .insert(rutaHistorialEstado)
    .values({ rutaId: id, estadoAnterior: null, estadoNuevo: 'borrador', usuarioId: actor.sub })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'crear',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Creó la ruta ${codigo}`,
  })
  return obtenerRuta(id)
}

async function exigirEditable(id: number) {
  const [r] = await db
    .select({ estado: ruta.estado, codigo: ruta.codigo })
    .from(ruta)
    .where(eq(ruta.id, id))
  if (!r) throw new ErrorAplicacion(404, 'La ruta no existe.')
  if (!ESTADOS_RUTA_EDITABLES.includes(r.estado)) {
    throw new ErrorAplicacion(
      409,
      `La ruta ${r.codigo} está en estado "${ETIQUETAS_ESTADO_RUTA[r.estado]}" y ya no se puede editar.`,
    )
  }
  return r
}

/** Cualquier cambio en paradas u orden invalida la geometría calculada. */
const sinGeometria = { geometria: null, distanciaM: null, duracionS: null, optimizadaEn: null }

export async function actualizarRuta(id: number, datos: ActualizarRutaInput, actor: UsuarioActual) {
  const r = await exigirEditable(id)
  if (sinCambios(datos)) return obtenerRuta(id)
  if (datos.vehiculoId !== undefined) await validarVehiculo(datos.vehiculoId)
  await db
    .update(ruta)
    .set({
      ...(datos.fecha !== undefined && { fecha: datos.fecha }),
      ...(datos.vehiculoId !== undefined && { vehiculoId: datos.vehiculoId }),
      ...(datos.observaciones !== undefined && { observaciones: datos.observaciones }),
    })
    .where(eq(ruta.id, id))
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Actualizó la ruta ${r.codigo}`,
  })
  return obtenerRuta(id)
}

/** RF-12/RF-13: reemplaza la lista completa de paradas y sus productos, en el orden recibido. */
export async function reemplazarParadas(id: number, datos: ParadasRutaInput, actor: UsuarioActual) {
  const r = await exigirEditable(id)
  const destinoIds = datos.paradas.map((p) => p.destinoId)
  const productoIds = [
    ...new Set(datos.paradas.flatMap((p) => p.productos.map((x) => x.productoId))),
  ]
  const [destinos, productos] = await Promise.all([
    destinoIds.length
      ? db
          .select({ id: destino.id, activo: destino.activo })
          .from(destino)
          .where(inArray(destino.id, destinoIds))
      : [],
    productoIds.length
      ? db
          .select({ id: producto.id, activo: producto.activo })
          .from(producto)
          .where(inArray(producto.id, productoIds))
      : [],
  ])
  const faltanDestinos = destinoIds.filter((d) => !destinos.some((x) => x.id === d && x.activo))
  if (faltanDestinos.length)
    throw new ErrorAplicacion(400, 'Uno de los destinos no existe o está desactivado.')
  const faltanProductos = productoIds.filter((p) => !productos.some((x) => x.id === p && x.activo))
  if (faltanProductos.length)
    throw new ErrorAplicacion(400, 'Uno de los productos no existe o está desactivado.')

  await db.transaction(async (tx) => {
    await tx.delete(rutaParada).where(eq(rutaParada.rutaId, id))
    for (const [i, p] of datos.paradas.entries()) {
      const [parada] = await tx
        .insert(rutaParada)
        .values({ rutaId: id, destinoId: p.destinoId, orden: i + 1 })
        .returning({ id: rutaParada.id })
      if (!parada) throw new Error('No se pudo crear la parada')
      if (p.productos.length) {
        await tx.insert(paradaProducto).values(
          p.productos.map((x) => ({
            rutaParadaId: parada.id,
            productoId: x.productoId,
            cantidad: String(x.cantidad),
          })),
        )
      }
    }
    await tx.update(ruta).set(sinGeometria).where(eq(ruta.id, id))
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'actualizar',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Definió ${datos.paradas.length} paradas en la ruta ${r.codigo}`,
  })
  return obtenerRuta(id)
}

interface Ordenada {
  id: number
  /** false para paradas que el optimizador no pudo incluir (capacidad u horario). */
  asignada: boolean
}

/**
 * Guarda orden, ETAs y geometría en una sola transacción, verificando que la ruta siga en borrador y con
 * las mismas paradas que se enviaron al motor (otra pestaña pudo cambiarlas mientras se calculaba).
 */
async function guardarRecorrido(
  id: number,
  ordenadas: Ordenada[],
  recorrido: RecorridoCalculado,
  optimizada: boolean,
) {
  await db.transaction(async (tx) => {
    const [actual] = await tx
      .select({ estado: ruta.estado })
      .from(ruta)
      .where(eq(ruta.id, id))
      .for('update')
    if (!actual || !ESTADOS_RUTA_EDITABLES.includes(actual.estado)) {
      throw new ErrorAplicacion(
        409,
        'La ruta cambió de estado mientras se calculaba el recorrido. Recargue la página.',
      )
    }
    const vigentes = await tx
      .select({ id: rutaParada.id })
      .from(rutaParada)
      .where(eq(rutaParada.rutaId, id))
    const mismas =
      vigentes.length === ordenadas.length &&
      vigentes.every((v) => ordenadas.some((o) => o.id === v.id))
    if (!mismas)
      throw new ErrorAplicacion(
        409,
        'Las paradas cambiaron mientras se calculaba el recorrido. Vuelva a intentarlo.',
      )

    // Paso intermedio para no violar la unicidad (ruta_id, orden) al renumerar.
    for (const p of ordenadas)
      await tx
        .update(rutaParada)
        .set({ orden: p.id + 100000 })
        .where(eq(rutaParada.id, p.id))
    let acumuladoS = 0
    let asignadas = 0
    for (const [i, p] of ordenadas.entries()) {
      const tramo = p.asignada ? recorrido.tramos[i] : undefined
      if (p.asignada) {
        acumuladoS += (tramo?.duracionS ?? 0) + (asignadas > 0 ? SERVICIO_PARADA_S : 0)
        asignadas++
      }
      await tx
        .update(rutaParada)
        .set({
          orden: i + 1,
          distanciaDesdeAnteriorM: p.asignada ? (tramo?.distanciaM ?? null) : null,
          etaS: p.asignada ? acumuladoS : null,
        })
        .where(eq(rutaParada.id, p.id))
    }
    const hayRecorrido = asignadas > 0 && recorrido.geometria.length > 0
    await tx
      .update(ruta)
      .set({
        geometria: hayRecorrido ? recorrido.geometria : null,
        distanciaM: hayRecorrido ? recorrido.distanciaM : null,
        duracionS: hayRecorrido ? recorrido.duracionS + SERVICIO_PARADA_S * asignadas : null,
        optimizadaEn: optimizada && hayRecorrido ? new Date() : null,
      })
      .where(eq(ruta.id, id))
  })
}

/** Calcula geometría, distancias y tiempos del recorrido bodega → paradas (orden actual) → bodega. */
export async function calcularRecorrido(id: number, actor: UsuarioActual) {
  const r = await exigirEditable(id)
  const paradas = await obtenerParadas(id)
  if (paradas.length === 0)
    throw new ErrorAplicacion(400, 'Agregue al menos una parada antes de calcular el recorrido.')
  const bodega = await obtenerBodega()
  const recorrido = await obtenerProveedorEnrutamiento().calcularRecorrido([
    bodega,
    ...paradas.map((p) => p.destino),
    bodega,
  ])
  await guardarRecorrido(
    id,
    paradas.map((p) => ({ id: p.id, asignada: true })),
    recorrido,
    false,
  )
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'calcular',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Calculó el recorrido de la ruta ${r.codigo}`,
  })
  return obtenerRuta(id)
}

/** Optimiza el orden de las paradas (VRP con capacidad y ventanas) y guarda el recorrido resultante. */
export async function optimizarRuta(id: number, actor: UsuarioActual) {
  const r = await exigirEditable(id)
  const paradas = await obtenerParadas(id)
  if (paradas.length === 0)
    throw new ErrorAplicacion(400, 'Agregue al menos una parada antes de optimizar.')
  const [bodega, [vehiculoRuta]] = await Promise.all([
    obtenerBodega(),
    db
      .select({ capacidadKg: vehiculo.capacidadKg })
      .from(ruta)
      .innerJoin(vehiculo, eq(vehiculo.id, ruta.vehiculoId))
      .where(eq(ruta.id, id)),
  ])
  const optimizables: ParadaOptimizable[] = paradas.map((p) => ({
    id: p.id,
    punto: { latitud: p.destino.latitud, longitud: p.destino.longitud },
    ventana: interpretarHorario(p.destino.horarioAtencion),
    servicioS: SERVICIO_PARADA_S,
    cargaKg: p.cargaKg,
  }))
  const resultado = await obtenerProveedorEnrutamiento().optimizar(
    bodega,
    optimizables,
    vehiculoRuta ? Number(vehiculoRuta.capacidadKg) : undefined,
  )
  // Las no asignadas (no caben por capacidad u horario) van al final, sin ETA, en su orden original.
  const asignadas = resultado.orden
    .filter((pid) => paradas.some((p) => p.id === pid))
    .map((id) => ({ id, asignada: true }))
  const noAsignadas = paradas
    .filter((p) => !resultado.orden.includes(p.id))
    .map((p) => ({ id: p.id, asignada: false }))
  await guardarRecorrido(id, [...asignadas, ...noAsignadas], resultado.recorrido, true)
  const detalleNoAsignadas = noAsignadas.map((n) => {
    const p = paradas.find((x) => x.id === n.id)
    return { paradaId: n.id, destino: p?.destino.nombreCliente ?? '' }
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'optimizar',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Optimizó el orden de la ruta ${r.codigo} (${asignadas.length} paradas, ${noAsignadas.length} sin asignar)`,
  })
  return { ruta: await obtenerRuta(id), noAsignadas: detalleNoAsignadas }
}

// ---------- Estados ----------

export async function cambiarEstado(
  id: number,
  nuevo: EstadoRuta,
  actor: UsuarioActual,
  extra: { nota?: string; campos?: Partial<typeof ruta.$inferInsert> } = {},
) {
  const [r] = await db
    .select({ estado: ruta.estado, codigo: ruta.codigo })
    .from(ruta)
    .where(eq(ruta.id, id))
  if (!r) throw new ErrorAplicacion(404, 'La ruta no existe.')
  if (!puedeTransicionar(r.estado, nuevo, actor.rol)) {
    throw new ErrorAplicacion(
      409,
      `La ruta ${r.codigo} no puede pasar de "${ETIQUETAS_ESTADO_RUTA[r.estado]}" a "${ETIQUETAS_ESTADO_RUTA[nuevo]}".`,
    )
  }
  await db.transaction(async (tx) => {
    await tx
      .update(ruta)
      .set({ estado: nuevo, ...extra.campos })
      .where(and(eq(ruta.id, id), eq(ruta.estado, r.estado)))
    await tx.insert(rutaHistorialEstado).values({
      rutaId: id,
      estadoAnterior: r.estado,
      estadoNuevo: nuevo,
      usuarioId: actor.sub,
      nota: extra.nota ?? null,
    })
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'cambiar_estado',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Ruta ${r.codigo}: ${r.estado} → ${nuevo}${extra.nota ? ` (${extra.nota})` : ''}`,
  })
  return r
}

/** RF-14: marca la ruta como planificada validando paradas, vehículo y capacidad. */
export async function planificarRuta(id: number, actor: UsuarioActual) {
  const detalle = await obtenerRuta(id)
  if (detalle.paradas.length === 0)
    throw new ErrorAplicacion(400, 'La ruta debe tener al menos una parada.')
  if (!detalle.vehiculo)
    throw new ErrorAplicacion(400, 'Seleccione el vehículo de la ruta para validar su capacidad.')
  if (detalle.cargaKg > detalle.vehiculo.capacidadKg) {
    throw new ErrorAplicacion(
      400,
      `La carga (${detalle.cargaKg} kg) supera la capacidad del vehículo ${detalle.vehiculo.placa} (${detalle.vehiculo.capacidadKg} kg). Quite productos o elija otro vehículo.`,
    )
  }
  const sinVerificar = detalle.paradas.filter((p) => !p.destino.ubicacionVerificada)
  if (sinVerificar.length) {
    throw new ErrorAplicacion(
      400,
      `Hay ${sinVerificar.length} destino(s) con ubicación por verificar: ${sinVerificar
        .map((p) => p.destino.nombreCliente)
        .slice(0, 3)
        .join(', ')}.`,
    )
  }
  await cambiarEstado(id, 'planificada', actor)
  return obtenerRuta(id)
}

export async function volverABorrador(id: number, actor: UsuarioActual) {
  await cambiarEstado(id, 'borrador', actor)
  return obtenerRuta(id)
}

export async function cancelarRuta(id: number, motivo: string | undefined, actor: UsuarioActual) {
  const r = await cambiarEstado(id, 'cancelada', actor, { nota: motivo })
  // Si tenía conductor asignado, vuelve a estar disponible.
  const [fila] = await db
    .select({ conductorId: ruta.conductorId })
    .from(ruta)
    .where(eq(ruta.id, id))
  if (fila?.conductorId && r.estado !== 'borrador' && r.estado !== 'planificada') {
    await db
      .update(conductor)
      .set({ disponibilidad: 'disponible' })
      .where(and(eq(conductor.id, fila.conductorId), eq(conductor.disponibilidad, 'en_ruta')))
  }
  return obtenerRuta(id)
}

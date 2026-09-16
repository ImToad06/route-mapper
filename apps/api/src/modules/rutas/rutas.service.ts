import {
  type ActualizarRutaInput,
  type AsignarRutaInput,
  type CrearRutaInput,
  ESTADOS_RUTA_EDITABLES,
  ESTADOS_RUTA_TERMINALES,
  type EstadoRuta,
  ETIQUETAS_ESTADO_RUTA,
  type FallarParadaInput,
  interpretarHorario,
  type ListarRutasInput,
  type ParadasRutaInput,
  puedeTransicionar,
  type ReasignarRutaInput,
  type RechazarRutaInput,
} from '@lh/shared'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  ne,
  notInArray,
  type SQL,
  sql,
} from 'drizzle-orm'
import { type Db, db } from '../../db/client.ts'
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
import { obtenerConductor } from '../conductores/conductores.service.ts'
import { obtenerBodega } from '../configuracion/configuracion.service.ts'
import { obtenerProveedorEnrutamiento } from '../enrutamiento/enrutamiento.service.ts'
import type { ParadaOptimizable, RecorridoCalculado } from '../enrutamiento/proveedor.ts'
import { crearNotificacion } from '../notificaciones/notificaciones.service.ts'
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

/** Detalle de una ruta: coordinador/administrador ven cualquiera; el conductor solo la suya. */
export async function verRuta(id: number, actor: UsuarioActual) {
  if (actor.rol === 'conductor') await obtenerRutaDelConductor(id, actor)
  return obtenerRuta(id)
}

/** Historial de una ruta: mismas reglas de acceso que {@link verRuta}. */
export async function verHistorial(id: number, actor: UsuarioActual) {
  if (actor.rol === 'conductor') await obtenerRutaDelConductor(id, actor)
  return obtenerHistorial(id)
}

/** Rutas activas (no terminales) del conductor autenticado, para "Inicio" y "Mi ruta" de su app. */
export async function misRutas(actor: UsuarioActual) {
  const [c] = await db
    .select({ id: conductor.id })
    .from(conductor)
    .where(eq(conductor.usuarioId, actor.sub))
  if (!c) return []
  const filas = await consultaResumen()
    .where(and(eq(ruta.conductorId, c.id), notInArray(ruta.estado, [...ESTADOS_RUTA_TERMINALES])))
    .orderBy(asc(ruta.fecha))
  return filas.map(aResumen)
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

function validarCapacidad(cargaKg: number, vehiculoRuta: { placa: string; capacidadKg: number }) {
  if (cargaKg > vehiculoRuta.capacidadKg) {
    throw new ErrorAplicacion(
      400,
      `La carga (${cargaKg} kg) supera la capacidad del vehículo ${vehiculoRuta.placa} (${vehiculoRuta.capacidadKg} kg). Quite productos o elija otro vehículo.`,
    )
  }
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

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export async function cambiarEstado(
  id: number,
  nuevo: EstadoRuta,
  actor: UsuarioActual,
  extra: {
    nota?: string
    campos?: Partial<typeof ruta.$inferInsert>
    /** Efectos adicionales (ej. liberar/ocupar un conductor) dentro de la misma transacción. */
    dentro?: (tx: Tx) => Promise<void>
  } = {},
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
    // Cierre optimista: si otra petición ya cambió el estado, no hay filas que actualizar.
    const actualizada = await tx
      .update(ruta)
      .set({ estado: nuevo, ...extra.campos })
      .where(and(eq(ruta.id, id), eq(ruta.estado, r.estado)))
      .returning({ id: ruta.id })
    if (!actualizada.length) {
      throw new ErrorAplicacion(
        409,
        `La ruta ${r.codigo} cambió de estado mientras se procesaba la solicitud. Intente de nuevo.`,
      )
    }
    await tx.insert(rutaHistorialEstado).values({
      rutaId: id,
      estadoAnterior: r.estado,
      estadoNuevo: nuevo,
      usuarioId: actor.sub,
      nota: extra.nota ?? null,
    })
    await extra.dentro?.(tx)
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
  validarCapacidad(detalle.cargaKg, detalle.vehiculo)
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
  // Si tenía conductor asignado, vuelve a estar disponible y se le avisa. El conductor se relee
  // dentro de la misma transacción (no antes) para no liberar/notificar a uno que ya fue reemplazado
  // por una reasignación concurrente.
  const [antes] = await db.select({ estado: ruta.estado }).from(ruta).where(eq(ruta.id, id))
  const podriaLiberar = antes && antes.estado !== 'borrador' && antes.estado !== 'planificada'
  let liberado: { usuarioId: number } | null = null
  const r = await cambiarEstado(id, 'cancelada', actor, {
    nota: motivo,
    dentro: podriaLiberar
      ? async (tx) => {
          const [fila] = await tx
            .select({ conductorId: ruta.conductorId })
            .from(ruta)
            .where(eq(ruta.id, id))
          if (!fila?.conductorId) return
          const [cond] = await tx
            .select({ usuarioId: conductor.usuarioId })
            .from(conductor)
            .where(eq(conductor.id, fila.conductorId))
          await tx
            .update(conductor)
            .set({ disponibilidad: 'disponible' })
            .where(and(eq(conductor.id, fila.conductorId), eq(conductor.disponibilidad, 'en_ruta')))
          if (cond) liberado = cond
        }
      : undefined,
  })
  // TS no reconoce que el closure de `dentro` puede reasignar `liberado` antes de este punto.
  const conductorLiberado = liberado as { usuarioId: number } | null
  if (conductorLiberado) {
    await crearNotificacion({
      usuarioId: conductorLiberado.usuarioId,
      rutaId: id,
      tipo: 'ruta_cancelada',
      titulo: 'Ruta cancelada',
      cuerpo: `Se canceló la ruta ${r.codigo}.`,
    })
  }
  return obtenerRuta(id)
}

// ---------- Asignación y ciclo de vida del conductor (RF-15 … RF-21) ----------

async function existeRutaActivaConductor(conductorId: number, fecha: string, exceptoId: number) {
  const [r] = await db
    .select({ id: ruta.id })
    .from(ruta)
    .where(
      and(
        eq(ruta.conductorId, conductorId),
        eq(ruta.fecha, fecha),
        ne(ruta.id, exceptoId),
        notInArray(ruta.estado, [...ESTADOS_RUTA_TERMINALES]),
      ),
    )
  return Boolean(r)
}

async function validarConductorAsignable(conductorId: number) {
  const c = await obtenerConductor(conductorId)
  if (!c.activo) throw new ErrorAplicacion(400, 'El conductor está desactivado.')
  if (c.disponibilidad !== 'disponible')
    throw new ErrorAplicacion(400, `El conductor ${c.nombre} no está disponible en este momento.`)
  return c
}

/**
 * Valida vehículo/capacidad y disponibilidad/conflicto de fecha del conductor: comunes a asignar
 * y reasignar. Devuelve el vehículo a guardar y la ficha del conductor ya validado.
 */
async function validarAsignacion(
  datos: { conductorId: number; vehiculoId?: number },
  detalle: Awaited<ReturnType<typeof obtenerRuta>>,
  exceptoRutaId: number,
) {
  const vehiculoId = datos.vehiculoId ?? detalle.vehiculo?.id
  if (!vehiculoId)
    throw new ErrorAplicacion(400, 'Seleccione el vehículo antes de asignar la ruta.')
  const vehiculoRuta = datos.vehiculoId ? await validarVehiculo(datos.vehiculoId) : detalle.vehiculo
  if (vehiculoRuta) validarCapacidad(detalle.cargaKg, vehiculoRuta)
  const cond = await validarConductorAsignable(datos.conductorId)
  if (await existeRutaActivaConductor(datos.conductorId, detalle.fecha, exceptoRutaId)) {
    throw new ErrorAplicacion(
      409,
      `El conductor ${cond.nombre} ya tiene otra ruta activa el ${detalle.fecha}.`,
    )
  }
  return { vehiculoId, cond }
}

/** RF-15: asigna conductor (y vehículo) a una ruta planificada; queda pendiente de aceptación. */
export async function asignarRuta(id: number, datos: AsignarRutaInput, actor: UsuarioActual) {
  const detalle = await obtenerRuta(id)
  const { vehiculoId, cond } = await validarAsignacion(datos, detalle, id)
  await cambiarEstado(id, 'pendiente_aceptacion', actor, {
    campos: {
      conductorId: cond.id,
      vehiculoId,
      asignadaEn: new Date(),
      aceptadaEn: null,
      motivoRechazo: null,
    },
    dentro: async (tx) => {
      await tx.update(conductor).set({ disponibilidad: 'en_ruta' }).where(eq(conductor.id, cond.id))
    },
  })
  await crearNotificacion({
    usuarioId: cond.usuarioId as number,
    rutaId: id,
    tipo: 'ruta_asignada',
    titulo: 'Ruta asignada',
    cuerpo: `Te asignaron la ruta ${detalle.codigo} del ${detalle.fecha}.`,
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'asignar',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Asignó la ruta ${detalle.codigo} al conductor ${cond.nombre}`,
  })
  return obtenerRuta(id)
}

/** RF-17: reasigna a otro conductor una ruta pendiente de aceptación o ya asignada. */
export async function reasignarRuta(id: number, datos: ReasignarRutaInput, actor: UsuarioActual) {
  const [r] = await db
    .select({
      estado: ruta.estado,
      codigo: ruta.codigo,
      fecha: ruta.fecha,
      conductorId: ruta.conductorId,
    })
    .from(ruta)
    .where(eq(ruta.id, id))
  if (!r) throw new ErrorAplicacion(404, 'La ruta no existe.')
  if (r.estado !== 'pendiente_aceptacion' && r.estado !== 'asignada') {
    throw new ErrorAplicacion(
      409,
      `La ruta ${r.codigo} está en estado "${ETIQUETAS_ESTADO_RUTA[r.estado]}" y no se puede reasignar.`,
    )
  }
  // Cambiar de conductor sin cambiar de estado (pendiente_aceptacion) no es una transición formal;
  // dejar "asignada" para volver a "pendiente_aceptacion" sí lo es y se valida contra TRANSICIONES_RUTA.
  if (r.estado === 'asignada' && !puedeTransicionar(r.estado, 'pendiente_aceptacion', actor.rol)) {
    throw new ErrorAplicacion(403, 'No tiene permisos para reasignar esta ruta.')
  }
  if (r.conductorId === datos.conductorId)
    throw new ErrorAplicacion(400, 'El conductor ya tiene asignada esta ruta.')
  const detalle = await obtenerRuta(id)
  const { vehiculoId, cond } = await validarAsignacion(datos, detalle, id)
  await db.transaction(async (tx) => {
    const actualizado = await tx
      .update(ruta)
      .set({
        conductorId: cond.id,
        vehiculoId,
        estado: 'pendiente_aceptacion',
        asignadaEn: new Date(),
        aceptadaEn: null,
        motivoRechazo: null,
      })
      .where(and(eq(ruta.id, id), eq(ruta.estado, r.estado)))
      .returning({ id: ruta.id })
    if (!actualizado.length)
      throw new ErrorAplicacion(409, 'La ruta cambió de estado mientras se reasignaba.')
    await tx.insert(rutaHistorialEstado).values({
      rutaId: id,
      estadoAnterior: r.estado,
      estadoNuevo: 'pendiente_aceptacion',
      usuarioId: actor.sub,
      nota: `Reasignada al conductor ${cond.nombre}`,
    })
    if (r.conductorId) {
      await tx
        .update(conductor)
        .set({ disponibilidad: 'disponible' })
        .where(and(eq(conductor.id, r.conductorId), eq(conductor.disponibilidad, 'en_ruta')))
    }
    await tx.update(conductor).set({ disponibilidad: 'en_ruta' }).where(eq(conductor.id, cond.id))
  })
  await crearNotificacion({
    usuarioId: cond.usuarioId as number,
    rutaId: id,
    tipo: 'ruta_reasignada',
    titulo: 'Ruta reasignada',
    cuerpo: `Te asignaron la ruta ${r.codigo} del ${r.fecha}.`,
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'asignar',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Reasignó la ruta ${r.codigo} al conductor ${cond.nombre}`,
  })
  return obtenerRuta(id)
}

async function obtenerRutaDelConductor(id: number, actor: UsuarioActual) {
  const [c] = await db
    .select({ id: conductor.id, nombre: conductor.nombre })
    .from(conductor)
    .where(eq(conductor.usuarioId, actor.sub))
  if (!c) throw new ErrorAplicacion(403, 'Su usuario no tiene una ficha de conductor asociada.')
  const [r] = await db
    .select({ estado: ruta.estado, codigo: ruta.codigo, conductorId: ruta.conductorId })
    .from(ruta)
    .where(eq(ruta.id, id))
  if (!r) throw new ErrorAplicacion(404, 'La ruta no existe.')
  if (r.conductorId !== c.id) throw new ErrorAplicacion(403, 'Esta ruta no está asignada a usted.')
  return { ...r, conductor: c }
}

/** RF-16 (aceptación): el conductor acepta la ruta que le asignaron. */
export async function aceptarRuta(id: number, actor: UsuarioActual) {
  const r = await obtenerRutaDelConductor(id, actor)
  await cambiarEstado(id, 'asignada', actor, { campos: { aceptadaEn: new Date() } })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'cambiar_estado',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `El conductor ${r.conductor.nombre} aceptó la ruta ${r.codigo}`,
  })
  return obtenerRuta(id)
}

/** RF-18: el conductor rechaza la ruta; vuelve a planificada para que el coordinador reasigne. */
export async function rechazarRuta(id: number, datos: RechazarRutaInput, actor: UsuarioActual) {
  const r = await obtenerRutaDelConductor(id, actor)
  const [fila] = await db.select({ creadoPor: ruta.creadoPor }).from(ruta).where(eq(ruta.id, id))
  await cambiarEstado(id, 'planificada', actor, {
    nota: datos.motivo,
    campos: { conductorId: null, asignadaEn: null, motivoRechazo: datos.motivo },
    dentro: async (tx) => {
      await tx
        .update(conductor)
        .set({ disponibilidad: 'disponible' })
        .where(eq(conductor.id, r.conductor.id))
    },
  })
  if (fila?.creadoPor) {
    await crearNotificacion({
      usuarioId: fila.creadoPor,
      rutaId: id,
      tipo: 'ruta_rechazada',
      titulo: 'Ruta rechazada',
      cuerpo: `${r.conductor.nombre} rechazó la ruta ${r.codigo}: ${datos.motivo}`,
    })
  }
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'cambiar_estado',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `El conductor ${r.conductor.nombre} rechazó la ruta ${r.codigo}: ${datos.motivo}`,
  })
  return obtenerRuta(id)
}

/** El conductor inicia el recorrido. */
export async function iniciarRuta(id: number, actor: UsuarioActual) {
  const r = await obtenerRutaDelConductor(id, actor)
  await cambiarEstado(id, 'en_curso', actor, { campos: { iniciadaEn: new Date() } })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'cambiar_estado',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `El conductor ${r.conductor.nombre} inició la ruta ${r.codigo}`,
  })
  return obtenerRuta(id)
}

async function obtenerParadaDeRutaEnCurso(id: number, paradaId: number, actor: UsuarioActual) {
  const r = await obtenerRutaDelConductor(id, actor)
  if (r.estado !== 'en_curso')
    throw new ErrorAplicacion(409, `La ruta ${r.codigo} no está en curso.`)
  const [p] = await db
    .select({ id: rutaParada.id, estadoEntrega: rutaParada.estadoEntrega })
    .from(rutaParada)
    .where(and(eq(rutaParada.id, paradaId), eq(rutaParada.rutaId, id)))
  if (!p) throw new ErrorAplicacion(404, 'La parada no existe en esta ruta.')
  if (p.estadoEntrega !== 'pendiente')
    throw new ErrorAplicacion(409, 'Esta parada ya fue registrada.')
  return r
}

/** RF-20: el conductor marca una parada como entregada. */
export async function entregarParada(id: number, paradaId: number, actor: UsuarioActual) {
  const r = await obtenerParadaDeRutaEnCurso(id, paradaId, actor)
  await db.transaction(async (tx) => {
    const actualizada = await tx
      .update(rutaParada)
      .set({ estadoEntrega: 'entregada', horaConfirmacion: new Date() })
      .where(and(eq(rutaParada.id, paradaId), eq(rutaParada.estadoEntrega, 'pendiente')))
      .returning({ id: rutaParada.id })
    if (!actualizada.length) throw new ErrorAplicacion(409, 'Esta parada ya fue registrada.')
    await tx.insert(rutaHistorialEstado).values({
      rutaId: id,
      paradaId,
      estadoAnterior: 'pendiente',
      estadoNuevo: 'entregada',
      usuarioId: actor.sub,
    })
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'cambiar_estado',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Parada entregada en la ruta ${r.codigo}`,
  })
  return obtenerRuta(id)
}

/** RF-20: el conductor reporta una novedad (no pudo entregar) en una parada. */
export async function fallarParada(
  id: number,
  paradaId: number,
  datos: FallarParadaInput,
  actor: UsuarioActual,
) {
  const r = await obtenerParadaDeRutaEnCurso(id, paradaId, actor)
  await db.transaction(async (tx) => {
    const actualizada = await tx
      .update(rutaParada)
      .set({
        estadoEntrega: 'fallida',
        horaConfirmacion: new Date(),
        novedadTipo: datos.tipo,
        novedadNota: datos.nota ?? null,
      })
      .where(and(eq(rutaParada.id, paradaId), eq(rutaParada.estadoEntrega, 'pendiente')))
      .returning({ id: rutaParada.id })
    if (!actualizada.length) throw new ErrorAplicacion(409, 'Esta parada ya fue registrada.')
    await tx.insert(rutaHistorialEstado).values({
      rutaId: id,
      paradaId,
      estadoAnterior: 'pendiente',
      estadoNuevo: 'fallida',
      usuarioId: actor.sub,
      nota: datos.nota ?? null,
    })
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'cambiar_estado',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `Novedad (${datos.tipo}) en una parada de la ruta ${r.codigo}`,
  })
  return obtenerRuta(id)
}

/** RF-21: el conductor finaliza la ruta; queda completada o incompleta según las paradas. */
export async function finalizarRuta(id: number, actor: UsuarioActual) {
  const r = await obtenerRutaDelConductor(id, actor)
  if (r.estado !== 'en_curso')
    throw new ErrorAplicacion(409, `La ruta ${r.codigo} no está en curso.`)
  const paradas = await db
    .select({ estadoEntrega: rutaParada.estadoEntrega })
    .from(rutaParada)
    .where(eq(rutaParada.rutaId, id))
  if (paradas.some((p) => p.estadoEntrega === 'pendiente'))
    throw new ErrorAplicacion(400, 'Aún hay paradas pendientes por registrar.')
  const nuevo = paradas.every((p) => p.estadoEntrega === 'entregada') ? 'completada' : 'incompleta'
  await cambiarEstado(id, nuevo, actor, {
    campos: { finalizadaEn: new Date() },
    dentro: async (tx) => {
      await tx
        .update(conductor)
        .set({ disponibilidad: 'disponible' })
        .where(eq(conductor.id, r.conductor.id))
    },
  })
  await registrarOperacion({
    usuarioId: actor.sub,
    accion: 'cambiar_estado',
    entidad: 'ruta',
    entidadId: id,
    descripcion: `El conductor ${r.conductor.nombre} finalizó la ruta ${r.codigo} (${nuevo})`,
  })
  return obtenerRuta(id)
}

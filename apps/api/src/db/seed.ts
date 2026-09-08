/**
 * Datos iniciales para desarrollo y primera puesta en marcha.
 * Idempotente: usa ON CONFLICT DO NOTHING en los catálogos.
 */
import { ROLES } from '@lh/shared'
import { count, eq } from 'drizzle-orm'
import { db, sql } from './client.ts'
import { configuracion, destino, producto, rol, usuario, vehiculo, zona } from './schema/index.ts'

const ADMIN_CORREO = process.env.SEED_ADMIN_CORREO ?? 'admin@lh.local'
const ADMIN_CONTRASENA = process.env.SEED_ADMIN_CONTRASENA ?? 'Admin12345'

await db
  .insert(rol)
  .values(ROLES.map((nombre) => ({ nombre })))
  .onConflictDoNothing()

const [rolAdmin] = await db.select().from(rol).where(eq(rol.nombre, 'administrador'))
if (!rolAdmin) throw new Error('No se pudo crear el rol administrador')

const contrasenaHash = await Bun.password.hash(ADMIN_CONTRASENA, { algorithm: 'argon2id' })
await db
  .insert(usuario)
  .values({
    rolId: rolAdmin.id,
    nombre: 'Administrador',
    correo: ADMIN_CORREO,
    contrasenaHash,
    debeCambiarContrasena: true,
  })
  .onConflictDoNothing()

await db
  .insert(vehiculo)
  .values([
    { placa: 'TAB123', tipo: 'Camión NHR', capacidadKg: '1800' },
    { placa: 'TBC456', tipo: 'Camión NPR', capacidadKg: '4500' },
    { placa: 'TCD789', tipo: 'Furgón', capacidadKg: '1200' },
  ])
  .onConflictDoNothing()

await db
  .insert(zona)
  .values([
    { nombre: 'Norte', descripcion: 'Riomar, Alto Prado, Villa Country' },
    { nombre: 'Centro', descripcion: 'Centro histórico, Boston, El Prado' },
    { nombre: 'Sur', descripcion: 'La Victoria, Simón Bolívar, Las Nieves' },
    { nombre: 'Suroccidente', descripcion: 'Ciudadela 20 de Julio, El Bosque' },
    { nombre: 'Área metropolitana', descripcion: 'Soledad, Malambo, Puerto Colombia' },
  ])
  .onConflictDoNothing()

const zonas = Object.fromEntries((await db.select().from(zona)).map((z) => [z.nombre, z.id]))
const zonaId = (nombre: string) => {
  const id = zonas[nombre]
  if (!id) throw new Error(`Zona no encontrada: ${nombre}`)
  return id
}

await db
  .insert(producto)
  .values([
    {
      codigo: 'ACE-1L',
      descripcion: 'Aceite vegetal 1 L (caja x12)',
      unidadMedida: 'caja',
      pesoKg: '11.5',
    },
    { codigo: 'ARR-25', descripcion: 'Arroz bulto 25 kg', unidadMedida: 'unidad', pesoKg: '25' },
    { codigo: 'AZU-50', descripcion: 'Azúcar bulto 50 kg', unidadMedida: 'unidad', pesoKg: '50' },
    {
      codigo: 'GAS-6',
      descripcion: 'Gaseosa 1.5 L (paca x6)',
      unidadMedida: 'paquete',
      pesoKg: '9.6',
    },
    {
      codigo: 'HAR-12',
      descripcion: 'Harina de maíz 1 kg (caja x12)',
      unidadMedida: 'caja',
      pesoKg: '12.3',
    },
    {
      codigo: 'PAP-24',
      descripcion: 'Papel higiénico (paca x24)',
      unidadMedida: 'paquete',
      pesoKg: '4.8',
    },
  ])
  .onConflictDoNothing()

// Coordenadas aproximadas de puntos reconocibles de Barranquilla, solo para desarrollo.
// `destino` no tiene clave única natural: solo se insertan si la tabla está vacía.
const [conteoDestinos] = await db.select({ total: count() }).from(destino)
if ((conteoDestinos?.total ?? 0) === 0) {
  await db.insert(destino).values([
    {
      zonaId: zonaId('Norte'),
      nombreCliente: 'Supertienda Buenavista',
      direccion: 'Calle 98 # 52-115',
      horarioAtencion: '08:00-18:00',
      latitud: 11.0198,
      longitud: -74.8266,
    },
    {
      zonaId: zonaId('Norte'),
      nombreCliente: 'Tienda Villa Country',
      direccion: 'Carrera 53 # 80-30',
      horarioAtencion: '07:00-19:00',
      latitud: 11.0072,
      longitud: -74.8106,
    },
    {
      zonaId: zonaId('Norte'),
      nombreCliente: 'Minimercado Riomar',
      direccion: 'Carrera 51B # 87-50',
      horarioAtencion: '08:00-20:00',
      latitud: 11.0145,
      longitud: -74.8215,
    },
    {
      zonaId: zonaId('Centro'),
      nombreCliente: 'Distribuidora El Prado',
      direccion: 'Carrera 54 # 70-20',
      horarioAtencion: '08:00-17:00',
      latitud: 10.9986,
      longitud: -74.7983,
    },
    {
      zonaId: zonaId('Centro'),
      nombreCliente: 'Granero Boston',
      direccion: 'Calle 64 # 41-15',
      horarioAtencion: '06:30-18:00',
      latitud: 10.9931,
      longitud: -74.7897,
    },
    {
      zonaId: zonaId('Centro'),
      nombreCliente: 'Tienda Paseo Bolívar',
      direccion: 'Calle 34 # 43-12',
      horarioAtencion: '07:00-16:00',
      latitud: 10.9838,
      longitud: -74.7822,
    },
    {
      zonaId: zonaId('Sur'),
      nombreCliente: 'Supermercado La Victoria',
      direccion: 'Calle 17 # 21-40',
      horarioAtencion: '07:00-19:00',
      latitud: 10.9635,
      longitud: -74.7935,
    },
    {
      zonaId: zonaId('Sur'),
      nombreCliente: 'Granero Simón Bolívar',
      direccion: 'Carrera 27 # 30-55',
      horarioAtencion: '06:00-18:00',
      latitud: 10.9702,
      longitud: -74.7961,
    },
    {
      zonaId: zonaId('Suroccidente'),
      nombreCliente: 'Tienda El Bosque',
      direccion: 'Carrera 8 # 45-20',
      horarioAtencion: '07:00-19:00',
      latitud: 10.9712,
      longitud: -74.8265,
    },
    {
      zonaId: zonaId('Área metropolitana'),
      nombreCliente: 'Depósito Soledad Centro',
      direccion: 'Calle 18 # 20-10, Soledad',
      horarioAtencion: '07:00-17:00',
      latitud: 10.9178,
      longitud: -74.7692,
    },
  ])
}

await db
  .insert(configuracion)
  .values([
    {
      clave: 'bodega.direccion',
      valor: 'Vía 40 # 73-290, Barranquilla',
      descripcion: 'Dirección de la bodega (inicio y fin de cada ruta)',
    },
    { clave: 'bodega.latitud', valor: '11.0053', descripcion: 'Latitud de la bodega' },
    { clave: 'bodega.longitud', valor: '-74.7936', descripcion: 'Longitud de la bodega' },
  ])
  .onConflictDoNothing()

console.log(
  `Seed aplicado. Administrador: ${ADMIN_CORREO} / ${ADMIN_CONTRASENA} (debe cambiarla al ingresar).`,
)
await sql.end()

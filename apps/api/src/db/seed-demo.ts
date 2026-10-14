/**
 * Datos de DEMOSTRACIÓN realistas (equipo, flota, catálogos y ~2 semanas de rutas).
 * Nunca contra producción: la base debe llamarse "...demo...". Se corre en local contra la API real
 * (OSRM y VROOM incluidos) y luego se copia a Render con infra/demo/cargar-en-render.sh.
 *
 *   bun --env-file=../../.env src/db/seed-demo.ts http://localhost:3902 ../../../demo-credenciales.md
 *
 * Las contraseñas quedan definitivas (sin cambio obligatorio) y se escriben en el archivo indicado.
 * Todas las fechas son relativas al día en que se ejecuta: vuelva a generarlo el día de la demostración.
 */
import postgres from 'postgres'

const API = `${process.argv[2] ?? 'http://localhost:3902'}/api`
const ARCHIVO_CREDENCIALES = process.argv[3] ?? 'demo-credenciales.md'
const BD = process.env.DATABASE_URL ?? ''
if (!new URL(BD).pathname.includes('demo')) {
  console.error('DATABASE_URL debe apuntar a una base cuyo nombre contenga "demo"')
  process.exit(1)
}
const sql = postgres(BD, { onnotice: () => {} })

// ───────────────────────── utilidades ─────────────────────────
let semilla = 20261014
function azar() {
  semilla = (semilla + 0x6d2b79f5) | 0
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const entre = (a: number, b: number) => a + Math.floor(azar() * (b - a + 1))
const elegir = <T>(xs: readonly T[]): T => xs[Math.floor(azar() * xs.length)] as T
function mezclar<T>(xs: readonly T[]): T[] {
  const r = [...xs]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[r[i], r[j]] = [r[j] as T, r[i] as T]
  }
  return r
}
const MIN = 60_000
const HORA = 60 * MIN
const DIA = 24 * HORA
const ahora = new Date()
const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const hoy0 = inicioDia(ahora)
const dia = (n: number) => new Date(hoy0.getTime() + n * DIA + 12 * HORA) // n días desde hoy, a mediodía
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const aHora = (d: Date, h: number, m = 0) => new Date(inicioDia(d).getTime() + h * HORA + m * MIN)

async function llamar<T = unknown>(
  token: string | null,
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
): Promise<T> {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status} ${await r.text()}`)
  return (await r.json()) as T
}
async function ingresar(correo: string, contrasena: string) {
  const r = await llamar<{ tokenAcceso: string }>(null, 'POST', '/auth/login', {
    correo,
    contrasena,
  })
  return r.tokenAcceso
}

// ───────────────────────── personas ─────────────────────────
const DOMINIO = 'lhdistribuciones.com'
const PALABRAS = [
  'Brisa',
  'Faro',
  'Ceiba',
  'Mango',
  'Caribe',
  'Ladrillo',
  'Tamarindo',
  'Bahia',
  'Cobre',
  'Sol',
]
const crearClave = () => `${elegir(PALABRAS)}${elegir(PALABRAS)}${entre(1000, 9999)}!`
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const correoDe = (nombre: string) => {
  const [n, a1, a2] = nombre.split(' ')
  return `${sinTildes(n as string)}.${sinTildes((a2 ?? a1) as string)}@${DOMINIO}`
}

const ADMINISTRADORES = [
  'Mauricio Herrera Llinás',
  'Carolina Escobar Barrios',
  'Ricardo Vengoechea Pinto',
]
const COORDINADORES = [
  'Paola Andrea Charris',
  'Jorge Luis Navarro',
  'Diana Marcela Pacheco',
  'Hernán Dario Ospino',
  'Liliana Cantillo Mejía',
]
const CONDUCTORES = [
  'Carlos Pérez Rojas',
  'Andrés Gómez Ruiz',
  'Luis Martínez Cano',
  'Jhon Fredy Orozco',
  'Wilmer Barrios Daza',
  'Edwin Mendoza Castro',
  'Ever Julio Támara',
  'Miguel Ángel Cervantes',
  'Rafael Olmos Pertuz',
  'Darwin Escorcia Vega',
]

// ───────────────────────── flota y catálogos ─────────────────────────
// 30 vehículos: los primeros 10 quedan ligados a un conductor; el resto está libre para armar más rutas.
const TIPOS_VEHICULO = [
  ['Camión NHR', 1800],
  ['Camión NPR', 4500],
  ['Furgón', 1200],
  ['Camión NKR', 3200],
  ['Camioneta Dmax', 1000],
  ['Camión Turbo', 3500],
  ['Camioneta Hilux', 1100],
  ['Camión Kodiak', 6000],
  ['Furgón', 1500],
  ['Camión NPR', 4500],
] as const
const LETRAS = 'ABCDEFGHJKLMNPRSTUVXZ'
const placasUsadas = new Set<string>()
const FLOTA: [string, string, number][] = Array.from({ length: 30 }, (_, i) => {
  const [tipo, kg] = TIPOS_VEHICULO[i % TIPOS_VEHICULO.length] as (typeof TIPOS_VEHICULO)[number]
  let placa = ''
  do
    placa = `${elegir(['S', 'T'])}${LETRAS[entre(0, LETRAS.length - 1)]}${LETRAS[entre(0, LETRAS.length - 1)]}${entre(100, 999)}`
  while (placasUsadas.has(placa))
  placasUsadas.add(placa)
  return [placa, tipo, kg]
})

type U = 'unidad' | 'caja' | 'paquete' | 'kg' | 'litro'
const PRODUCTOS: readonly [string, string, U, number][] = [
  ['ARR-25', 'Arroz blanco bulto 25 kg', 'unidad', 25],
  ['ARR-10', 'Arroz blanco bulto 10 kg', 'unidad', 10],
  ['AZU-50', 'Azúcar refinada bulto 50 kg', 'unidad', 50],
  ['AZU-5', 'Azúcar blanca 5 kg (paca x4)', 'paquete', 20],
  ['ACE-1L', 'Aceite vegetal 1 L (caja x12)', 'caja', 11.5],
  ['ACE-3L', 'Aceite vegetal 3 L (caja x6)', 'caja', 17],
  ['HAR-12', 'Harina de maíz precocida 1 kg (caja x12)', 'caja', 12.3],
  ['HAR-T25', 'Harina de trigo bulto 25 kg', 'unidad', 25],
  ['PAS-500', 'Pasta espagueti 500 g (caja x20)', 'caja', 10.4],
  ['ATU-170', 'Atún en aceite lata 170 g (caja x48)', 'caja', 9.8],
  ['LEC-1L', 'Leche UHT entera 1 L (caja x12)', 'caja', 12.6],
  ['LEP-400', 'Leche en polvo 400 g (caja x24)', 'caja', 10.9],
  ['HUE-30', 'Huevos AA cubeta x30 (paca x12)', 'paquete', 22],
  ['GAS-15', 'Gaseosa 1.5 L (paca x6)', 'paquete', 9.6],
  ['GAS-400', 'Gaseosa 400 ml (paca x12)', 'paquete', 5.4],
  ['AGU-600', 'Agua sin gas 600 ml (paca x24)', 'paquete', 15],
  ['AGU-5L', 'Agua en botellón 5 L (unidad)', 'unidad', 5.3],
  ['JUG-1L', 'Jugo de fruta 1 L (caja x12)', 'caja', 12.8],
  ['CAF-250', 'Café molido 250 g (caja x24)', 'caja', 6.4],
  ['CHO-250', 'Chocolate de mesa 250 g (caja x20)', 'caja', 5.6],
  ['SAL-500', 'Sal refinada 500 g (caja x24)', 'caja', 12.4],
  ['LEN-500', 'Lenteja 500 g (caja x20)', 'caja', 10.3],
  ['FRI-500', 'Fríjol cargamanto 500 g (caja x20)', 'caja', 10.3],
  ['PAN-500', 'Panela pulverizada 500 g (caja x20)', 'caja', 10.4],
  ['MAR-250', 'Margarina 250 g (caja x30)', 'caja', 8.1],
  ['SAL-TOM', 'Salsa de tomate 400 g (caja x24)', 'caja', 10.6],
  ['MAY-400', 'Mayonesa 400 g (caja x24)', 'caja', 10.8],
  ['GAL-6', 'Galletas saladas (caja x6 paquetes x12)', 'caja', 7.2],
  ['SNK-30', 'Pasabocas surtidos (caja x30)', 'caja', 4.5],
  ['PAP-24', 'Papel higiénico x24 rollos', 'paquete', 4.8],
  ['SER-12', 'Servilletas x300 (paca x12)', 'paquete', 3.2],
  ['DET-1K', 'Detergente en polvo 1 kg (caja x12)', 'caja', 12.5],
  ['DET-5K', 'Detergente en polvo 5 kg (unidad)', 'unidad', 5.1],
  ['JAB-300', 'Jabón de barra 300 g (caja x30)', 'caja', 9.4],
  ['CLO-1L', 'Blanqueador 1 L (caja x12)', 'caja', 12.9],
  ['SUA-900', 'Suavizante 900 ml (caja x12)', 'caja', 11.6],
  ['SHA-400', 'Champú 400 ml (caja x12)', 'caja', 5.9],
  ['CRE-100', 'Crema dental 100 g (caja x48)', 'caja', 6.2],
  ['PAN-G', 'Pañales talla G x30 (paca x4)', 'paquete', 8.6],
  ['TOA-80', 'Toallas higiénicas x10 (caja x24)', 'caja', 2.8],
  ['MAI-500', 'Maíz pira 500 g (caja x20)', 'caja', 10.4],
]

type Barrio = readonly [string, number, number]
const BARRIOS: Record<string, readonly Barrio[]> = {
  Norte: [
    ['Riomar', 11.0165, -74.824],
    ['Villa Country', 11.007, -74.81],
    ['Alto Prado', 11.0, -74.803],
    ['El Golf', 11.0035, -74.8135],
    ['Buenavista', 11.0198, -74.8266],
  ],
  Centro: [
    ['Centro', 10.9848, -74.7825],
    ['Boston', 10.9931, -74.7897],
    ['El Prado', 10.9986, -74.7983],
    ['Barrio Abajo', 10.993, -74.777],
    ['San Roque', 10.976, -74.783],
  ],
  Sur: [
    ['La Victoria', 10.9635, -74.7935],
    ['Simón Bolívar', 10.9702, -74.7961],
    ['Las Nieves', 10.961, -74.7875],
    ['Carrizal', 10.956, -74.796],
  ],
  Suroccidente: [
    ['El Bosque', 10.9712, -74.8265],
    ['Ciudadela 20 de Julio', 10.95, -74.82],
    ['Los Almendros', 10.956, -74.805],
    ['Cevillar', 10.953, -74.813],
  ],
  'Área metropolitana': [
    ['Soledad Centro', 10.9178, -74.7692],
    ['Soledad 2000', 10.919, -74.781],
    ['Malambo', 10.859, -74.774],
    ['Puerto Colombia', 10.9889, -74.9547],
  ],
}
const TIPOS_NEGOCIO = [
  'Tienda',
  'Minimercado',
  'Supermercado',
  'Granero',
  'Autoservicio',
  'Distribuidora',
  'Panadería',
  'Restaurante',
  'Cafetería',
  'Droguería',
  'Hotel',
  'Colegio',
  'Comisariato',
]
const NOMBRES_NEGOCIO = [
  'La Esquina',
  'Doña Rosa',
  'El Paisa',
  'Los Almendros',
  'San José',
  'La Económica',
  'El Mercadito',
  'Santa Lucía',
  'Don Pacho',
  'La Estrella',
  'El Rincón Costeño',
  'Mi Barrio',
  'La Surtidora',
  'El Ahorro',
  'Los Hermanos',
  'La Cosecha',
  'Nueva Esperanza',
  'El Portal',
  'La Fortuna',
  'Brisas del Mar',
  'El Tamarindo',
  'La Ceiba',
  'Casa Blanca',
  'El Cóndor',
  'Punto Fresco',
  'La Bendición',
  'San Judas',
  'Villa Real',
  'El Triunfo',
  'Cielo Azul',
  'La Palmera',
  'El Mirador',
  'Don Julio',
  'Doña Marta',
  'Los Pinos',
  'La Candelaria',
  'El Gran Surtido',
  'Santa Rita',
  'El Faro',
  'Mar Caribe',
]

// ───────────────────────── carga de catálogos ─────────────────────────
const idRol = async (n: string) =>
  ((await sql`SELECT id FROM rol WHERE nombre::text = ${n}`)[0] as { id: number }).id
const [rolAdmin, rolCoord, rolCond] = [
  await idRol('administrador'),
  await idRol('coordinador'),
  await idRol('conductor'),
]
const haceMucho = new Date(ahora.getTime() - 40 * DIA)

await sql`DELETE FROM usuario` // la base ya trae un administrador de arranque: se reemplaza por el equipo de la demo
const credenciales: {
  rol: string
  nombre: string
  correo: string
  clave: string
  extra?: string
}[] = []

async function crearUsuario(rolId: number, rol: string, nombre: string, correoForzado?: string) {
  const clave = crearClave()
  const correo = correoForzado ?? correoDe(nombre)
  const hash = await Bun.password.hash(clave, { algorithm: 'argon2id' })
  const [u] = await sql`
    INSERT INTO usuario (rol_id, nombre, correo, contrasena_hash, debe_cambiar_contrasena, activo, creado_en, actualizado_en)
    VALUES (${rolId}, ${nombre}, ${correo}, ${hash}, false, true, ${haceMucho}, ${haceMucho}) RETURNING id`
  credenciales.push({ rol, nombre, correo, clave })
  return (u as { id: number }).id
}

const idsAdmin: number[] = []
for (const n of ADMINISTRADORES) idsAdmin.push(await crearUsuario(rolAdmin, 'administrador', n))
const idsCoord: number[] = []
for (const n of COORDINADORES) idsCoord.push(await crearUsuario(rolCoord, 'coordinador', n))

await sql`INSERT INTO zona (nombre, descripcion) VALUES
  ('Norte', 'Riomar, Alto Prado, Villa Country, El Golf'),
  ('Centro', 'Centro histórico, Boston, El Prado, Barrio Abajo'),
  ('Sur', 'La Victoria, Simón Bolívar, Las Nieves, Carrizal'),
  ('Suroccidente', 'Ciudadela 20 de Julio, El Bosque, Los Almendros'),
  ('Área metropolitana', 'Soledad, Malambo, Puerto Colombia')
  ON CONFLICT DO NOTHING`
const zonas = Object.fromEntries(
  (await sql`SELECT id, nombre FROM zona`).map((z) => [z.nombre as string, z.id as number]),
)

for (const [placa, tipo, kg] of FLOTA)
  await sql`INSERT INTO vehiculo (placa, tipo, capacidad_kg, creado_en) VALUES (${placa}, ${tipo}, ${kg}, ${haceMucho})`
const vehiculos = await sql`SELECT id, placa, capacidad_kg::float AS cap FROM vehiculo ORDER BY id`

const idsConductorUsuario: number[] = []
const idsConductor: number[] = []
for (const [i, nombre] of CONDUCTORES.entries()) {
  const uid = await crearUsuario(rolCond, 'conductor', nombre)
  idsConductorUsuario.push(uid)
  const documento = String(entre(10_000_000, 1_149_999_999))
  const [c] = await sql`
    INSERT INTO conductor (usuario_id, nombre, documento, licencia, telefono, disponibilidad, vehiculo_id, creado_en)
    VALUES (${uid}, ${nombre}, ${documento}, ${`${elegir(['C1', 'C2', 'C3'])}-${entre(1_000_000, 4_999_999)}`},
            ${`3${entre(0, 2)}${entre(0, 9)}${entre(1_000_000, 9_999_999)}`},
            ${i === CONDUCTORES.length - 1 ? 'inactivo' : 'disponible'}::disponibilidad_conductor,
            ${(vehiculos[i] as { id: number }).id}, ${haceMucho}) RETURNING id`
  idsConductor.push((c as { id: number }).id)
}

for (const [codigo, descripcion, unidad, peso] of PRODUCTOS)
  await sql`INSERT INTO producto (codigo, descripcion, unidad_medida, peso_kg, creado_en)
            VALUES (${codigo}, ${descripcion}, ${unidad}::unidad_medida, ${peso}, ${haceMucho})`
const productos = await sql`SELECT id, peso_kg::float AS peso FROM producto ORDER BY id`

// Destinos: ~14 por zona, con coordenadas de los barrios reales y un pequeño desplazamiento.
const nombresUsados = new Set<string>()
const destinosPorZona: Record<string, number[]> = {}
for (const [zona, barrios] of Object.entries(BARRIOS)) {
  destinosPorZona[zona] = []
  const cantidad = zona === 'Área metropolitana' ? 10 : 14
  for (let i = 0; i < cantidad; i++) {
    const [barrio, lat, lon] = elegir(barrios)
    let nombre = ''
    do nombre = `${elegir(TIPOS_NEGOCIO)} ${elegir(NOMBRES_NEGOCIO)}`
    while (nombresUsados.has(nombre))
    nombresUsados.add(nombre)
    const calle = `${elegir(['Calle', 'Carrera'])} ${entre(20, 98)}${elegir(['', '', 'B', 'C'])} # ${entre(18, 80)}-${entre(1, 99)}`
    const abre = elegir(['06:00', '07:00', '07:00', '08:00'])
    const cierra = elegir(['17:00', '18:00', '19:00', '20:00'])
    const [d] = await sql`
      INSERT INTO destino (zona_id, nombre_cliente, direccion, horario_atencion, telefono, latitud, longitud,
                           ubicacion_verificada, creado_en, actualizado_en)
      VALUES (${zonas[zona] as number}, ${nombre}, ${`${calle}, ${barrio}`}, ${`${abre}-${cierra}`},
              ${`3${entre(0, 2)}${entre(0, 9)}${entre(1_000_000, 9_999_999)}`},
              ${lat + (azar() - 0.5) * 0.007}, ${lon + (azar() - 0.5) * 0.007}, true, ${haceMucho}, ${haceMucho})
      RETURNING id`
    ;(destinosPorZona[zona] as number[]).push((d as { id: number }).id)
  }
}

// Bitácora de la carga inicial de catálogos (aparece en el módulo de Bitácora con fechas de hace semanas).
{
  const quien = idsAdmin[0] as number
  const filas: { u: number; a: string; e: string; id: number | null; d: string; t: Date }[] = []
  const hace = (dias: number) => new Date(ahora.getTime() - dias * DIA - entre(0, 8) * HORA)
  for (const [i, nombre] of CONDUCTORES.entries())
    filas.push({
      u: quien,
      a: 'crear',
      e: 'conductor',
      id: idsConductor[i] as number,
      d: `Registró al conductor ${nombre}`,
      t: hace(entre(25, 38)),
    })
  for (const [placa, tipo] of FLOTA)
    filas.push({
      u: quien,
      a: 'crear',
      e: 'vehiculo',
      id: null,
      d: `Registró el vehículo ${placa} (${tipo})`,
      t: hace(entre(30, 38)),
    })
  for (const [codigo] of PRODUCTOS)
    filas.push({
      u: idsCoord[0] as number,
      a: 'crear',
      e: 'producto',
      id: null,
      d: `Registró el producto ${codigo}`,
      t: hace(entre(22, 36)),
    })
  for (const n of COORDINADORES)
    filas.push({
      u: quien,
      a: 'crear',
      e: 'usuario',
      id: null,
      d: `Creó el usuario ${correoDe(n)} con rol coordinador`,
      t: hace(entre(34, 39)),
    })
  for (const f of filas)
    await sql`INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, descripcion, fecha_hora)
              VALUES (${f.u}, ${f.a}, ${f.e}, ${f.id}, ${f.d}, ${f.t})`
}

// ───────────────────────── rutas ─────────────────────────
const tokensStaff = await Promise.all(
  [...credenciales.slice(0, ADMINISTRADORES.length + COORDINADORES.length)].map((c) =>
    ingresar(c.correo, c.clave),
  ),
)
const tokensConductor: string[] = []
for (const [i] of CONDUCTORES.entries()) {
  const c = credenciales[
    ADMINISTRADORES.length + COORDINADORES.length + i
  ] as (typeof credenciales)[number]
  tokensConductor.push(await ingresar(c.correo, c.clave))
}
let turno = 0
const staff = () => tokensStaff[turno++ % tokensStaff.length] as string
const conductoresActivos = idsConductor.slice(0, -1).map((_, i) => i) // el último está de vacaciones
const nombreZonas = Object.keys(destinosPorZona)

const OBSERVACIONES = [
  'Pedidos de mercado, entrega en la mañana',
  'Reposición semanal de abarrotes',
  'Clientes con ventana horaria estricta',
  'Incluye pedido grande de bebidas',
  'Prioridad: panaderías y restaurantes',
  'Ruta de ruteo habitual',
  'Pedidos de ayer pendientes de despacho',
  null,
  null,
]

interface Hitos {
  creado: Date
  optimizada: Date
  asignada: Date | null
  aceptada: Date | null
  iniciada: Date | null
  finalizada: Date | null
  confirmaciones: Date[]
}

async function armarRuta(conductorIdx: number, fecha: Date) {
  const veh = vehiculos[conductorIdx] as { id: number; cap: number }
  const zona = elegir(nombreZonas)
  const k = entre(4, 8)
  let ids = mezclar(destinosPorZona[zona] as number[]).slice(0, k)
  if (azar() < 0.3) {
    const otra = elegir(nombreZonas.filter((z) => z !== zona))
    ids = [...ids.slice(0, k - 2), ...mezclar(destinosPorZona[otra] as number[]).slice(0, 2)]
  }
  // Productos: 2 a 4 por parada, escalando para no pasar del 90 % de la capacidad del vehículo.
  const paradas = ids.map((destinoId) => ({
    destinoId,
    productos: mezclar(productos)
      .slice(0, entre(2, 4))
      .map((p) => ({ productoId: p.id as number, cantidad: entre(1, 6), peso: p.peso as number })),
  }))
  const carga = () =>
    paradas.reduce((s, p) => s + p.productos.reduce((a, x) => a + x.cantidad * x.peso, 0), 0)
  while (carga() > veh.cap * 0.9)
    for (const p of paradas) for (const x of p.productos) x.cantidad = Math.max(1, x.cantidad - 1)
  const token = staff()
  const { id } = await llamar<{ id: number }>(token, 'POST', '/rutas', {
    fecha: iso(fecha),
    vehiculoId: veh.id,
    observaciones: elegir(OBSERVACIONES),
  })
  await llamar(token, 'PUT', `/rutas/${id}/paradas`, {
    paradas: paradas.map((p) => ({
      destinoId: p.destinoId,
      productos: p.productos.map((x) => ({ productoId: x.productoId, cantidad: x.cantidad })),
    })),
  })
  await llamar(token, 'POST', `/rutas/${id}/optimizar`)
  return { id, token }
}

async function planificarYAsignar(id: number, token: string, conductorIdx: number) {
  await llamar(token, 'POST', `/rutas/${id}/planificar`)
  await llamar(token, 'POST', `/rutas/${id}/asignar`, { conductorId: idsConductor[conductorIdx] })
}

/** Conductor acepta, inicia y resuelve `hechas` paradas (todas si es undefined). Devuelve cuántas fallaron. */
async function recorrer(id: number, conductorIdx: number, hechas?: number, finalizar = true) {
  const t = tokensConductor[conductorIdx] as string
  await llamar(t, 'POST', `/rutas/${id}/aceptar`)
  await llamar(t, 'POST', `/rutas/${id}/iniciar`)
  const paradas = await sql`SELECT id FROM ruta_parada WHERE ruta_id = ${id} ORDER BY orden`
  const lote = hechas === undefined ? paradas : paradas.slice(0, hechas)
  const falla = azar() < 0.12 ? entre(0, paradas.length - 1) : -1
  let fallidas = 0
  for (const [i, p] of lote.entries()) {
    if (i === falla) {
      fallidas++
      await llamar(t, 'POST', `/rutas/${id}/paradas/${p.id}/fallar`, {
        tipo: elegir([
          'cliente_ausente',
          'cliente_ausente',
          'rechazo_mercancia',
          'direccion_incorrecta',
          'devolucion_parcial',
        ]),
        nota:
          elegir([
            'El local estaba cerrado',
            'El encargado no estaba para recibir',
            'Pidió reprogramar para mañana',
            'Mercancía con empaque dañado',
            null,
          ]) ?? undefined,
      })
    } else await llamar(t, 'POST', `/rutas/${id}/paradas/${p.id}/entregar`)
  }
  if (finalizar) await llamar(t, 'POST', `/rutas/${id}/finalizar`)
  return fallidas
}

/** Reescribe las marcas de tiempo de una ruta (y de lo que la rodea) para que parezca de otro momento. */
async function reubicar(id: number, fecha: Date, hitos: Partial<Hitos>) {
  // Rutas creadas la tarde anterior a su asignación, salvo que se indique otra cosa.
  const h = { ...hitos }
  const ref = h.asignada ?? h.optimizada ?? h.finalizada
  if (!h.creado && ref) h.creado = new Date(ref.getTime() - 16 * HORA)
  if (!h.optimizada && h.creado && h.asignada)
    h.optimizada = new Date(h.creado.getTime() + 12 * MIN)
  const paradas = await sql`SELECT id, orden FROM ruta_parada WHERE ruta_id = ${id} ORDER BY orden`
  await sql`UPDATE ruta SET fecha = ${iso(fecha)},
      creado_en = COALESCE(${h.creado ?? null}, creado_en),
      optimizada_en = COALESCE(${h.optimizada ?? null}, optimizada_en),
      asignada_en = COALESCE(${h.asignada ?? null}, asignada_en),
      aceptada_en = COALESCE(${h.aceptada ?? null}, aceptada_en),
      iniciada_en = COALESCE(${h.iniciada ?? null}, iniciada_en),
      finalizada_en = COALESCE(${h.finalizada ?? null}, finalizada_en),
      actualizado_en = ${h.finalizada ?? h.iniciada ?? h.aceptada ?? h.asignada ?? h.optimizada ?? h.creado ?? ahora}
    WHERE id = ${id}`
  const conf = h.confirmaciones ?? []
  for (const [i, p] of paradas.entries())
    if (conf[i])
      await sql`UPDATE ruta_parada SET hora_confirmacion = ${conf[i] as Date} WHERE id = ${p.id}`
  const porEstado: Record<string, Date | null | undefined> = {
    borrador: h.creado,
    planificada: h.optimizada ? new Date(h.optimizada.getTime() + 6 * MIN) : undefined,
    pendiente_aceptacion: h.asignada,
    asignada: h.aceptada,
    en_curso: h.iniciada,
    completada: h.finalizada,
    incompleta: h.finalizada,
    cancelada: h.finalizada ?? h.optimizada,
  }
  const hist =
    await sql`SELECT id, estado_nuevo, parada_id FROM ruta_historial_estado WHERE ruta_id = ${id} ORDER BY id`
  for (const r of hist) {
    let t: Date | null | undefined
    if (r.parada_id) {
      const idx = paradas.findIndex((p) => p.id === r.parada_id)
      t = conf[idx]
    } else t = porEstado[r.estado_nuevo as string]
    if (t) await sql`UPDATE ruta_historial_estado SET fecha_hora = ${t} WHERE id = ${r.id}`
  }
  const bit =
    await sql`SELECT id, accion, descripcion FROM bitacora WHERE entidad = 'ruta' AND entidad_id = ${id} ORDER BY id`
  for (const b of bit) {
    const d = b.descripcion as string
    let t: Date | null | undefined
    if (b.accion === 'crear') t = h.creado
    else if (b.accion === 'actualizar') t = new Date((h.creado as Date).getTime() + 4 * MIN)
    else if (b.accion === 'calcular' || b.accion === 'optimizar') t = h.optimizada
    else if (b.accion === 'asignar') t = h.asignada
    else if (b.accion === 'cambiar_estado') t = porEstado[d.split('→ ')[1]?.trim() ?? '']
    else if (b.accion === 'cancelar') t = h.finalizada
    if (t) await sql`UPDATE bitacora SET fecha_hora = ${t} WHERE id = ${b.id}`
  }
  if (h.asignada)
    await sql`UPDATE notificacion SET creado_en = ${h.asignada},
      leida_en = ${h.finalizada || h.iniciada ? new Date(h.asignada.getTime() + entre(3, 25) * MIN) : null}
      WHERE ruta_id = ${id}`
}

/** Hitos de una ruta ya terminada de un día pasado (jornada de ~7 h con tiempos de servicio). */
async function hitosPasados(id: number, dia: Date, anclaInicio?: Date): Promise<Partial<Hitos>> {
  const paradas = await sql`SELECT eta_s FROM ruta_parada WHERE ruta_id = ${id} ORDER BY orden`
  const ayer = new Date(dia.getTime() - DIA)
  const creado = aHora(ayer, entre(15, 17), entre(0, 59))
  const optimizada = new Date(creado.getTime() + entre(8, 25) * MIN)
  const asignada = new Date(optimizada.getTime() + entre(5, 30) * MIN)
  const aceptada = anclaInicio
    ? new Date(anclaInicio.getTime() - entre(12, 40) * MIN)
    : aHora(dia, 5, entre(40, 59))
  const iniciada = anclaInicio ?? new Date(aceptada.getTime() + entre(12, 35) * MIN)
  let ultimo = iniciada.getTime()
  const confirmaciones = paradas.map((p, i) => {
    const previsto =
      iniciada.getTime() + (p.eta_s as number) * 1000 * (1 + azar() * 0.35) + i * entre(5, 9) * MIN
    ultimo = Math.max(ultimo + 6 * MIN, previsto)
    return new Date(ultimo)
  })
  return {
    creado,
    optimizada,
    asignada,
    aceptada,
    iniciada,
    confirmaciones,
    finalizada: new Date(ultimo + entre(12, 28) * MIN),
  }
}

// 1) Historial: los últimos 8 días (sin domingos), 5–9 rutas diarias, con algunas incompletas.
for (let n = 8; n >= 1; n--) {
  const fecha = dia(-n)
  const dow = fecha.getDay()
  if (dow === 0) continue
  const cuantas = dow === 6 ? entre(4, 5) : entre(6, 9)
  const orden = mezclar(conductoresActivos).slice(0, cuantas)
  for (const [j, c] of orden.entries()) {
    const { id, token } = await armarRuta(c, hoy0) // se crea con la fecha de hoy y luego se reubica
    await planificarYAsignar(id, token, c)
    if (n === 4 && j === 0) {
      // Un conductor rechaza y la ruta se reasigna a otro.
      await llamar(tokensConductor[c] as string, 'POST', `/rutas/${id}/rechazar`, {
        motivo: 'Tengo la camioneta en taller',
      })
      const otro =
        conductoresActivos.find((x) => !orden.includes(x)) ?? (c + 1) % conductoresActivos.length
      await llamar(token, 'POST', `/rutas/${id}/asignar`, { conductorId: idsConductor[otro] })
      await recorrer(id, otro)
      await reubicar(id, fecha, await hitosPasados(id, fecha))
    } else {
      await recorrer(id, c)
      await reubicar(id, fecha, await hitosPasados(id, fecha))
    }
  }
  // Una ruta cancelada cada par de días.
  if (n % 2 === 0) {
    const c = elegir(conductoresActivos)
    const { id, token } = await armarRuta(c, hoy0)
    await llamar(token, 'POST', `/rutas/${id}/planificar`)
    await llamar(token, 'POST', `/rutas/${id}/cancelar`, {
      motivo: elegir([
        'El cliente reprogramó el pedido',
        'Vehículo en mantenimiento',
        'Pedido duplicado',
      ]),
    })
    const ayer = new Date(fecha.getTime() - DIA)
    await reubicar(id, fecha, {
      creado: aHora(ayer, 16, 10),
      optimizada: aHora(ayer, 16, 25),
      finalizada: aHora(ayer, 17, 5),
    })
  }
  console.log(`  ${iso(fecha)}: ${cuantas} rutas`)
}

// 2) Hoy: 2 terminadas, 3 en curso, 1 aceptada, 2 pendientes de aceptación (una sin responder), 2 planificadas, 1 borrador.
const libres = mezclar(conductoresActivos)
const [cTerm, cCurso, cAcep, cPend] = [
  libres.slice(0, 3),
  libres.slice(3, 6),
  libres.slice(6, 7),
  libres.slice(7, 9),
]

for (const c of cTerm as number[]) {
  const { id, token } = await armarRuta(c, hoy0)
  await planificarYAsignar(id, token, c)
  await recorrer(id, c)
  const inicio = new Date(ahora.getTime() - entre(270, 340) * MIN)
  const h = await hitosPasados(id, hoy0, inicio)
  const tope = ahora.getTime() - 20 * MIN
  h.confirmaciones = (h.confirmaciones as Date[]).map(
    (d, i, a) => new Date(Math.min(d.getTime(), tope - (a.length - i) * 4 * MIN)),
  )
  h.finalizada = new Date(Math.min((h.finalizada as Date).getTime(), tope))
  h.creado = new Date(inicio.getTime() - entre(14, 20) * HORA)
  h.optimizada = new Date((h.creado as Date).getTime() + 12 * MIN)
  h.asignada = new Date((h.optimizada as Date).getTime() + 20 * MIN)
  await reubicar(id, hoy0, h)
}
for (const c of cCurso as number[]) {
  const { id, token } = await armarRuta(c, hoy0)
  await planificarYAsignar(id, token, c)
  const total = (await sql`SELECT count(*)::int AS n FROM ruta_parada WHERE ruta_id = ${id}`)[0]
    ?.n as number
  const hechas = entre(1, Math.max(1, total - 2))
  await recorrer(id, c, hechas, false)
  const inicio = new Date(ahora.getTime() - entre(80, 200) * MIN)
  const conf: Date[] = []
  for (let i = 0; i < hechas; i++)
    conf.push(
      new Date(
        inicio.getTime() + ((i + 1) * (ahora.getTime() - inicio.getTime() - 15 * MIN)) / hechas,
      ),
    )
  await reubicar(id, hoy0, {
    creado: new Date(inicio.getTime() - entre(14, 20) * HORA),
    optimizada: new Date(inicio.getTime() - entre(13, 19) * HORA),
    asignada: new Date(inicio.getTime() - entre(60, 120) * MIN),
    aceptada: new Date(inicio.getTime() - entre(15, 40) * MIN),
    iniciada: inicio,
    confirmaciones: conf,
  })
}
{
  const c = (cAcep as number[])[0] as number
  const { id, token } = await armarRuta(c, hoy0)
  await planificarYAsignar(id, token, c)
  await llamar(tokensConductor[c] as string, 'POST', `/rutas/${id}/aceptar`)
  await reubicar(id, hoy0, {
    asignada: new Date(ahora.getTime() - 55 * MIN),
    aceptada: new Date(ahora.getTime() - 38 * MIN),
  })
}
for (const [i, c] of (cPend as number[]).entries()) {
  const { id, token } = await armarRuta(c, hoy0)
  await planificarYAsignar(id, token, c)
  await reubicar(id, hoy0, { asignada: new Date(ahora.getTime() - (i === 0 ? 47 : 9) * MIN) }) // la primera lleva >30 min sin respuesta
}
for (let i = 0; i < 3; i++) {
  const { id, token } = await armarRuta(libres[8] as number, hoy0)
  if (i < 2) await llamar(token, 'POST', `/rutas/${id}/planificar`)
}

// 3) Próximos días: ya planificadas o asignadas, y algunas aún en borrador.
const futuros: [number, ('borrador' | 'planificada' | 'pendiente' | 'asignada')[]][] = [
  [1, ['asignada', 'asignada', 'asignada', 'pendiente', 'pendiente', 'planificada', 'planificada']],
  [2, ['pendiente', 'planificada', 'planificada', 'planificada', 'borrador', 'borrador']],
  [3, ['planificada', 'borrador', 'borrador', 'borrador']],
]
for (const [n, estados] of futuros) {
  const fecha = dia(n)
  const orden = mezclar(conductoresActivos)
  for (const [j, e] of estados.entries()) {
    const c = orden[j] as number
    const { id, token } = await armarRuta(c, fecha)
    if (e === 'borrador') continue
    await llamar(token, 'POST', `/rutas/${id}/planificar`)
    if (e === 'planificada') continue
    // Asignar marca al conductor "en ruta": para programar días futuros se le libera antes de cada asignación.
    await sql`UPDATE conductor SET disponibilidad = 'disponible' WHERE id = ${idsConductor[c] as number}`
    await llamar(token, 'POST', `/rutas/${id}/asignar`, { conductorId: idsConductor[c] })
    if (e === 'asignada') await llamar(tokensConductor[c] as string, 'POST', `/rutas/${id}/aceptar`)
  }
  console.log(`  ${iso(fecha)}: ${estados.length} rutas programadas`)
}

// ───────────────────────── acabado ─────────────────────────
// Disponibilidad coherente con el día, códigos únicos por fecha y sin rastros de las sesiones del script.
await sql`UPDATE conductor SET disponibilidad = 'disponible' WHERE disponibilidad <> 'inactivo'`
await sql`UPDATE conductor SET disponibilidad = 'en_ruta' WHERE id IN (
  SELECT conductor_id FROM ruta WHERE fecha = ${iso(hoy0)} AND estado IN ('pendiente_aceptacion', 'asignada', 'en_curso'))`
await sql`UPDATE ruta r SET codigo = 'T-' || r.id`
await sql`UPDATE ruta r SET codigo = 'R-' || to_char(r.fecha, 'YYYYMMDD') || '-' || lpad(x.n::text, 2, '0')
          FROM (SELECT id, row_number() OVER (PARTITION BY fecha ORDER BY creado_en, id) AS n FROM ruta) x WHERE x.id = r.id`
await sql`DELETE FROM sesion`
await sql`DELETE FROM intento_acceso`

// Los textos de la bitácora y de las notificaciones traen el código antiguo (R-<fecha de hoy>-NN): se actualizan.
const rutasFin = await sql`SELECT id, codigo FROM ruta`
for (const r of rutasFin) {
  await sql`UPDATE bitacora SET descripcion = regexp_replace(descripcion, 'R-\d{8}-\d+', ${r.codigo as string}) WHERE entidad = 'ruta' AND entidad_id = ${r.id as number}`
  await sql`UPDATE notificacion SET cuerpo = regexp_replace(cuerpo, 'R-\d{8}-\d+', ${r.codigo as string}) WHERE ruta_id = ${r.id as number}`
}

// ───────────────────────── credenciales ─────────────────────────
const tabla = (rol: string) =>
  credenciales
    .filter((c) => c.rol === rol)
    .map((c) => `| ${c.nombre} | \`${c.correo}\` | \`${c.clave}\` |`)
    .join('\n')
const md = `# Credenciales de la demostración (L&H Distribuciones)

Generado el ${ahora.toLocaleString('es-CO')}. Contraseñas definitivas: no piden cambio al ingresar.
**No subir a git.** Los conductores entran con el perfil **Transportista**; administradores y coordinadores con **Coordinador**.

## Administradores (acceso total, incluye Usuarios y Bitácora)
| Nombre | Correo | Contraseña |
|---|---|---|
${tabla('administrador')}

## Coordinadores (rutas, catálogos y reportes)
| Nombre | Correo | Contraseña |
|---|---|---|
${tabla('coordinador')}

## Conductores (app móvil)
| Nombre | Correo | Contraseña |
|---|---|---|
${tabla('conductor')}

El último conductor (${CONDUCTORES.at(-1)}) figura como **inactivo** (vacaciones).
`
await Bun.write(ARCHIVO_CREDENCIALES, md)

const [r] =
  await sql`SELECT (SELECT count(*) FROM ruta) rutas, (SELECT count(*) FROM ruta_parada) paradas,
  (SELECT count(*) FROM destino) destinos, (SELECT count(*) FROM producto) productos`
console.log('Demo lista:', r, `· credenciales en ${ARCHIVO_CREDENCIALES}`)
await sql.end()

/**
 * Resume las mediciones del piloto: bun docs/piloto/resumen.ts docs/piloto/mediciones.csv
 * Columnas: fecha,ruta,metodo(manual|sistema),paradas,minutos_planificacion,errores_solapamiento,
 *           errores_sobrecapacidad,errores_otros,entregas_realizadas,entregas_fallidas
 */
export type Metodo = 'manual' | 'sistema'
export type Medicion = {
  metodo: Metodo
  paradas: number
  minutos: number
  errores: number
  realizadas: number
  fallidas: number
}

const ENCABEZADOS = [
  'fecha',
  'ruta',
  'metodo',
  'paradas',
  'minutos_planificacion',
  'errores_solapamiento',
  'errores_sobrecapacidad',
  'errores_otros',
  'entregas_realizadas',
  'entregas_fallidas',
]

export function leerCsv(texto: string): Medicion[] {
  const [cabecera, ...filas] = texto.trim().split(/\r?\n/)
  if (cabecera?.trim() !== ENCABEZADOS.join(',')) {
    throw new Error(`Encabezado inesperado. Debe ser: ${ENCABEZADOS.join(',')}`)
  }
  return filas
    .filter((f) => f.trim() !== '')
    .map((fila, i) => {
      const c = fila.split(',').map((x) => x.trim())
      const metodo = c[2]
      if (metodo !== 'manual' && metodo !== 'sistema') {
        throw new Error(`Fila ${i + 2}: metodo debe ser "manual" o "sistema" (llegó "${metodo}")`)
      }
      const n = (k: number) => {
        const v = Number(c[k])
        if (!Number.isFinite(v) || v < 0)
          throw new Error(`Fila ${i + 2}: "${ENCABEZADOS[k]}" no es un número válido`)
        return v
      }
      return {
        metodo,
        paradas: n(3),
        minutos: n(4),
        errores: n(5) + n(6) + n(7),
        realizadas: n(8),
        fallidas: n(9),
      }
    })
}

const media = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : Number.NaN)
const mediana = (v: number[]) => {
  if (!v.length) return Number.NaN
  const o = [...v].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? (o[m] as number) : ((o[m - 1] as number) + (o[m] as number)) / 2
}

export function resumir(filas: Medicion[]) {
  const por = (m: Metodo) => {
    const f = filas.filter((x) => x.metodo === m)
    const entregas = f.reduce((a, x) => a + x.realizadas + x.fallidas, 0)
    return {
      rutas: f.length,
      minutosMedia: media(f.map((x) => x.minutos)),
      minutosMediana: mediana(f.map((x) => x.minutos)),
      minutosPorParada: media(
        f.map((x) => (x.paradas > 0 ? x.minutos / x.paradas : Number.NaN)).filter(Number.isFinite),
      ),
      erroresPor100Rutas: f.length
        ? (f.reduce((a, x) => a + x.errores, 0) / f.length) * 100
        : Number.NaN,
      fallidasPct: entregas ? (f.reduce((a, x) => a + x.fallidas, 0) / entregas) * 100 : Number.NaN,
    }
  }
  const manual = por('manual')
  const sistema = por('sistema')
  const variacion = (a: number, b: number) =>
    Number.isFinite(a) && a !== 0 ? ((b - a) / a) * 100 : Number.NaN
  return {
    manual,
    sistema,
    variacionTiempoPct: variacion(manual.minutosMedia, sistema.minutosMedia),
    variacionErroresPct: variacion(manual.erroresPor100Rutas, sistema.erroresPor100Rutas),
  }
}

const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : 'n/d')

export function tabla(r: ReturnType<typeof resumir>) {
  const fila = (nombre: string, a: number, b: number, v?: number) =>
    `| ${nombre} | ${f1(a)} | ${f1(b)} | ${v === undefined ? '' : `${f1(v)} %`} |`
  return [
    '| Indicador | Manual | Sistema | Variación |',
    '|---|---:|---:|---:|',
    `| Rutas medidas | ${r.manual.rutas} | ${r.sistema.rutas} | |`,
    fila(
      'Tiempo de planificación, media (min)',
      r.manual.minutosMedia,
      r.sistema.minutosMedia,
      r.variacionTiempoPct,
    ),
    fila(
      'Tiempo de planificación, mediana (min)',
      r.manual.minutosMediana,
      r.sistema.minutosMediana,
    ),
    fila(
      'Minutos de planificación por parada',
      r.manual.minutosPorParada,
      r.sistema.minutosPorParada,
    ),
    fila(
      'Errores de asignación por 100 rutas',
      r.manual.erroresPor100Rutas,
      r.sistema.erroresPor100Rutas,
      r.variacionErroresPct,
    ),
    fila('Entregas fallidas (%)', r.manual.fallidasPct, r.sistema.fallidasPct),
  ].join('\n')
}

if (import.meta.main) {
  const archivo = process.argv[2]
  if (!archivo) {
    console.error('Uso: bun docs/piloto/resumen.ts docs/piloto/mediciones.csv')
    process.exit(1)
  }
  const filas = leerCsv(await Bun.file(archivo).text())
  if (filas.length === 0) {
    console.error('El archivo no tiene mediciones todavía.')
    process.exit(1)
  }
  console.log(tabla(resumir(filas)))
}

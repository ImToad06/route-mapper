import { filaImportacionDestinoSchema } from '@lh/shared'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, FileSpreadsheet } from 'lucide-react'
import Papa from 'papaparse'
import { useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { claves, geocodificar, importarDestinos } from '@/features/catalogos/api'
import { mensajeDeError } from '@/lib/api'

export const Route = createFileRoute('/panel/destinos_/importar')({ component: ImportarDestinos })

type Fila = z.output<typeof filaImportacionDestinoSchema>
interface FilaLeida {
  numero: number
  datos?: Fila
  error?: string
  /** Resultado del servidor tras importar. */
  resultado?: 'creado' | string
}

const MAXIMO = 100

/** Encabezados aceptados (sin tildes ni mayúsculas) → campo. */
const ALIAS: Record<string, keyof Fila> = {
  cliente: 'nombreCliente',
  nombre: 'nombreCliente',
  nombre_cliente: 'nombreCliente',
  nombrecliente: 'nombreCliente',
  direccion: 'direccion',
  zona: 'zona',
  sector: 'zona',
  horario: 'horarioAtencion',
  horario_atencion: 'horarioAtencion',
  horarioatencion: 'horarioAtencion',
  telefono: 'telefono',
  celular: 'telefono',
  latitud: 'latitud',
  lat: 'latitud',
  longitud: 'longitud',
  lng: 'longitud',
  lon: 'longitud',
}
const normalizarEncabezado = (h: string) =>
  h.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '_')

function interpretar(texto: string): FilaLeida[] {
  const { data } = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizarEncabezado,
  })
  return data.map((cruda, i) => {
    const objeto: Record<string, string | number> = { numero: i + 1 }
    for (const [k, v] of Object.entries(cruda)) {
      const campo = ALIAS[k]
      if (campo && v?.trim()) objeto[campo] = v.trim()
    }
    const r = filaImportacionDestinoSchema.safeParse(objeto)
    if (!r.success) return { numero: i + 1, error: r.error.issues.map((e) => e.message).join('; ') }
    const tieneCoordenadas = r.data.latitud !== undefined && r.data.longitud !== undefined
    return { numero: i + 1, datos: { ...r.data, ubicacionVerificada: tieneCoordenadas } }
  })
}

const tieneCoordenadas = (f: Fila) => f.latitud !== undefined && f.longitud !== undefined

function ImportarDestinos() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filas, setFilas] = useState<FilaLeida[]>([])
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [progreso, setProgreso] = useState<string | null>(null)
  const validas = filas.filter((f) => f.datos)
  const sinCoordenadas = validas.filter((f) => f.datos && !tieneCoordenadas(f.datos)).length
  const aImportar = validas.slice(0, MAXIMO)

  async function leerArchivo(archivo: File) {
    setNombreArchivo(archivo.name)
    setFilas(interpretar(await archivo.text()))
  }

  /** Busca coordenadas en el servidor para las filas que no las traen, una por una (1 s cada una). */
  async function geocodificarPendientes(): Promise<FilaLeida[]> {
    const pendientes = aImportar.filter((f) => f.datos && !tieneCoordenadas(f.datos))
    const copia = filas.map((f) => ({ ...f }))
    let hechas = 0
    for (const fila of pendientes) {
      hechas++
      setProgreso(`Buscando coordenadas ${hechas} de ${pendientes.length}…`)
      const destino = copia.find((f) => f.numero === fila.numero)
      if (!destino?.datos) continue
      try {
        const { candidatos } = await geocodificar(destino.datos.direccion)
        const [mejor] = candidatos
        if (mejor)
          destino.datos = {
            ...destino.datos,
            latitud: mejor.latitud,
            longitud: mejor.longitud,
            ubicacionVerificada: false,
          }
        else
          destino.error = `No se encontraron coordenadas para "${destino.datos.direccion}". Regístrelo manualmente en el mapa.`
      } catch (e) {
        destino.error = mensajeDeError(e)
      }
      if (destino.error) destino.datos = undefined
      setFilas([...copia])
    }
    return copia
  }

  async function importar() {
    setProgreso('Preparando…')
    try {
      const listas = (await geocodificarPendientes()).filter((f) => f.datos).slice(0, MAXIMO)
      if (listas.length === 0) return toast.error('No quedó ninguna fila válida para importar.')
      setProgreso(`Importando ${listas.length} destinos…`)
      const { data, error } = await importarDestinos({ filas: listas.map((f) => f.datos as Fila) })
      if (error || !data) return toast.error(mensajeDeError(error))
      const geocodificadas = listas.filter(
        (f) => f.datos && f.datos.ubicacionVerificada === false,
      ).length
      toast.success(
        `Se importaron ${data.creados} destinos${geocodificadas ? ` (${geocodificadas} con ubicación por verificar)` : ''}.`,
      )
      if (data.errores.length) {
        setFilas((actuales) =>
          actuales.map((f) => {
            const e = data.errores.find((x) => x.fila === f.numero)
            return e ? { ...f, datos: undefined, error: e.mensaje } : f
          }),
        )
        toast.warning(
          `${data.errores.length} fila(s) no se importaron; revise la columna Estado.`,
          { duration: 10_000 },
        )
      }
      await queryClient.invalidateQueries({ queryKey: claves.destinos })
      await queryClient.invalidateQueries({ queryKey: claves.zonas })
      if (data.errores.length === 0) await navigate({ to: '/panel/destinos' })
    } finally {
      setProgreso(null)
    }
  }

  return (
    <div className="grid max-w-5xl gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/panel/destinos" aria-label="Volver a destinos">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Importar destinos desde planilla</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Archivo CSV</CardTitle>
          <CardDescription>
            Columnas aceptadas: <code>cliente</code>, <code>direccion</code>, <code>zona</code>{' '}
            (obligatorias), <code>horario</code>, <code>telefono</code>, <code>latitud</code>,{' '}
            <code>longitud</code>. Desde Excel: Guardar como → CSV UTF-8. Máximo {MAXIMO} filas por
            importación.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && leerArchivo(e.target.files[0])}
            aria-label="Seleccionar archivo CSV"
          />
          {nombreArchivo && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-4" aria-hidden="true" /> {nombreArchivo} ·{' '}
              {filas.length} filas leídas, {validas.length} válidas
              {validas.length > MAXIMO && ` (solo se importarán las primeras ${MAXIMO})`}
            </p>
          )}
        </CardContent>
      </Card>

      {filas.length > 0 && (
        <>
          {sinCoordenadas > 0 && (
            <Alert>
              <AlertTitle>{sinCoordenadas} fila(s) sin coordenadas</AlertTitle>
              <AlertDescription>
                Se buscarán por dirección al importar (aprox. 1 segundo por fila) y quedarán
                marcadas como "por verificar" para que confirme el marcador en el mapa.
              </AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-auto rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Coordenadas</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.numero} className={f.error ? 'bg-destructive/5' : ''}>
                    <TableCell className="tabular-nums">{f.numero}</TableCell>
                    <TableCell>{f.datos?.nombreCliente ?? '—'}</TableCell>
                    <TableCell>{f.datos?.direccion ?? '—'}</TableCell>
                    <TableCell>{f.datos?.zona ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {f.datos && tieneCoordenadas(f.datos)
                        ? `${f.datos.latitud}, ${f.datos.longitud}`
                        : f.datos
                          ? 'Se buscarán'
                          : '—'}
                    </TableCell>
                    <TableCell className={f.error ? 'text-destructive' : 'text-muted-foreground'}>
                      {f.error ?? 'Lista para importar'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end gap-3">
            {progreso && (
              <span className="text-sm text-muted-foreground" aria-live="polite">
                {progreso}
              </span>
            )}
            <Button variant="outline" asChild>
              <Link to="/panel/destinos">Cancelar</Link>
            </Button>
            <Button onClick={importar} disabled={aImportar.length === 0 || progreso !== null}>
              {progreso ? 'Importando…' : `Importar ${aImportar.length} destinos`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

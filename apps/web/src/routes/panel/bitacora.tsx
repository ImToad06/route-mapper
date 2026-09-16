import {
  ACCIONES_BITACORA,
  type AccionBitacora,
  ENTIDADES_BITACORA,
  type EntidadBitacora,
  ETIQUETAS_ACCION_BITACORA,
  ETIQUETAS_ENTIDAD_BITACORA,
} from '@lh/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FilaEstado, Paginador } from '@/components/catalogo/controles-lista'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { bitacoraQuery, exportarBitacora } from '@/features/bitacora/api'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { formatearFechaHora } from '@/lib/formato'

export const Route = createFileRoute('/panel/bitacora')({
  beforeLoad: () => {
    if (useAuth.getState().usuario?.rol !== 'administrador') throw redirect({ to: '/panel' })
  },
  component: Bitacora,
})

const TODOS = 'todos'

function Bitacora() {
  const [pagina, setPagina] = useState(1)
  const [entidad, setEntidad] = useState(TODOS)
  const [accion, setAccion] = useState(TODOS)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [exportando, setExportando] = useState(false)

  const cambiarFiltro = (fn: (v: string) => void) => (v: string) => {
    fn(v)
    setPagina(1)
  }

  const filtros = {
    pagina,
    porPagina: 20,
    entidad: entidad === TODOS ? undefined : (entidad as EntidadBitacora),
    accion: accion === TODOS ? undefined : (accion as AccionBitacora),
    desde: desde || undefined,
    hasta: hasta || undefined,
  }
  const { data, isPending, error } = useQuery({
    ...bitacoraQuery(filtros),
    placeholderData: keepPreviousData,
  })

  async function exportar() {
    setExportando(true)
    try {
      await exportarBitacora(filtros)
    } catch (err) {
      toast.error(mensajeDeError(err))
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bitácora</h1>
          <p className="text-sm text-muted-foreground">
            Registro de las operaciones realizadas por los usuarios (RF-27).
          </p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={exportando}>
          <Download className="size-4" aria-hidden="true" />{' '}
          {exportando ? 'Exportando…' : 'Exportar Excel'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={entidad} onValueChange={cambiarFiltro(setEntidad)}>
          <SelectTrigger className="w-48" aria-label="Filtrar por entidad">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las entidades</SelectItem>
            {ENTIDADES_BITACORA.map((e) => (
              <SelectItem key={e} value={e}>
                {ETIQUETAS_ENTIDAD_BITACORA[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accion} onValueChange={cambiarFiltro(setAccion)}>
          <SelectTrigger className="w-48" aria-label="Filtrar por acción">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las acciones</SelectItem>
            {ACCIONES_BITACORA.map((a) => (
              <SelectItem key={a} value={a}>
                {ETIQUETAS_ACCION_BITACORA[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={desde}
          onChange={(e) => cambiarFiltro(setDesde)(e.target.value)}
          className="w-40"
          aria-label="Desde"
        />
        <Input
          type="date"
          value={hasta}
          onChange={(e) => cambiarFiltro(setHasta)(e.target.value)}
          className="w-40"
          aria-label="Hasta"
        />
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && <FilaEstado colSpan={5}>Cargando…</FilaEstado>}
            {error && (
              <FilaEstado colSpan={5} tono="error">
                {mensajeDeError(error)}
              </FilaEstado>
            )}
            {data?.datos.length === 0 && (
              <FilaEstado colSpan={5}>No hay registros que coincidan.</FilaEstado>
            )}
            {data?.datos.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="tabular-nums">{formatearFechaHora(r.fechaHora)}</TableCell>
                <TableCell>
                  {r.usuarioNombre ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {ETIQUETAS_ACCION_BITACORA[r.accion as AccionBitacora] ?? r.accion}
                </TableCell>
                <TableCell>
                  {ETIQUETAS_ENTIDAD_BITACORA[r.entidad as EntidadBitacora] ?? r.entidad}
                </TableCell>
                <TableCell className="max-w-md truncate" title={r.descripcion}>
                  {r.descripcion}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data && (
        <Paginador
          pagina={data.pagina}
          totalPaginas={data.totalPaginas}
          total={data.total}
          sustantivo="registros"
          alCambiar={setPagina}
        />
      )}
    </div>
  )
}

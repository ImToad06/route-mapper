import { zodResolver } from '@hookform/resolvers/zod'
import { type ZonaInput, zonaSchema } from '@lh/shared'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { AccionesFila } from '@/components/catalogo/acciones-fila'
import { CampoTexto } from '@/components/catalogo/campos-formulario'
import { BarraBusqueda, FilaEstado, Paginador } from '@/components/catalogo/controles-lista'
import { DialogoFormulario } from '@/components/catalogo/dialogo-formulario'
import { EncabezadoCatalogo } from '@/components/catalogo/encabezado-catalogo'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  actualizarZona,
  cambiarActivoZona,
  claves,
  crearZona,
  zonasQuery,
} from '@/features/catalogos/api'
import { mensajeDeError } from '@/lib/api'
import { useLista } from '@/lib/use-lista'

export const Route = createFileRoute('/panel/zonas')({ component: Zonas })

type Zona = {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  totalDestinos: number
}

function Zonas() {
  const lista = useLista()
  const queryClient = useQueryClient()
  const [dialogo, setDialogo] = useState<{ abierto: boolean; zona?: Zona }>({ abierto: false })
  const { data, isPending, error } = useQuery({
    ...zonasQuery(lista.filtros),
    placeholderData: keepPreviousData,
  })
  const form = useForm<z.input<typeof zonaSchema>, unknown, ZonaInput>({
    resolver: zodResolver(zonaSchema),
    values: dialogo.zona
      ? { nombre: dialogo.zona.nombre, descripcion: dialogo.zona.descripcion ?? '' }
      : { nombre: '', descripcion: '' },
  })
  const invalidar = () => queryClient.invalidateQueries({ queryKey: claves.zonas })

  async function guardar(datos: ZonaInput) {
    const { error } = dialogo.zona
      ? await actualizarZona(dialogo.zona.id, datos)
      : await crearZona(datos)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(dialogo.zona ? 'Zona actualizada.' : 'Zona creada.')
    setDialogo((d) => ({ ...d, abierto: false }))
    await invalidar()
  }

  async function alternar(z: Zona) {
    const { error } = await cambiarActivoZona(z.id, !z.activo)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(z.activo ? `Zona ${z.nombre} desactivada.` : `Zona ${z.nombre} activada.`)
    await invalidar()
  }

  return (
    <div className="grid gap-4">
      <EncabezadoCatalogo
        titulo="Zonas"
        descripcion="Sectores de entrega para agrupar destinos y planear rutas (RF-11)."
        textoNuevo="Nueva zona"
        alNuevo={() => setDialogo({ abierto: true })}
        soloActivos={lista.soloActivos}
        alCambiarActivos={lista.setSoloActivos}
      />
      <BarraBusqueda
        valor={lista.buscar}
        alCambiar={lista.setBuscar}
        placeholder="Buscar por nombre o descripción"
      />
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Destinos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
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
              <FilaEstado colSpan={5}>No hay zonas que coincidan.</FilaEstado>
            )}
            {data?.datos.map((z) => (
              <TableRow key={z.id} className={z.activo ? '' : 'opacity-60'}>
                <TableCell className="font-medium">{z.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{z.descripcion}</TableCell>
                <TableCell className="text-right tabular-nums">{z.totalDestinos}</TableCell>
                <TableCell>
                  <Badge variant={z.activo ? 'secondary' : 'outline'}>
                    {z.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AccionesFila
                    nombre={z.nombre}
                    activo={z.activo}
                    alEditar={() => setDialogo({ abierto: true, zona: z })}
                    alCambiarActivo={() => alternar(z)}
                  />
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
          sustantivo="zonas"
          alCambiar={lista.setPagina}
        />
      )}

      <DialogoFormulario
        abierto={dialogo.abierto}
        alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
        titulo={dialogo.zona ? 'Editar zona' : 'Nueva zona'}
        form={form}
        onSubmit={guardar}
        textoGuardar={dialogo.zona ? 'Guardar cambios' : 'Crear zona'}
      >
        <CampoTexto
          control={form.control}
          name="nombre"
          etiqueta="Nombre"
          placeholder="Norte, Centro, Soledad…"
        />
        <CampoTexto
          control={form.control}
          name="descripcion"
          etiqueta="Descripción"
          placeholder="Barrios o referencias que abarca"
        />
      </DialogoFormulario>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { type ProductoInput, productoSchema, UNIDADES_MEDIDA, type UnidadMedida } from '@lh/shared'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { AccionesFila } from '@/components/catalogo/acciones-fila'
import { CampoSelect, CampoTexto } from '@/components/catalogo/campos-formulario'
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
  actualizarProducto,
  cambiarActivoProducto,
  claves,
  crearProducto,
  productosQuery,
} from '@/features/catalogos/api'
import { mensajeDeError } from '@/lib/api'
import { useLista } from '@/lib/use-lista'

export const Route = createFileRoute('/panel/productos')({ component: Productos })

type Producto = {
  id: number
  codigo: string
  descripcion: string
  unidadMedida: UnidadMedida
  pesoKg: number
  activo: boolean
}
const ETIQUETAS_UNIDAD: Record<UnidadMedida, string> = {
  unidad: 'Unidad',
  caja: 'Caja',
  paquete: 'Paquete',
  kg: 'Kilogramo',
  litro: 'Litro',
}
const kg = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 })

function Productos() {
  const lista = useLista()
  const queryClient = useQueryClient()
  const [dialogo, setDialogo] = useState<{ abierto: boolean; producto?: Producto }>({
    abierto: false,
  })
  const { data, isPending, error } = useQuery({
    ...productosQuery(lista.filtros),
    placeholderData: keepPreviousData,
  })
  const form = useForm<z.input<typeof productoSchema>, unknown, ProductoInput>({
    resolver: zodResolver(productoSchema),
    values: dialogo.producto
      ? {
          codigo: dialogo.producto.codigo,
          descripcion: dialogo.producto.descripcion,
          unidadMedida: dialogo.producto.unidadMedida,
          pesoKg: dialogo.producto.pesoKg,
        }
      : { codigo: '', descripcion: '', unidadMedida: 'unidad', pesoKg: 0 },
  })
  const invalidar = () => queryClient.invalidateQueries({ queryKey: claves.productos })

  async function guardar(datos: ProductoInput) {
    const { error } = dialogo.producto
      ? await actualizarProducto(dialogo.producto.id, datos)
      : await crearProducto(datos)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(dialogo.producto ? 'Producto actualizado.' : 'Producto registrado.')
    setDialogo((d) => ({ ...d, abierto: false }))
    await invalidar()
  }

  async function alternar(p: Producto) {
    const { error } = await cambiarActivoProducto(p.id, !p.activo)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(p.activo ? `Producto ${p.codigo} desactivado.` : `Producto ${p.codigo} activado.`)
    await invalidar()
  }

  return (
    <div className="grid gap-4">
      <EncabezadoCatalogo
        titulo="Productos"
        descripcion="Mercancías a distribuir, con su unidad y peso por unidad."
        textoNuevo="Nuevo producto"
        alNuevo={() => setDialogo({ abierto: true })}
        soloActivos={lista.soloActivos}
        alCambiarActivos={lista.setSoloActivos}
      />
      <BarraBusqueda
        valor={lista.buscar}
        alCambiar={lista.setBuscar}
        placeholder="Buscar por código o descripción"
      />
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Peso (kg)</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && <FilaEstado colSpan={6}>Cargando…</FilaEstado>}
            {error && (
              <FilaEstado colSpan={6} tono="error">
                {mensajeDeError(error)}
              </FilaEstado>
            )}
            {data?.datos.length === 0 && (
              <FilaEstado colSpan={6}>No hay productos que coincidan.</FilaEstado>
            )}
            {data?.datos.map((p) => (
              <TableRow key={p.id} className={p.activo ? '' : 'opacity-60'}>
                <TableCell className="font-mono font-medium">{p.codigo}</TableCell>
                <TableCell>{p.descripcion}</TableCell>
                <TableCell>{ETIQUETAS_UNIDAD[p.unidadMedida]}</TableCell>
                <TableCell className="text-right tabular-nums">{kg.format(p.pesoKg)}</TableCell>
                <TableCell>
                  <Badge variant={p.activo ? 'secondary' : 'outline'}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AccionesFila
                    nombre={p.codigo}
                    activo={p.activo}
                    alEditar={() => setDialogo({ abierto: true, producto: p })}
                    alCambiarActivo={() => alternar(p)}
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
          sustantivo="productos"
          alCambiar={lista.setPagina}
        />
      )}

      <DialogoFormulario
        abierto={dialogo.abierto}
        alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
        titulo={dialogo.producto ? 'Editar producto' : 'Nuevo producto'}
        form={form}
        onSubmit={guardar}
        textoGuardar={dialogo.producto ? 'Guardar cambios' : 'Registrar producto'}
      >
        <CampoTexto control={form.control} name="codigo" etiqueta="Código" placeholder="ARR-25" />
        <CampoTexto
          control={form.control}
          name="descripcion"
          etiqueta="Descripción"
          placeholder="Arroz bulto 25 kg"
        />
        <CampoSelect
          control={form.control}
          name="unidadMedida"
          etiqueta="Unidad de medida"
          opciones={UNIDADES_MEDIDA.map((u) => ({ valor: u, etiqueta: ETIQUETAS_UNIDAD[u] }))}
        />
        <CampoTexto
          control={form.control}
          name="pesoKg"
          etiqueta="Peso por unidad (kg)"
          tipo="number"
          paso="0.001"
          descripcion="Se usa para validar la capacidad del vehículo en cada ruta."
        />
      </DialogoFormulario>
    </div>
  )
}

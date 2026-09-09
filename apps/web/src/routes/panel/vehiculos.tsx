import { zodResolver } from '@hookform/resolvers/zod'
import { type VehiculoInput, vehiculoSchema } from '@lh/shared'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
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
  actualizarVehiculo,
  cambiarActivoVehiculo,
  claves,
  crearVehiculo,
  vehiculosQuery,
} from '@/features/catalogos/api'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { useLista } from '@/lib/use-lista'

export const Route = createFileRoute('/panel/vehiculos')({
  beforeLoad: () => {
    if (useAuth.getState().usuario?.rol !== 'administrador') throw redirect({ to: '/panel' })
  },
  component: Vehiculos,
})

type Vehiculo = { id: number; placa: string; tipo: string; capacidadKg: number; activo: boolean }
const kg = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function Vehiculos() {
  const lista = useLista()
  const queryClient = useQueryClient()
  const [dialogo, setDialogo] = useState<{ abierto: boolean; vehiculo?: Vehiculo }>({
    abierto: false,
  })
  const { data, isPending, error } = useQuery({
    ...vehiculosQuery(lista.filtros),
    placeholderData: keepPreviousData,
  })
  const form = useForm<z.input<typeof vehiculoSchema>, unknown, VehiculoInput>({
    resolver: zodResolver(vehiculoSchema),
    values: dialogo.vehiculo
      ? {
          placa: dialogo.vehiculo.placa,
          tipo: dialogo.vehiculo.tipo,
          capacidadKg: dialogo.vehiculo.capacidadKg,
        }
      : { placa: '', tipo: '', capacidadKg: 0 },
  })
  const invalidar = () => queryClient.invalidateQueries({ queryKey: claves.vehiculos })

  async function guardar(datos: VehiculoInput) {
    const { error } = dialogo.vehiculo
      ? await actualizarVehiculo(dialogo.vehiculo.id, datos)
      : await crearVehiculo(datos)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(dialogo.vehiculo ? 'Vehículo actualizado.' : 'Vehículo registrado.')
    setDialogo((d) => ({ ...d, abierto: false }))
    await invalidar()
  }

  async function alternar(v: Vehiculo) {
    const { error } = await cambiarActivoVehiculo(v.id, !v.activo)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(
      v.activo
        ? `Vehículo ${v.placa} desactivado. Se desvinculó de sus conductores.`
        : `Vehículo ${v.placa} activado.`,
    )
    await invalidar()
  }

  return (
    <div className="grid gap-4">
      <EncabezadoCatalogo
        titulo="Vehículos"
        descripcion="Flota disponible y su capacidad de carga."
        textoNuevo="Nuevo vehículo"
        alNuevo={() => setDialogo({ abierto: true })}
        soloActivos={lista.soloActivos}
        alCambiarActivos={lista.setSoloActivos}
      />
      <BarraBusqueda
        valor={lista.buscar}
        alCambiar={lista.setBuscar}
        placeholder="Buscar por placa o tipo"
      />
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Capacidad (kg)</TableHead>
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
              <FilaEstado colSpan={5}>No hay vehículos que coincidan.</FilaEstado>
            )}
            {data?.datos.map((v) => (
              <TableRow key={v.id} className={v.activo ? '' : 'opacity-60'}>
                <TableCell className="font-mono font-medium">{v.placa}</TableCell>
                <TableCell>{v.tipo}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {kg.format(v.capacidadKg)}
                </TableCell>
                <TableCell>
                  <Badge variant={v.activo ? 'secondary' : 'outline'}>
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <AccionesFila
                    nombre={v.placa}
                    activo={v.activo}
                    alEditar={() => setDialogo({ abierto: true, vehiculo: v })}
                    alCambiarActivo={() => alternar(v)}
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
          sustantivo="vehículos"
          alCambiar={lista.setPagina}
        />
      )}

      <DialogoFormulario
        abierto={dialogo.abierto}
        alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
        titulo={dialogo.vehiculo ? 'Editar vehículo' : 'Nuevo vehículo'}
        form={form}
        onSubmit={guardar}
        textoGuardar={dialogo.vehiculo ? 'Guardar cambios' : 'Registrar vehículo'}
      >
        <CampoTexto control={form.control} name="placa" etiqueta="Placa" placeholder="ABC123" />
        <CampoTexto
          control={form.control}
          name="tipo"
          etiqueta="Tipo"
          placeholder="Camión NHR, furgón, turbo…"
        />
        <CampoTexto
          control={form.control}
          name="capacidadKg"
          etiqueta="Capacidad de carga (kg)"
          tipo="number"
          paso="0.1"
        />
      </DialogoFormulario>
    </div>
  )
}

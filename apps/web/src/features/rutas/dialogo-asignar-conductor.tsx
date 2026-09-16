import { zodResolver } from '@hookform/resolvers/zod'
import { type AsignarRutaInput, asignarRutaSchema } from '@lh/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { CampoSelect } from '@/components/catalogo/campos-formulario'
import { DialogoFormulario } from '@/components/catalogo/dialogo-formulario'
import { conductoresDisponiblesQuery, vehiculosActivosQuery } from '@/features/catalogos/api'
import { asignarRuta, claveRutas, reasignarRuta } from '@/features/rutas/api'
import { mensajeDeError } from '@/lib/api'
import { formatearKg } from '@/lib/formato'

interface Props {
  abierto: boolean
  alCerrar: () => void
  rutaId: number
  codigo: string
  vehiculoActualId: number | null
  /** Conductor que ya tiene la ruta (para excluirlo de la lista al reasignar). */
  conductorActualId?: number | null
  /** true: la ruta ya tiene conductor (pendiente o aceptada) y se está cambiando por otro. */
  reasignar?: boolean
}

/** RF-15/RF-17: elegir (o cambiar) el conductor y, opcionalmente, el vehículo de una ruta. */
export function DialogoAsignarConductor({
  abierto,
  alCerrar,
  rutaId,
  codigo,
  vehiculoActualId,
  conductorActualId,
  reasignar = false,
}: Props) {
  const queryClient = useQueryClient()
  const conductores = useQuery(conductoresDisponiblesQuery)
  const vehiculos = useQuery(vehiculosActivosQuery)
  const form = useForm<z.input<typeof asignarRutaSchema>, unknown, AsignarRutaInput>({
    resolver: zodResolver(asignarRutaSchema),
    values: { conductorId: undefined, vehiculoId: vehiculoActualId ?? undefined },
  })

  async function enviar(datos: AsignarRutaInput) {
    const { data, error } = reasignar
      ? await reasignarRuta(rutaId, datos)
      : await asignarRuta(rutaId, datos)
    if (error || !data) return toast.error(mensajeDeError(error))
    toast.success(
      reasignar ? 'Ruta reasignada.' : 'Conductor asignado; queda pendiente de aceptación.',
    )
    await queryClient.invalidateQueries({ queryKey: claveRutas })
    alCerrar()
  }

  const opcionesConductor = (conductores.data?.datos ?? [])
    .filter((c) => c.id !== conductorActualId)
    .map((c) => ({
      valor: String(c.id),
      etiqueta: c.vehiculo ? `${c.nombre} · ${c.vehiculo.placa}` : c.nombre,
    }))

  return (
    <DialogoFormulario
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={reasignar ? `Reasignar la ruta ${codigo}` : `Asignar conductor a la ruta ${codigo}`}
      descripcion="El conductor recibe una notificación y debe aceptar la ruta antes de iniciarla."
      form={form}
      onSubmit={enviar}
      textoGuardar={reasignar ? 'Reasignar' : 'Asignar'}
    >
      <CampoSelect
        control={form.control}
        name="conductorId"
        etiqueta="Conductor"
        placeholder={
          opcionesConductor.length ? 'Seleccione un conductor' : 'No hay conductores disponibles'
        }
        opciones={opcionesConductor}
      />
      <CampoSelect
        control={form.control}
        name="vehiculoId"
        etiqueta="Vehículo"
        descripcion="Se valida que la carga de la ruta quepa en el vehículo elegido."
        opciones={(vehiculos.data?.datos ?? []).map((v) => ({
          valor: String(v.id),
          etiqueta: `${v.placa} · ${v.tipo} · ${formatearKg(v.capacidadKg)}`,
        }))}
      />
    </DialogoFormulario>
  )
}

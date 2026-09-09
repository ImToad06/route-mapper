import { zodResolver } from '@hookform/resolvers/zod'
import { type DestinoInput, destinoSchema } from '@lh/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { CampoSelect, CampoTexto } from '@/components/catalogo/campos-formulario'
import { DialogoFormulario } from '@/components/catalogo/dialogo-formulario'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { mensajeDeError } from '@/lib/api'
import { actualizarDestino, claves, crearDestino, zonasActivasQuery } from './api'
import { SelectorUbicacion } from './selector-ubicacion'

export interface Destino {
  id: number
  zonaId: number
  zona: string
  nombreCliente: string
  direccion: string
  horarioAtencion: string | null
  telefono: string | null
  latitud: number
  longitud: number
  ubicacionVerificada: boolean
  activo: boolean
}

interface Props {
  abierto: boolean
  alCerrar: () => void
  destino?: Destino
}

const SIN_COORDENADAS = { latitud: Number.NaN, longitud: Number.NaN }

export function DialogoDestino({ abierto, alCerrar, destino }: Props) {
  const queryClient = useQueryClient()
  const zonas = useQuery(zonasActivasQuery)
  const form = useForm<z.input<typeof destinoSchema>, unknown, DestinoInput>({
    resolver: zodResolver(destinoSchema),
    values: destino
      ? {
          zonaId: destino.zonaId,
          nombreCliente: destino.nombreCliente,
          direccion: destino.direccion,
          horarioAtencion: destino.horarioAtencion ?? '',
          telefono: destino.telefono ?? '',
          latitud: destino.latitud,
          longitud: destino.longitud,
          ubicacionVerificada: destino.ubicacionVerificada,
        }
      : {
          zonaId: 0,
          nombreCliente: '',
          direccion: '',
          horarioAtencion: '',
          telefono: '',
          ...SIN_COORDENADAS,
          ubicacionVerificada: false,
        },
  })
  const latitud = Number(form.watch('latitud'))
  const longitud = Number(form.watch('longitud'))
  const verificada = form.watch('ubicacionVerificada') ?? false
  const direccion = form.watch('direccion')
  const coordenadas =
    Number.isFinite(latitud) && Number.isFinite(longitud) ? { latitud, longitud } : null

  // Dirección con la que se confirmó el marcador: si el usuario la cambia, la ubicación deja de estar verificada.
  const direccionConfirmada = useRef<string | null>(destino?.direccion ?? null)
  useEffect(() => {
    direccionConfirmada.current = destino?.direccion ?? null
  }, [destino])
  useEffect(() => {
    if (
      verificada &&
      direccionConfirmada.current !== null &&
      direccion !== direccionConfirmada.current
    ) {
      form.setValue('ubicacionVerificada', false)
    }
  }, [direccion, verificada, form])

  async function guardar(datos: DestinoInput) {
    if (!datos.ubicacionVerificada) {
      return toast.error(
        'Confirme la ubicación en el mapa antes de guardar (busque la dirección y pulse "Confirmar ubicación" o ajuste el marcador).',
      )
    }
    const { error } = destino
      ? await actualizarDestino(destino.id, datos)
      : await crearDestino(datos)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(destino ? 'Destino actualizado.' : 'Destino registrado.')
    alCerrar()
    await queryClient.invalidateQueries({ queryKey: claves.destinos })
    await queryClient.invalidateQueries({ queryKey: claves.zonas })
  }

  return (
    <DialogoFormulario
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={destino ? 'Editar destino' : 'Nuevo destino'}
      descripcion="Datos del cliente y su ubicación exacta en el mapa."
      form={form}
      onSubmit={guardar}
      textoGuardar={destino ? 'Guardar cambios' : 'Registrar destino'}
      ancho="amplio"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-4">
          <CampoTexto
            control={form.control}
            name="nombreCliente"
            etiqueta="Nombre del cliente"
            placeholder="Tienda La Esquina"
          />
          <CampoTexto
            control={form.control}
            name="direccion"
            etiqueta="Dirección"
            placeholder="Calle 72 # 45-23"
          />
          <CampoSelect
            control={form.control}
            name="zonaId"
            etiqueta="Zona"
            placeholder={zonas.isPending ? 'Cargando zonas…' : 'Seleccione una zona'}
            opciones={
              zonas.data?.datos.map((z) => ({ valor: String(z.id), etiqueta: z.nombre })) ?? []
            }
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              control={form.control}
              name="horarioAtencion"
              etiqueta="Horario de atención"
              placeholder="08:00-18:00"
            />
            <CampoTexto control={form.control} name="telefono" etiqueta="Teléfono" tipo="tel" />
          </div>
        </div>
        <FormField
          control={form.control}
          name="latitud"
          render={() => (
            <FormItem>
              <FormLabel>Ubicación</FormLabel>
              <SelectorUbicacion
                direccion={direccion}
                valor={coordenadas}
                verificada={verificada ?? false}
                alCambiar={(c, v) => {
                  form.setValue('latitud', c.latitud, { shouldValidate: true })
                  form.setValue('longitud', c.longitud, { shouldValidate: true })
                  form.setValue('ubicacionVerificada', v)
                  if (v) direccionConfirmada.current = form.getValues('direccion') ?? null
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </DialogoFormulario>
  )
}

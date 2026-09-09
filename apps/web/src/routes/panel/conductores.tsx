import { zodResolver } from '@hookform/resolvers/zod'
import {
  type ActualizarConductorInput,
  actualizarConductorSchema,
  type CrearConductorInput,
  crearConductorSchema,
  type DisponibilidadConductor,
} from '@lh/shared'
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
  actualizarConductor,
  cambiarActivoConductor,
  claves,
  conductoresQuery,
  crearConductor,
  vehiculosActivosQuery,
} from '@/features/catalogos/api'
import { DialogoContrasenaTemporal } from '@/features/usuarios/dialogo-contrasena-temporal'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { useLista } from '@/lib/use-lista'

export const Route = createFileRoute('/panel/conductores')({ component: Conductores })

interface Conductor {
  id: number
  nombre: string
  documento: string
  licencia: string
  telefono: string | null
  correo: string
  disponibilidad: DisponibilidadConductor
  activo: boolean
  vehiculo: { id: number; placa: string; tipo: string; capacidadKg: number } | null
}

const ETIQUETA_DISPONIBILIDAD: Record<
  DisponibilidadConductor,
  { texto: string; variante: 'secondary' | 'default' | 'outline' }
> = {
  disponible: { texto: 'Disponible', variante: 'secondary' },
  en_ruta: { texto: 'En ruta', variante: 'default' },
  inactivo: { texto: 'Inactivo', variante: 'outline' },
}
const SIN_VEHICULO = 'ninguno'

function Conductores() {
  const lista = useLista()
  const queryClient = useQueryClient()
  const esAdmin = useAuth((s) => s.usuario?.rol === 'administrador')
  const [dialogo, setDialogo] = useState<{ abierto: boolean; conductor?: Conductor }>({
    abierto: false,
  })
  const [temporal, setTemporal] = useState<{ correo: string; contrasenaTemporal: string } | null>(
    null,
  )
  const { data, isPending, error } = useQuery({
    ...conductoresQuery(lista.filtros),
    placeholderData: keepPreviousData,
  })
  const vehiculos = useQuery(vehiculosActivosQuery)
  const invalidar = () => queryClient.invalidateQueries({ queryKey: claves.conductores })

  const formCrear = useForm<z.input<typeof crearConductorSchema>, unknown, CrearConductorInput>({
    resolver: zodResolver(crearConductorSchema),
    defaultValues: {
      nombre: '',
      documento: '',
      licencia: '',
      telefono: '',
      correo: '',
      vehiculoId: null,
    },
  })
  const formEditar = useForm<
    z.input<typeof actualizarConductorSchema>,
    unknown,
    ActualizarConductorInput
  >({
    resolver: zodResolver(actualizarConductorSchema),
    values: dialogo.conductor
      ? {
          nombre: dialogo.conductor.nombre,
          documento: dialogo.conductor.documento,
          licencia: dialogo.conductor.licencia,
          telefono: dialogo.conductor.telefono ?? '',
          vehiculoId: dialogo.conductor.vehiculo?.id ?? null,
          ...(dialogo.conductor.disponibilidad !== 'en_ruta' && {
            disponibilidad: dialogo.conductor.disponibilidad,
          }),
        }
      : {},
  })

  const opcionesVehiculo = [
    { valor: SIN_VEHICULO, etiqueta: 'Sin vehículo asignado' },
    ...(vehiculos.data?.datos.map((v) => ({
      valor: String(v.id),
      etiqueta: `${v.placa} · ${v.tipo} · ${v.capacidadKg} kg`,
    })) ?? []),
  ]

  async function crear(datos: CrearConductorInput) {
    const { data, error } = await crearConductor(datos)
    if (error || !data) return toast.error(mensajeDeError(error))
    toast.success('Conductor registrado.')
    setDialogo((d) => ({ ...d, abierto: false }))
    formCrear.reset()
    if (data.contrasenaTemporal)
      setTemporal({ correo: datos.correo, contrasenaTemporal: data.contrasenaTemporal })
    await invalidar()
  }

  async function editar(datos: ActualizarConductorInput) {
    if (!dialogo.conductor) return
    const { error } = await actualizarConductor(dialogo.conductor.id, datos)
    if (error) return toast.error(mensajeDeError(error))
    toast.success('Conductor actualizado.')
    setDialogo((d) => ({ ...d, abierto: false }))
    await invalidar()
  }

  async function alternar(c: Conductor) {
    const { error } = await cambiarActivoConductor(c.id, !c.activo)
    if (error) return toast.error(mensajeDeError(error))
    toast.success(
      c.activo
        ? `Conductor ${c.nombre} desactivado. Su usuario ya no puede ingresar.`
        : `Conductor ${c.nombre} activado.`,
    )
    await invalidar()
  }

  const editando = Boolean(dialogo.conductor)

  return (
    <div className="grid gap-4">
      <EncabezadoCatalogo
        titulo="Conductores"
        descripcion="Personal de reparto, su vehículo y su disponibilidad (RF-04 a RF-06)."
        textoNuevo={esAdmin ? 'Nuevo conductor' : undefined}
        alNuevo={esAdmin ? () => setDialogo({ abierto: true }) : undefined}
        soloActivos={lista.soloActivos}
        alCambiarActivos={lista.setSoloActivos}
      />
      <BarraBusqueda
        valor={lista.buscar}
        alCambiar={lista.setBuscar}
        placeholder="Buscar por nombre, documento o correo"
      />
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Disponibilidad</TableHead>
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
              <FilaEstado colSpan={6}>No hay conductores que coincidan.</FilaEstado>
            )}
            {data?.datos.map((c) => (
              <TableRow key={c.id} className={c.activo ? '' : 'opacity-60'}>
                <TableCell>
                  <div className="font-medium">{c.nombre}</div>
                  <div className="text-xs text-muted-foreground">Licencia {c.licencia}</div>
                </TableCell>
                <TableCell className="tabular-nums">{c.documento}</TableCell>
                <TableCell>
                  <div>{c.correo}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.telefono ?? 'Sin teléfono'}
                  </div>
                </TableCell>
                <TableCell>
                  {c.vehiculo ? (
                    <>
                      <span className="font-mono">{c.vehiculo.placa}</span>
                      <span className="text-muted-foreground"> · {c.vehiculo.capacidadKg} kg</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sin vehículo</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={ETIQUETA_DISPONIBILIDAD[c.disponibilidad].variante}>
                    {ETIQUETA_DISPONIBILIDAD[c.disponibilidad].texto}
                  </Badge>
                </TableCell>
                <TableCell>
                  {esAdmin && (
                    <AccionesFila
                      nombre={c.nombre}
                      activo={c.activo}
                      alEditar={() => setDialogo({ abierto: true, conductor: c })}
                      alCambiarActivo={() => alternar(c)}
                    />
                  )}
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
          sustantivo="conductores"
          alCambiar={lista.setPagina}
        />
      )}

      {editando ? (
        <DialogoFormulario
          abierto={dialogo.abierto}
          alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
          titulo="Editar conductor"
          form={formEditar}
          onSubmit={editar}
          textoGuardar="Guardar cambios"
        >
          <CampoTexto control={formEditar.control} name="nombre" etiqueta="Nombre completo" />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto control={formEditar.control} name="documento" etiqueta="Documento" />
            <CampoTexto control={formEditar.control} name="licencia" etiqueta="Licencia" />
          </div>
          <CampoTexto control={formEditar.control} name="telefono" etiqueta="Teléfono" tipo="tel" />
          <CampoSelect
            control={formEditar.control}
            name="vehiculoId"
            etiqueta="Vehículo"
            opciones={opcionesVehiculo}
          />
          {dialogo.conductor?.disponibilidad === 'en_ruta' ? (
            <p className="text-sm text-muted-foreground">
              El conductor está en ruta; su disponibilidad cambiará al finalizarla.
            </p>
          ) : (
            <CampoSelect
              control={formEditar.control}
              name="disponibilidad"
              etiqueta="Disponibilidad"
              opciones={[
                { valor: 'disponible', etiqueta: 'Disponible' },
                { valor: 'inactivo', etiqueta: 'Inactivo (vacaciones, incapacidad…)' },
              ]}
            />
          )}
        </DialogoFormulario>
      ) : (
        <DialogoFormulario
          abierto={dialogo.abierto}
          alCerrar={() => setDialogo((d) => ({ ...d, abierto: false }))}
          titulo="Nuevo conductor"
          descripcion="Se creará también su usuario para la app del conductor, con una contraseña temporal."
          form={formCrear}
          onSubmit={crear}
          textoGuardar="Registrar conductor"
        >
          <CampoTexto control={formCrear.control} name="nombre" etiqueta="Nombre completo" />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              control={formCrear.control}
              name="documento"
              etiqueta="Documento de identidad"
              placeholder="Solo números"
            />
            <CampoTexto control={formCrear.control} name="licencia" etiqueta="Número de licencia" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              control={formCrear.control}
              name="correo"
              etiqueta="Correo (usuario de ingreso)"
              tipo="email"
            />
            <CampoTexto
              control={formCrear.control}
              name="telefono"
              etiqueta="Teléfono"
              tipo="tel"
              placeholder="3001234567"
            />
          </div>
          <CampoSelect
            control={formCrear.control}
            name="vehiculoId"
            etiqueta="Vehículo"
            opciones={opcionesVehiculo}
            descripcion="Puede asignarse después."
          />
        </DialogoFormulario>
      )}
      <DialogoContrasenaTemporal datos={temporal} alCerrar={() => setTemporal(null)} />
    </div>
  )
}

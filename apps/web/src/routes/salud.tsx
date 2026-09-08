import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '@/lib/api'

export const Route = createFileRoute('/salud')({
  component: Salud,
})

function Salud() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['salud'],
    queryFn: async () => {
      const res = await api.salud.get()
      if (res.error) throw new Error('El servicio no respondió correctamente')
      return res.data
    },
  })

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold">Estado del servicio</h1>
      {isPending && <p className="mt-4 text-muted-foreground">Consultando…</p>}
      {error && <p className="mt-4 text-destructive">{error.message}</p>}
      {data && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 tabular-nums">
          <dt className="text-muted-foreground">API</dt>
          <dd className="font-medium">{data.estado}</dd>
          <dt className="text-muted-foreground">Base de datos</dt>
          <dd className="font-medium">{data.baseDeDatos}</dd>
          <dt className="text-muted-foreground">Versión</dt>
          <dd className="font-medium">{data.version}</dd>
          <dt className="text-muted-foreground">Hora del servidor</dt>
          <dd className="font-medium">{new Date(data.hora).toLocaleString('es-CO')}</dd>
        </dl>
      )}
      <div className="mt-6 flex gap-4">
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          Actualizar
        </button>
        <Link to="/" className="self-center text-primary underline">
          Inicio
        </Link>
      </div>
    </main>
  )
}

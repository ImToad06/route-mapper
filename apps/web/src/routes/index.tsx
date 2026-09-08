import { createFileRoute, Link } from '@tanstack/react-router'
import { Truck } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Inicio,
})

function Inicio() {
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
      <Truck className="size-12 text-primary" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Rutas L&amp;H Distribuciones</h1>
      <p className="text-muted-foreground">
        Sistema de gestión y asignación de rutas. La pantalla de ingreso llegará en la Fase 1.
      </p>
      <Link to="/salud" className="text-primary underline">
        Ver estado del servicio
      </Link>
    </main>
  )
}

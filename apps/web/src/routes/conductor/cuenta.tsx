import { createFileRoute } from '@tanstack/react-router'
import { PaginaCuenta } from '@/features/auth/pagina-cuenta'

export const Route = createFileRoute('/conductor/cuenta')({ component: PaginaCuenta })

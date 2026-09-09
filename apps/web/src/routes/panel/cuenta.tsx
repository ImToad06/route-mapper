import { createFileRoute } from '@tanstack/react-router'
import { PaginaCuenta } from '@/features/auth/pagina-cuenta'

export const Route = createFileRoute('/panel/cuenta')({ component: PaginaCuenta })

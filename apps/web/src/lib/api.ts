import { treaty } from '@elysiajs/eden'
import type { App } from '@lh/api'

/**
 * Cliente tipado de la API (Eden Treaty). En desarrollo Vite hace proxy de /api al servidor;
 * en producción Nginx hace lo mismo, así que la URL base es el propio origen.
 */
const baseUrl = import.meta.env.VITE_API_URL || window.location.origin

export const api = treaty<App>(baseUrl, { fetch: { credentials: 'include' } }).api

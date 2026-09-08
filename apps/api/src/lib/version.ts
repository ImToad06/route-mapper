import pkg from '../../package.json' with { type: 'json' }

/** Versión de la API, tomada de apps/api/package.json. */
export const VERSION: string = pkg.version

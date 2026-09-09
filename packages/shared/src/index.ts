import { z } from 'zod'

// Mensajes de validación por defecto en español (RNF-02), tanto en la API como en el navegador.
z.config(z.locales.es())

export * from './enums.ts'
export * from './schemas/auth.ts'
export * from './schemas/bitacora.ts'
export * from './schemas/catalogos.ts'
export * from './schemas/comunes.ts'
export * from './schemas/rutas.ts'
export * from './schemas/usuarios.ts'

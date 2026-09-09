import { execSync } from 'node:child_process'

export default function globalTeardown() {
  execSync('bun --env-file=../../.env src/test/e2e-usuarios.ts limpiar', {
    cwd: 'apps/api',
    stdio: 'inherit',
  })
}

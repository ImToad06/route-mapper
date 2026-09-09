import { execSync } from 'node:child_process'

export default function globalSetup() {
  execSync('bun --env-file=../../.env src/test/e2e-usuarios.ts crear', {
    cwd: 'apps/api',
    stdio: 'inherit',
  })
}

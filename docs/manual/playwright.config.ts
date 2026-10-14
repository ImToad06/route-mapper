import { defineConfig, devices } from '@playwright/test'

/** Capturas del manual: contra la base de demostración (ver apps/api/src/test/preparar-demo.ts). */
export default defineConfig({
  testDir: '.',
  testMatch: /capturas\.spec\.ts/,
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: process.env.URL_WEB ?? 'http://localhost:5174', locale: 'es-CO' },
  projects: [
    {
      name: 'escritorio',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 820 },
        launchOptions: {
          args: [
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
  ],
})

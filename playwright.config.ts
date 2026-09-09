import { defineConfig, devices } from '@playwright/test'

const puertoWeb = 5173

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  // Un solo worker: los archivos comparten datos (catalogos → rutas) y la base de datos de desarrollo.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: `http://localhost:${puertoWeb}`,
    locale: 'es-CO',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'escritorio',
      use: {
        ...devices['Desktop Chrome'],
        // WebGL por software para que MapLibre dibuje las teselas en el navegador sin GPU.
        launchOptions: {
          args: [
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
    { name: 'movil', use: { ...devices['Pixel 7'] }, testMatch: /movil\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'bun run dev:api',
      url: 'http://localhost:3000/api/salud',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'bun run dev:web',
      url: `http://localhost:${puertoWeb}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})

import { expect, type Page, test } from '@playwright/test'

/**
 * Genera las imágenes de docs/manual/img para el manual de usuario.
 *   URL_WEB=http://localhost:5174 bunx playwright test -c docs/manual/playwright.config.ts
 * Requiere la base de demostración. Si cambia el diseño, vuelva a correrlo para actualizar el manual.
 */
const DIR = 'docs/manual/img/' // relativo a la raíz del repo, desde donde se ejecuta

async function entrar(page: Page, correo: string, clave: string, perfil = 'Coordinador') {
  await page.goto('/ingresar')
  await page.getByRole('button', { name: perfil }).click()
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña').fill(clave)
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
  await expect(page).not.toHaveURL(/\/ingresar/)
  await page.waitForLoadState('networkidle')
  // Que el aviso "Bienvenido" no aparezca en las capturas.
  await page
    .locator('[data-sonner-toast]')
    .first()
    .waitFor({ state: 'hidden', timeout: 10_000 })
    .catch(() => {})
}

async function capturar(page: Page, nombre: string, espera = 400) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(espera)
  await page.screenshot({ path: `${DIR}${nombre}.png` })
}

test('panel de coordinación', async ({ page }) => {
  await page.goto('/ingresar')
  await expect(page.getByLabel('Correo')).toBeVisible()
  await capturar(page, '01-ingreso')

  await entrar(page, 'admin@lh.local', 'Demo12345')
  await capturar(page, '02-panel')

  await page.goto('/panel/rutas')
  await capturar(page, '03-rutas')

  await page
    .getByRole('link', { name: /^R-\d{8}-\d+$/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/panel\/rutas\/\d+/)
  await capturar(page, '04-ruta-detalle', 2500)

  await page.goto('/panel/destinos')
  await capturar(page, '05-destinos')
  await page.getByRole('tab', { name: 'Mapa' }).click()
  await capturar(page, '06-destinos-mapa', 2500)

  for (const [ruta, nombre] of [
    ['/panel/conductores', '07-conductores'],
    ['/panel/vehiculos', '08-vehiculos'],
    ['/panel/productos', '09-productos'],
    ['/panel/zonas', '10-zonas'],
    ['/panel/reportes', '11-reportes'],
    ['/panel/bitacora', '12-bitacora'],
    ['/panel/usuarios', '13-usuarios'],
  ] as const) {
    await page.goto(ruta)
    await capturar(page, nombre)
  }
})

test.describe('app del conductor', () => {
  test.use({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true })

  test('inicio y mi ruta', async ({ page }) => {
    await entrar(page, 'carlos.perez@lh.demo', 'Conductor12345', 'Transportista')
    await capturar(page, '14-conductor-inicio')
    await page.goto('/conductor/ruta')
    await capturar(page, '15-conductor-ruta', 2500)
  })
})

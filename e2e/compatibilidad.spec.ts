import { expect, test } from '@playwright/test'
import { ADMIN_FIJO, ingresar } from './ayudas'

/**
 * Matriz de navegadores (RNF-12): flujos básicos que deben funcionar igual en Chrome, Firefox, Edge y
 * Safari (WebKit). Corre en los proyectos escritorio, firefox, webkit y edge de playwright.config.ts.
 * Pensado para no depender de textos de títulos que cambian con el diseño.
 */
const SECCIONES = [
  '/panel',
  '/panel/rutas',
  '/panel/destinos',
  '/panel/reportes',
  '/panel/vehiculos',
]

test.describe('compatibilidad de navegadores', () => {
  test('contraseña errada muestra el mensaje genérico', async ({ page }) => {
    await page.goto('/ingresar')
    await page.getByLabel('Correo').fill(ADMIN_FIJO.correo)
    await page.getByLabel('Contraseña').fill('incorrecta9')
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible()
    await expect(page).toHaveURL(/\/ingresar$/)
  })

  test('ingreso y navegación por las secciones del panel sin errores de consola', async ({
    page,
  }) => {
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`))
    page.on('console', (m) => {
      // Las teselas y el estilo del mapa vienen de un servicio externo; un corte de red no es un fallo de la app.
      if (m.type() === 'error' && !/openfreemap|Failed to load resource|net::ERR/i.test(m.text()))
        errores.push(`console: ${m.text()}`)
    })
    await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
    // Firefox aborta un goto() si la navegación del SPA tras el ingreso sigue en curso.
    await page.waitForLoadState('networkidle')
    for (const ruta of SECCIONES) {
      await page.goto(ruta)
      await expect(page).toHaveURL(new RegExp(`${ruta}$`))
      await expect(page.locator('main, [role="main"]').first()).toBeVisible()
      await page.waitForLoadState('networkidle')
    }
    expect(errores).toEqual([])
  })

  test('el mapa de destinos se dibuja (WebGL)', async ({ page }) => {
    await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
    await page.waitForLoadState('networkidle')
    await page.goto('/panel/destinos')
    await page.getByRole('tab', { name: 'Mapa' }).click()
    const lienzo = page.locator('.maplibregl-canvas').first()
    const hayWebgl = await page.evaluate(() => {
      const c = document.createElement('canvas')
      return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
    })
    test.skip(!hayWebgl, 'Este navegador sin GPU no ofrece WebGL en modo headless')
    await expect(lienzo).toBeVisible()
    const caja = await lienzo.boundingBox()
    expect(caja?.width ?? 0).toBeGreaterThan(200)
  })

  test('cerrar sesión bloquea el panel', async ({ page }) => {
    await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
    await page.locator('[aria-haspopup="menu"]').first().click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/ingresar$/)
    await page.goto('/panel')
    await expect(page).toHaveURL(/\/ingresar/)
  })
})

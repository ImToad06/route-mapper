import { expect, test } from '@playwright/test'
import { ADMIN_FIJO, ingresar, recargar } from './ayudas'

/**
 * Matriz de navegadores (RNF-12): flujos básicos que deben funcionar igual en Chrome, Firefox, Edge y
 * Safari (WebKit). Corre en los proyectos escritorio, firefox, webkit y edge de playwright.config.ts.
 * Pensado para no depender de textos de títulos que cambian con el diseño.
 */
const SECCIONES = [
  { ruta: '/panel', enlace: 'Inicio' },
  { ruta: '/panel/rutas', enlace: 'Rutas' },
  { ruta: '/panel/destinos', enlace: 'Destinos' },
  { ruta: '/panel/reportes', enlace: 'Reportes' },
  { ruta: '/panel/vehiculos', enlace: 'Vehículos' },
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
    // Se navega con los enlaces del menú, como un usuario: un goto() inmediato tras el ingreso choca en
    // Firefox y WebKit con la redirección que el SPA aún está haciendo (Navigation … is interrupted).
    await expect(page).toHaveURL(/\/panel$/)
    await page.waitForLoadState('networkidle')
    for (const { ruta, enlace } of SECCIONES) {
      await page.getByRole('link', { name: enlace, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${ruta}$`))
      await expect(page.locator('main, [role="main"]').first()).toBeVisible()
      await page.waitForLoadState('networkidle')
    }
    // Sin errores durante la navegación. La recarga se mide aparte: al descargar el documento, el servidor
    // de desarrollo en frío corta peticiones de módulos lazy en curso y el navegador las registra como error.
    expect(errores).toEqual([])
    errores.length = 0
    // Una recarga completa ya con la página en reposo: la sesión se recupera con la cookie de refresco.
    await recargar(page)
    await expect(page).toHaveURL(/\/panel\/vehiculos$/)
    await expect(page.locator('main, [role="main"]').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    test
      .info()
      .annotations.push({ type: 'errores tras recargar', description: errores.join(' | ') })
  })

  test('el mapa de destinos se dibuja (WebGL)', async ({ page }) => {
    await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
    await expect(page).toHaveURL(/\/panel$/)
    await page.waitForLoadState('networkidle')
    await page.getByRole('link', { name: 'Destinos', exact: true }).click()
    await expect(page).toHaveURL(/\/panel\/destinos$/)
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

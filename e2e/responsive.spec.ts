import { expect, test } from '@playwright/test'
import { ADMIN_FIJO, CONDUCTOR_FIJO, capturar, ingresar } from './ayudas'

/**
 * Revisión responsive (RNF-13): en celular, tableta y escritorio ninguna pantalla debe provocar
 * desplazamiento horizontal de la página. Con CAPTURAS_DIR definido guarda una captura de cada una.
 */
const TAMANOS = [
  { nombre: 'celular', width: 360, height: 740 },
  { nombre: 'tableta', width: 768, height: 1024 },
  { nombre: 'escritorio', width: 1280, height: 800 },
]
const PANEL = ['/panel', '/panel/rutas', '/panel/destinos', '/panel/conductores', '/panel/reportes']
const CONDUCTOR = ['/conductor', '/conductor/ruta']

async function sinDesbordeHorizontal(page: import('@playwright/test').Page, etiqueta: string) {
  await page.waitForLoadState('networkidle')
  const { ancho, visible } = await page.evaluate(() => ({
    ancho: document.documentElement.scrollWidth,
    visible: document.documentElement.clientWidth,
  }))
  expect(
    ancho,
    `${etiqueta}: la página mide ${ancho}px en una ventana de ${visible}px`,
  ).toBeLessThanOrEqual(visible + 1)
}

for (const t of TAMANOS) {
  test.describe(`responsive ${t.nombre} (${t.width}px)`, () => {
    test.use({ viewport: { width: t.width, height: t.height } })

    test('ingreso', async ({ page }) => {
      await page.goto('/ingresar')
      await expect(page.getByLabel('Correo')).toBeVisible()
      await sinDesbordeHorizontal(page, `${t.nombre} /ingresar`)
      await capturar(page, `p6-resp-${t.nombre}-ingresar`)
    })

    test('panel', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      for (const ruta of PANEL) {
        await page.goto(ruta)
        await sinDesbordeHorizontal(page, `${t.nombre} ${ruta}`)
        await capturar(page, `p6-resp-${t.nombre}-${ruta.replaceAll('/', '_')}`)
      }
    })

    test('app del conductor', async ({ page }) => {
      await ingresar(page, CONDUCTOR_FIJO.correo, CONDUCTOR_FIJO.contrasena)
      for (const ruta of CONDUCTOR) {
        await page.goto(ruta)
        await sinDesbordeHorizontal(page, `${t.nombre} ${ruta}`)
        await capturar(page, `p6-resp-${t.nombre}-${ruta.replaceAll('/', '_')}`)
      }
    })
  })
}

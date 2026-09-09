import { expect, test } from '@playwright/test'
import { ADMIN_FIJO, capturar, ingresar } from './ayudas'

const sufijo = Date.now().toString(36).slice(-4).toUpperCase()

test.describe
  .serial('catálogos', () => {
    test('vehículo: crear y ver en la lista', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.getByRole('link', { name: 'Vehículos' }).click()
      await page.getByRole('button', { name: 'Nuevo vehículo' }).click()
      await page.getByLabel('Placa', { exact: true }).fill('eze' + String(Date.now()).slice(-3))
      await page.getByLabel('Tipo', { exact: true }).fill('Camión E2E')
      await page.getByLabel('Capacidad de carga (kg)', { exact: true }).fill('1800')
      await capturar(page, 'p2-1-vehiculo-form')
      await page.getByRole('button', { name: 'Registrar vehículo' }).click()
      await expect(page.getByText('Vehículo registrado.')).toBeVisible()
      await expect(page.getByRole('cell', { name: 'Camión E2E', exact: true })).toBeVisible()
      await capturar(page, 'p2-2-vehiculos')
    })

    test('producto y zona', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.getByRole('link', { name: 'Productos' }).click()
      await page.getByRole('button', { name: 'Nuevo producto' }).click()
      await page.getByLabel('Código', { exact: true }).fill(`e2e-${sufijo}`)
      await page.getByLabel('Descripción', { exact: true }).fill('Producto de prueba E2E')
      await page.getByLabel('Peso por unidad (kg)', { exact: true }).fill('12.5')
      await page.getByRole('button', { name: 'Registrar producto' }).click()
      await expect(page.getByRole('cell', { name: `E2E-${sufijo}`, exact: true })).toBeVisible()

      await page.getByRole('link', { name: 'Zonas' }).click()
      await page.getByRole('button', { name: 'Nueva zona' }).click()
      await page.getByLabel('Nombre', { exact: true }).fill(`E2E Zona ${sufijo}`)
      await page.getByRole('button', { name: 'Crear zona' }).click()
      await expect(
        page.getByRole('cell', { name: `E2E Zona ${sufijo}`, exact: true }),
      ).toBeVisible()
    })

    test('destino: exige confirmar la ubicación y se fija con un clic en el mapa', async ({
      page,
    }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.getByRole('link', { name: 'Destinos' }).click()
      await page.getByRole('button', { name: 'Nuevo destino' }).click()
      await page.getByLabel('Nombre del cliente', { exact: true }).fill(`E2E Tienda ${sufijo}`)
      await page.getByLabel('Dirección', { exact: true }).fill('Calle 72 # 45-23')
      await page.getByLabel('Zona', { exact: true }).click()
      await page.getByRole('option', { name: `E2E Zona ${sufijo}` }).click()
      // Sin ubicación confirmada no se guarda.
      await page.getByRole('button', { name: 'Registrar destino' }).click()
      await expect(
        page.getByText(/Ubique el punto en el mapa|Confirme la ubicación/).first(),
      ).toBeVisible()
      // Clic en el mapa fija y confirma la ubicación.
      const mapa = page.locator('.maplibregl-canvas').first()
      await expect(mapa).toBeVisible()
      await page.waitForTimeout(800)
      await mapa.click({ position: { x: 200, y: 140 } })
      await expect(page.getByText('Ubicación confirmada')).toBeVisible()
      await capturar(page, 'p2-3-destino-form')
      await page.getByRole('button', { name: 'Registrar destino' }).click()
      await expect(page.getByText('Destino registrado.')).toBeVisible()
      await expect(
        page.getByRole('cell', { name: `E2E Tienda ${sufijo}`, exact: true }),
      ).toBeVisible()
      await capturar(page, 'p2-4-destinos')
      await page.getByRole('tab', { name: 'Mapa' }).click()
      await expect(page.locator('.maplibregl-canvas').first()).toBeVisible()
      await page.waitForTimeout(1200)
      await capturar(page, 'p2-5-destinos-mapa')
    })

    test('importar planilla CSV con coordenadas', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.goto('/panel/destinos/importar')
      const csv = [
        'cliente,direccion,zona,horario,latitud,longitud',
        `E2E Importado A ${sufijo},Carrera 53 # 80-30,E2E Zona ${sufijo},08:00-18:00,11.0072,-74.8106`,
        `E2E Importado B ${sufijo},Calle 64 # 41-15,E2E Zona ${sufijo},,10.9931,-74.7897`,
        `,sin cliente,E2E Zona ${sufijo},,,`,
      ].join('\n')
      await page.getByLabel('Seleccionar archivo CSV', { exact: true }).setInputFiles({
        name: 'planilla.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf8'),
      })
      await expect(page.getByText('3 filas leídas, 2 válidas')).toBeVisible()
      await capturar(page, 'p2-6-importar')
      await page.getByRole('button', { name: 'Importar 2 destinos' }).click()
      await expect(page.getByText(/Se importaron 2 destinos/)).toBeVisible()
      await expect(page).toHaveURL(/\/panel\/destinos$/)
      await expect(
        page.getByRole('cell', { name: `E2E Importado A ${sufijo}`, exact: true }),
      ).toBeVisible()
    })

    test('conductor: crear con vehículo y recibir contraseña temporal', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.getByRole('link', { name: 'Conductores' }).click()
      await page.getByRole('button', { name: 'Nuevo conductor' }).click()
      await page.getByLabel('Nombre completo', { exact: true }).fill(`E2E Conductor ${sufijo}`)
      await page
        .getByLabel('Documento de identidad', { exact: true })
        .fill(String(Date.now()).slice(-9))
      await page.getByLabel('Número de licencia', { exact: true }).fill(`LIC-${sufijo}`)
      await page
        .getByLabel('Correo (usuario de ingreso)', { exact: true })
        .fill(`e2e-cond-${sufijo.toLowerCase()}@lh.test`)
      await page.getByLabel('Teléfono', { exact: true }).fill('3001234567')
      await page.getByLabel('Vehículo', { exact: true }).click()
      await page
        .getByRole('option', { name: /Camión E2E/ })
        .first()
        .click()
      await capturar(page, 'p2-7-conductor-form')
      await page.getByRole('button', { name: 'Registrar conductor' }).click()
      const dialogo = page.getByRole('dialog', { name: 'Contraseña temporal' })
      await expect(dialogo).toBeVisible()
      await dialogo.getByRole('button', { name: 'Entendido' }).click()
      await expect(
        page.getByRole('cell', { name: new RegExp(`E2E Conductor ${sufijo}`) }).first(),
      ).toBeVisible()
      await capturar(page, 'p2-8-conductores')
    })
  })

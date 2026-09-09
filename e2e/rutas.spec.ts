import { expect, test } from '@playwright/test'
import { ADMIN_FIJO, capturar, ingresar } from './ayudas'

/**
 * Constructor de rutas. Usa el vehículo, el producto y el destino creados por catalogos.spec.ts
 * (mismo proceso, orden alfabético) y los destinos verificados del seed si existen.
 */
test.describe
  .serial('constructor de rutas', () => {
    test('crear ruta, agregar paradas con productos, guardar y validar capacidad', async ({
      page,
    }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.getByRole('link', { name: 'Rutas' }).click()
      await page.getByRole('button', { name: 'Nueva ruta' }).click()
      await page.getByLabel('Fecha de la ruta', { exact: true }).fill('2031-03-10')
      await page.getByRole('button', { name: 'Crear ruta' }).click()
      await expect(page).toHaveURL(/\/panel\/rutas\/\d+$/)
      await expect(page.getByRole('heading', { name: /^R-20310310-\d+$/ })).toBeVisible()

      // Dos paradas con destinos creados en catalogos.spec (E2E Tienda / E2E Importado A).
      for (const nombre of ['E2E Tienda', 'E2E Importado A']) {
        await page.getByRole('button', { name: /Agregar parada/ }).click()
        await page.getByPlaceholder('Cliente, dirección o zona…').fill(nombre)
        await page
          .getByRole('option', { name: new RegExp(nombre) })
          .first()
          .click()
      }
      await expect(page.getByText('2 paradas')).toBeVisible()
      // Producto en la primera parada.
      await page.getByLabel('Agregar producto a la parada 1').click()
      await page.getByRole('option', { name: /E2E-/ }).first().click()
      await page
        .getByLabel(/Cantidad de/)
        .first()
        .fill('4')
      await capturar(page, 'p3-1-editor')
      await page.getByRole('button', { name: 'Guardar paradas' }).click()
      await expect(page.getByText('Paradas guardadas.')).toBeVisible()

      // Vehículo Camión E2E (1800 kg): 4 × 12,5 kg cabe.
      await page.getByLabel('Vehículo', { exact: true }).click()
      await page
        .getByRole('option', { name: /Camión E2E/ })
        .first()
        .click()
      await expect(page.getByText('Vehículo actualizado.')).toBeVisible()
      await expect(page.getByText(/de 1.800 kg|de 1800 kg/)).toBeVisible()
    })

    test('calcular y optimizar cuando el motor de rutas está disponible; luego planificar', async ({
      page,
    }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.goto('/panel/rutas')
      await page
        .getByRole('link', { name: /^R-20310310-\d+$/ })
        .first()
        .click()
      const calcular = page.getByRole('button', { name: /Calcular recorrido/ })
      await expect(calcular).toBeVisible()
      if (await calcular.isEnabled()) {
        await calcular.click()
        await expect(page.getByText('Recorrido calculado.')).toBeVisible({ timeout: 20_000 })
        await expect(page.getByText(/\d+(,\d)? km/).first()).toBeVisible()
        await page.getByRole('button', { name: /Optimizar orden/ }).click()
        await expect(page.getByText('Orden optimizado.')).toBeVisible({ timeout: 30_000 })
        await page.waitForTimeout(1200)
        await capturar(page, 'p3-2-recorrido')
      } else {
        test.info().annotations.push({
          type: 'nota',
          description: 'Motor de rutas no configurado: se omite calcular/optimizar.',
        })
      }
      await page.getByRole('button', { name: 'Marcar como planificada' }).click()
      await expect(page.getByText(/Ruta planificada/)).toBeVisible()
      await expect(page.getByText('Planificada', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Guardar paradas' })).toHaveCount(0)
      await capturar(page, 'p3-3-planificada')
      await page.getByRole('button', { name: 'Volver a borrador' }).click()
      await expect(page.getByText('La ruta volvió a borrador.')).toBeVisible()
    })

    test('la lista muestra la ruta con su carga y estado', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.goto('/panel/rutas')
      const fila = page.getByRole('row', { name: /R-20310310-/ }).first()
      await expect(fila).toBeVisible()
      await expect(fila.getByText('Borrador')).toBeVisible()
      await expect(fila.getByText(/50 kg/)).toBeVisible()
      await capturar(page, 'p3-4-lista')
    })
  })

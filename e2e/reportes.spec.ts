import { expect, test } from '@playwright/test'
import { ADMIN_FIJO, capturar, ingresar } from './ayudas'

test.describe
  .serial('panel, reportes y bitácora (RF-22…RF-24, RF-27)', () => {
    test('el panel muestra el resumen del día', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.goto('/panel')
      await expect(page.getByText('Rutas de hoy', { exact: true })).toBeVisible()
      await expect(page.getByText('Entregas de hoy', { exact: true })).toBeVisible()
      await expect(page.getByText('Conductores en ruta', { exact: true })).toBeVisible()
      await expect(page.getByText('Asignaciones sin responder', { exact: true })).toBeVisible()
      await capturar(page, 'p5-1-panel')
    })

    test('reportes: cambia entre pestañas y exporta Excel y PDF', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.getByRole('link', { name: 'Reportes' }).click()
      await expect(page).toHaveURL(/\/panel\/reportes$/)
      await expect(page.getByText('Rutas por estado')).toBeVisible()
      await capturar(page, 'p5-2-reportes-rutas')

      await page.getByRole('tab', { name: 'Conductores' }).click()
      await expect(page.getByRole('columnheader', { name: 'Conductor' })).toBeVisible()

      await page.getByRole('tab', { name: 'Zonas' }).click()
      await expect(page.getByRole('columnheader', { name: 'Zona' })).toBeVisible()
      await capturar(page, 'p5-3-reportes-zonas')

      const descargaExcel = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportar Excel' }).click()
      expect((await descargaExcel).suggestedFilename()).toMatch(/\.xlsx$/)

      const descargaPdf = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportar PDF' }).click()
      expect((await descargaPdf).suggestedFilename()).toMatch(/\.pdf$/)
    })

    test('bitácora: solo administrador, filtra por acción y exporta', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.getByRole('link', { name: 'Bitácora' }).click()
      await expect(page).toHaveURL(/\/panel\/bitacora$/)
      await expect(page.getByRole('columnheader', { name: 'Descripción' })).toBeVisible()
      await capturar(page, 'p5-4-bitacora')

      await page.getByLabel('Filtrar por acción').click()
      await page.getByRole('option', { name: 'Crear' }).click()
      await expect(page.getByRole('cell', { name: 'Crear', exact: true }).first()).toBeVisible()

      const descarga = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Exportar Excel' }).click()
      expect((await descarga).suggestedFilename()).toMatch(/\.xlsx$/)
    })
  })

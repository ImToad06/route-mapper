import { expect, test } from '@playwright/test'
import { ADMIN_FIJO, capturar, ingresar } from './ayudas'

/**
 * Asignación de conductor (RF-15). Usa el vehículo y los destinos creados por catalogos.spec.ts
 * y el conductor fijo de e2e-usuarios.ts (creado por el setup global, contraseña conocida).
 */
test.describe
  .serial('asignación de conductor', () => {
    test('crear ruta planificada lista para asignar', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.getByRole('link', { name: 'Rutas' }).click()
      await page.getByRole('button', { name: 'Nueva ruta' }).click()
      await page.getByLabel('Fecha de la ruta', { exact: true }).fill('2031-05-20')
      await page.getByRole('button', { name: 'Crear ruta' }).click()
      await expect(page).toHaveURL(/\/panel\/rutas\/\d+$/)

      await page.getByRole('button', { name: /Agregar parada/ }).click()
      await page.getByPlaceholder('Cliente, dirección o zona…').fill('E2E Tienda')
      await page
        .getByRole('option', { name: /E2E Tienda/ })
        .first()
        .click()
      await expect(page.getByText('1 paradas')).toBeVisible()
      await page.getByRole('button', { name: 'Guardar paradas' }).click()
      await expect(page.getByText('Paradas guardadas.')).toBeVisible()

      await page.getByLabel('Vehículo', { exact: true }).click()
      await page
        .getByRole('option', { name: /Camión E2E/ })
        .first()
        .click()
      await expect(page.getByText('Vehículo actualizado.')).toBeVisible()

      await page.getByRole('button', { name: 'Marcar como planificada' }).click()
      await expect(page.getByText(/Ruta planificada/)).toBeVisible()
      await capturar(page, 'p4-1-planificada')
    })

    test('asignar conductor deja la ruta pendiente de aceptación', async ({ page }) => {
      await ingresar(page, ADMIN_FIJO.correo, ADMIN_FIJO.contrasena)
      await page.goto('/panel/rutas')
      await page
        .getByRole('link', { name: /^R-20310520-\d+$/ })
        .first()
        .click()

      await page.getByRole('button', { name: 'Asignar conductor' }).click()
      const dialogo = page.getByRole('dialog', { name: /Asignar conductor/ })
      await expect(dialogo).toBeVisible()
      await capturar(page, 'p4-2-dialogo-asignar')

      await dialogo.getByLabel('Conductor', { exact: true }).click()
      await page.getByRole('option', { name: /E2E Conductor Fijo/ }).click()
      await dialogo.getByRole('button', { name: 'Asignar', exact: true }).click()

      await expect(
        page.getByText('Conductor asignado; queda pendiente de aceptación.'),
      ).toBeVisible()
      // .first(): el mismo texto también aparece en la línea de historial de estados (RF-21).
      await expect(page.getByText('Pendiente de aceptación', { exact: true }).first()).toBeVisible()
      await expect(page.getByText(/E2E Conductor Fijo.*pendiente de aceptación/)).toBeVisible()
      // Ya no se puede "asignar" desde cero; ahora se reasigna.
      await expect(page.getByRole('button', { name: 'Reasignar conductor' })).toBeVisible()
      await capturar(page, 'p4-3-pendiente-aceptacion')
    })
  })

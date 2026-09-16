import { expect, test } from '@playwright/test'
import { CONDUCTOR_FIJO, capturar, ingresar } from './ayudas'

/**
 * App del conductor (RF-16 … RF-21), en el proyecto "movil" (Pixel 7). Continúa desde la ruta que
 * seguimiento.spec.ts deja pendiente de aceptación para e2e-conductor-fijo@lh.test.
 */
test.describe
  .serial('app del conductor', () => {
    test('aceptar la ruta pendiente desde Inicio', async ({ page }) => {
      await ingresar(page, CONDUCTOR_FIJO.correo, CONDUCTOR_FIJO.contrasena)
      await expect(page).toHaveURL(/\/conductor$/)
      await expect(page.getByText(/^R-20310520-\d+$/)).toBeVisible()
      await expect(page.getByText('pendiente de aceptación')).toBeVisible()
      await capturar(page, 'p4-4-conductor-inicio')

      await page.getByRole('button', { name: 'Aceptar' }).click()
      await expect(page.getByText(/Ruta aceptada/)).toBeVisible()
      // El texto real en el DOM es minúscula; "capitalize" es solo transformación visual (CSS).
      await expect(page.getByText('asignada, por iniciar')).toBeVisible()
    })

    test('iniciar, entregar las paradas y finalizar desde Mi ruta', async ({ page }) => {
      await ingresar(page, CONDUCTOR_FIJO.correo, CONDUCTOR_FIJO.contrasena)
      await page.getByRole('link', { name: 'Mi ruta' }).click()
      await expect(page).toHaveURL(/\/conductor\/ruta$/)
      await expect(page.getByText(/^R-20310520-\d+$/)).toBeVisible()
      await capturar(page, 'p4-5-mi-ruta-asignada')

      await page.getByRole('button', { name: 'Iniciar ruta' }).click()
      await expect(page.getByText('Ruta iniciada.')).toBeVisible()
      await capturar(page, 'p4-6-mi-ruta-mapa')

      await expect(page.getByRole('button', { name: 'Finalizar ruta' })).toBeDisabled()
      await page.getByRole('button', { name: 'Entregado' }).click()
      await expect(page.getByText('Parada entregada.')).toBeVisible()
      await expect(page.getByText('1 de 1 parada(s) resueltas')).toBeVisible()

      await expect(page.getByRole('button', { name: 'Finalizar ruta' })).toBeEnabled()
      await page.getByRole('button', { name: 'Finalizar ruta' }).click()
      await expect(page.getByText('Ruta finalizada.')).toBeVisible()
      await expect(page.getByText('No tiene una ruta en curso')).toBeVisible()
      await capturar(page, 'p4-7-mi-ruta-finalizada')
    })
  })

import { expect, type Page } from '@playwright/test'

export const ADMIN_FIJO = { correo: 'e2e-admin-fijo@lh.test', contrasena: 'Fijo12345' }

export async function ingresar(page: Page, correo: string, contrasena: string) {
  await page.goto('/ingresar')
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña').fill(contrasena)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).not.toHaveURL(/\/ingresar$/)
}

export const capturas = process.env.CAPTURAS_DIR
export async function capturar(page: Page, nombre: string) {
  if (capturas) await page.screenshot({ path: `${capturas}/${nombre}.png` })
}

import { expect, type Page } from '@playwright/test'

export const ADMIN_FIJO = { correo: 'e2e-admin-fijo@lh.test', contrasena: 'Fijo12345' }
export const CONDUCTOR_FIJO = { correo: 'e2e-conductor-fijo@lh.test', contrasena: 'Fijo12345' }

/** `perfil`: el selector del ingreso debe coincidir con la cuenta (conductor = transportista). */
export async function ingresar(
  page: Page,
  correo: string,
  contrasena: string,
  perfil: 'coordinador' | 'transportista' = 'coordinador',
) {
  await page.goto('/ingresar')
  await page
    .getByRole('button', { name: perfil === 'transportista' ? 'Transportista' : 'Coordinador' })
    .click()
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña').fill(contrasena)
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
  await expect(page).not.toHaveURL(/\/ingresar$/)
}

export const capturas = process.env.CAPTURAS_DIR
export async function capturar(page: Page, nombre: string) {
  if (capturas) await page.screenshot({ path: `${capturas}/${nombre}.png` })
}

/**
 * Recarga la página como lo haría el usuario (F5), sin que Playwright siga la navegación: con el servidor
 * de desarrollo en frío Firefox responde NS_BINDING_ABORTED a page.reload() aunque la recarga termine bien,
 * y WebKit a veces "interrupted by another navigation". Quien llama debe esperar después un elemento de la
 * página recargada (las aserciones de Playwright reintentan hasta que aparece).
 */
export async function recargar(page: Page) {
  // Marca la página actual: la recarga terminó cuando la marca ya no existe (documento nuevo).
  await page.evaluate(() => {
    ;(window as unknown as { __antesDeRecargar?: boolean }).__antesDeRecargar = true
  })
  await page.evaluate(() => location.reload()).catch(() => {})
  await expect
    .poll(() =>
      page
        .evaluate(
          () => (window as unknown as { __antesDeRecargar?: boolean }).__antesDeRecargar === true,
        )
        .catch(() => true),
    )
    .toBe(false)
  await page.waitForLoadState('load')
}

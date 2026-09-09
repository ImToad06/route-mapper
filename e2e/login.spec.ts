import { expect, test } from '@playwright/test'

const ADMIN = { correo: 'e2e-admin@lh.test', contrasena: 'Admin1234', nueva: 'Nueva12345' }

test.describe
  .serial('ingreso, contraseña temporal y usuarios', () => {
    test('contraseña errada muestra el mensaje genérico', async ({ page }) => {
      await page.goto('/ingresar')
      await page.getByLabel('Correo').fill(ADMIN.correo)
      await page.getByLabel('Contraseña').fill('incorrecta9')
      await page.getByRole('button', { name: 'Ingresar' }).click()
      await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible()
      await expect(page).toHaveURL(/\/ingresar$/)
    })

    test('con contraseña temporal se exige crear una nueva y luego se llega al panel', async ({
      page,
    }) => {
      await page.goto('/ingresar')
      await page.getByLabel('Correo').fill(ADMIN.correo)
      await page.getByLabel('Contraseña').fill(ADMIN.contrasena)
      await page.getByRole('button', { name: 'Ingresar' }).click()
      await expect(page).toHaveURL(/\/cambiar-contrasena$/)
      await page.getByLabel('Contraseña actual').fill(ADMIN.contrasena)
      await page.getByLabel('Nueva contraseña', { exact: true }).fill(ADMIN.nueva)
      await page.getByLabel('Confirmar nueva contraseña').fill(ADMIN.nueva)
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect(page).toHaveURL(/\/panel$/)
      await expect(page.getByRole('heading', { name: /Hola, Admin E2E/ })).toBeVisible()
    })

    test('recargar mantiene la sesión (cookie de refresco)', async ({ page }) => {
      await page.goto('/ingresar')
      await page.getByLabel('Correo').fill(ADMIN.correo)
      await page.getByLabel('Contraseña').fill(ADMIN.nueva)
      await page.getByRole('button', { name: 'Ingresar' }).click()
      await expect(page).toHaveURL(/\/panel$/)
      await page.reload()
      await expect(page.getByRole('heading', { name: /Hola, Admin E2E/ })).toBeVisible()
    })

    test('el administrador crea un usuario y recibe la contraseña temporal', async ({ page }) => {
      await page.goto('/ingresar')
      await page.getByLabel('Correo').fill(ADMIN.correo)
      await page.getByLabel('Contraseña').fill(ADMIN.nueva)
      await page.getByRole('button', { name: 'Ingresar' }).click()
      await page.getByRole('link', { name: 'Usuarios' }).click()
      await expect(page).toHaveURL(/\/panel\/usuarios$/)
      await page.getByRole('button', { name: 'Nuevo usuario' }).click()
      await page.getByLabel('Nombre completo').fill('Coordinadora E2E')
      await page.getByLabel('Correo').fill('e2e-coordinadora@lh.test')
      await page.getByRole('button', { name: 'Crear usuario' }).click()
      const dialogo = page.getByRole('dialog', { name: 'Contraseña temporal' })
      await expect(dialogo).toBeVisible()
      await expect(dialogo.getByText(/^[A-Za-z0-9]{10}$/)).toBeVisible()
      await dialogo.getByRole('button', { name: 'Entendido' }).click()
      await expect(page.getByRole('cell', { name: 'e2e-coordinadora@lh.test' })).toBeVisible()
    })

    test('cerrar sesión vuelve al ingreso y bloquea el panel', async ({ page }) => {
      await page.goto('/ingresar')
      await page.getByLabel('Correo').fill(ADMIN.correo)
      await page.getByLabel('Contraseña').fill(ADMIN.nueva)
      await page.getByRole('button', { name: 'Ingresar' }).click()
      await expect(page).toHaveURL(/\/panel$/)
      await page.getByRole('button', { name: 'Admin E2E', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
      await expect(page).toHaveURL(/\/ingresar$/)
      await page.goto('/panel')
      await expect(page).toHaveURL(/\/ingresar/)
    })
  })

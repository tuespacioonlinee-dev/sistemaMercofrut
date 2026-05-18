/**
 * Setup de autenticación.
 *
 * Hace login UI con el usuario admin y guarda las cookies en
 * `playwright/.auth/admin.json`. Los demás tests heredan ese storageState
 * (configurado en `playwright.config.ts` → projects.chromium).
 *
 * Este "test" corre antes de cualquier otro (proyecto `setup`).
 */
import { test as setup, expect } from "@playwright/test"
import path from "node:path"
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "../helpers/seed"

const adminStateFile = path.resolve(__dirname, "../../playwright/.auth/admin.json")

setup("autenticar admin y guardar storageState", async ({ page }) => {
  await page.goto("/login")

  await page.getByLabel("Email").fill(ADMIN_EMAIL)
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD)
  await page.getByRole("button", { name: /ingresar/i }).click()

  // Tras login OK, el dashboard redirige a "/". Esperamos a que estemos ahí.
  await page.waitForURL("/", { timeout: 15_000 })
  // Sanity check: el sidebar del dashboard debe estar visible.
  await expect(page).toHaveURL("/")

  await page.context().storageState({ path: adminStateFile })
})

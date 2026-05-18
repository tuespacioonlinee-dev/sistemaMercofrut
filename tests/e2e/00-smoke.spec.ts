/**
 * Smoke test del setup E2E.
 *
 * Valida que:
 * - El servidor de Next.js arranca y responde.
 * - El storageState de admin está activo (no redirige a /login).
 * - La conexión a la DB de testing funciona (resetTransactional corre).
 *
 * Si este test pasa, la infraestructura de Playwright está OK.
 */
import { test, expect } from "@playwright/test"
import { prismaTest, resetTransactional } from "../helpers/db"
import { ADMIN_EMAIL } from "../helpers/seed"

test.describe("Smoke — setup E2E", () => {
  test.beforeEach(async () => {
    await resetTransactional()
  })

  test("la base de testing responde y tiene admin sembrado", async () => {
    const admin = await prismaTest.usuario.findUnique({ where: { email: ADMIN_EMAIL } })
    expect(admin).not.toBeNull()
    expect(admin?.rol).toBe("ADMIN")
  })

  test("el dashboard carga estando autenticado como admin", async ({ page }) => {
    await page.goto("/")
    // Si el storageState no estuviera, nos rebotaría a /login.
    await expect(page).not.toHaveURL(/\/login/)
  })
})

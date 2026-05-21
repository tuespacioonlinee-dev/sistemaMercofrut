/**
 * Test 16 — Modo Offline F4: APIs de snapshot + bootstrap.
 *
 * Con OFFLINE_MODE_ENABLED=false (default), las APIs de snapshot
 * responden 404 y el bootstrap no arranca ningún polling (cero
 * overhead). Esta es la guardia anti-regresión para F4.
 *
 * Cuando llegue F5/F6 (UI venta offline) se agregarán tests con el
 * flag activo simulando el flujo completo.
 */
import { test, expect } from "@playwright/test"
import { resetTransactional } from "../helpers/db"
import { seedBase } from "../helpers/seed"

test.describe("Test 16 — Modo Offline F4: snapshots + bootstrap", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("/api/snapshot/clientes responde 404 con flag off", async ({ request }) => {
    const res = await request.get("/api/snapshot/clientes")
    expect(res.status()).toBe(404)
  })

  test("/api/snapshot/productos responde 404 con flag off", async ({ request }) => {
    const res = await request.get("/api/snapshot/productos")
    expect(res.status()).toBe(404)
  })

  test("/api/snapshot/parametros responde 404 con flag off", async ({ request }) => {
    const res = await request.get("/api/snapshot/parametros")
    expect(res.status()).toBe(404)
  })

  test("/api/offline/reservar-rango responde 404 con flag off", async ({ request }) => {
    const res = await request.post("/api/offline/reservar-rango", {
      data: { fingerprint: "fp-test12345", cantidad: 5 },
    })
    expect(res.status()).toBe(404)
  })

  test("dashboard carga sin errores con OfflineBootstrap montado pero flag off", async ({ page }) => {
    const erroresConsola: string[] = []
    page.on("pageerror", (err) => erroresConsola.push(err.message))

    await page.goto("/clientes")
    await expect(page).not.toHaveURL(/\/login/)

    // El bootstrap se monta pero no hace nada — no debe haber errores graves.
    // Filtramos warnings esperados (themeColor, etc.).
    const erroresGraves = erroresConsola.filter(
      (e) => !/themeColor|middleware/i.test(e),
    )
    expect(erroresGraves).toEqual([])
  })
})

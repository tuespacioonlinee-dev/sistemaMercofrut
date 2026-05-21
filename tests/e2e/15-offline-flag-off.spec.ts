/**
 * Test 15 — Modo Offline F3: regresión cero con flag OFF.
 *
 * Verificá que con OFFLINE_MODE_ENABLED=false (default), nada del sistema
 * cambia comparado con la suite previa al bloque offline:
 *  - El banner OfflineBanner NO renderiza nunca.
 *  - Las páginas con OfflineGuard NO muestran pantalla bloqueante.
 *  - El endpoint /api/healthcheck responde 200 (existe y no rompe).
 *  - El endpoint /api/offline/heartbeat responde 404 (flag off).
 *  - El endpoint /api/offline/lock-status responde JSON vacío (flag off).
 *
 * Este test sirve como guardia anti-regresión: el flag off mantiene
 * el sistema EXACTAMENTE como estaba antes del bloque.
 */
import { test, expect } from "@playwright/test"
import { resetTransactional } from "../helpers/db"
import { seedBase } from "../helpers/seed"

test.describe("Test 15 — Modo Offline F3: regresión cero con flag OFF", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("OfflineBanner no aparece en el dashboard cuando el flag está apagado", async ({ page }) => {
    await page.goto("/clientes")
    // No debe aparecer el texto del banner naranja ni el gris.
    await expect(page.getByText(/Modo offline activo/i)).not.toBeVisible()
    await expect(page.getByText(/Otro dispositivo está en modo offline/i)).not.toBeVisible()
  })

  test("OfflineGuard no bloquea /cobros/nuevo cuando el flag está apagado", async ({ page }) => {
    await page.goto("/cobros/nuevo")
    // Debe mostrar la pantalla normal del módulo, no la pantalla bloqueante.
    await expect(page.getByText(/Este módulo no funciona offline/i)).not.toBeVisible()
    // El form normal debe estar visible
    await expect(page.getByRole("heading", { name: /Registrar cobro/i })).toBeVisible()
  })

  test("OfflineGuard no bloquea /caja", async ({ page }) => {
    await page.goto("/caja")
    await expect(page.getByText(/Este módulo no funciona offline/i)).not.toBeVisible()
  })

  test("OfflineGuard no bloquea /cuentas/consulta", async ({ page }) => {
    await page.goto("/cuentas/consulta")
    await expect(page.getByText(/Este módulo no funciona offline/i)).not.toBeVisible()
    await expect(page.getByRole("heading", { name: /Consulta de Cuenta Corriente/i })).toBeVisible()
  })

  test("OfflineGuard no bloquea /reportes", async ({ page }) => {
    await page.goto("/reportes")
    await expect(page.getByText(/Este módulo no funciona offline/i)).not.toBeVisible()
  })

  test("/api/healthcheck responde 200 OK", async ({ request }) => {
    const res = await request.get("/api/healthcheck")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.timestamp).toBeTruthy()
  })

  test("/api/offline/heartbeat responde 404 con flag off", async ({ request }) => {
    const res = await request.post("/api/offline/heartbeat", {
      data: { fingerprint: "fp-test12345", estado: "ONLINE" },
    })
    expect(res.status()).toBe(404)
  })

  test("/api/offline/lock-status devuelve datos vacíos con flag off", async ({ request }) => {
    const res = await request.get("/api/offline/lock-status?fingerprint=fp-test12345")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.otrosDispositivosOffline).toBe(false)
    expect(body.dispositivos).toEqual([])
  })
})

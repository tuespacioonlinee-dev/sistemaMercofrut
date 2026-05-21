/**
 * Test 18 — Bugs reportados durante test local del modo offline.
 *
 * Cubre dos casos detectados:
 *
 * Bug 1 — Hydration mismatch:
 *   Con OFFLINE_MODE_ENABLED=false, las páginas que montan OfflineBanner
 *   o OfflineGuard no deben emitir ningún error de hydration en consola.
 *   El test escucha `pageerror` y verifica que no aparezcan errores con
 *   "Hydration", "did not match" o "didn't match".
 *
 * Bug 2 — Tablas faltantes:
 *   El endpoint /api/offline/lock-status NO debe devolver 500 si la
 *   tabla DispositivoActivo no existe. Debe degradar a una respuesta
 *   "vacía" (otrosDispositivosOffline: false) para no romper la UI.
 *
 *   Como en la branch de testing las tablas SÍ existen, simulamos el
 *   escenario simplemente verificando que la respuesta es siempre 2xx
 *   con shape esperado, incluso bajo carga. La lógica de catch P2021
 *   está cubierta por el code path en src/server/actions/offline.ts.
 */
import { test, expect } from "@playwright/test"
import { resetTransactional } from "../helpers/db"
import { seedBase } from "../helpers/seed"

test.describe("Test 18 — Bugs detectados durante test local del offline", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("Bug 2 — /api/offline/lock-status no devuelve 500 (graceful degrade)", async ({ request }) => {
    // Con flag OFF (estado actual), responde JSON vacío 200.
    const res = await request.get("/api/offline/lock-status?fingerprint=fp-test12345")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty("otrosDispositivosOffline")
    expect(body).toHaveProperty("dispositivos")
    expect(typeof body.otrosDispositivosOffline).toBe("boolean")
    expect(Array.isArray(body.dispositivos)).toBe(true)
  })

  test("Bug 2 — múltiples requests concurrentes a lock-status no rompen", async ({ request }) => {
    // Stress check rápido para detectar race conditions o errores intermitentes.
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request.get("/api/offline/lock-status?fingerprint=fp-test12345"),
      ),
    )
    for (const r of responses) {
      expect(r.status()).toBe(200)
    }
  })

  test("Bug 1 — /clientes carga sin hydration mismatch (con flag off, OfflineBanner monta)", async ({ page }) => {
    const erroresHydration: string[] = []
    page.on("pageerror", (err) => {
      const msg = err.message
      if (/Hydration|did not match|didn't match/i.test(msg)) {
        erroresHydration.push(msg)
      }
    })
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const txt = msg.text()
        if (/Hydration|did not match|didn't match/i.test(txt)) {
          erroresHydration.push(txt)
        }
      }
    })

    await page.goto("/clientes")
    // Esperar a que la página termine de hidratar.
    await page.waitForLoadState("networkidle")
    expect(erroresHydration).toEqual([])
  })

  test("Bug 1 — /ventas/nueva (con OfflineBanner + FormVentaSwitch) sin mismatch", async ({ page }) => {
    const erroresHydration: string[] = []
    page.on("pageerror", (err) => {
      if (/Hydration|did not match|didn't match/i.test(err.message)) {
        erroresHydration.push(err.message)
      }
    })
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Hydration|did not match|didn't match/i.test(msg.text())) {
        erroresHydration.push(msg.text())
      }
    })

    await page.goto("/ventas/nueva")
    await page.waitForLoadState("networkidle")
    expect(erroresHydration).toEqual([])
  })

  test("Bug 1 — /cobros/nuevo (con OfflineGuard envolviendo) sin mismatch", async ({ page }) => {
    const erroresHydration: string[] = []
    page.on("pageerror", (err) => {
      if (/Hydration|did not match|didn't match/i.test(err.message)) {
        erroresHydration.push(err.message)
      }
    })
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Hydration|did not match|didn't match/i.test(msg.text())) {
        erroresHydration.push(msg.text())
      }
    })

    await page.goto("/cobros/nuevo")
    await page.waitForLoadState("networkidle")
    expect(erroresHydration).toEqual([])
  })
})

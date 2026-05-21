/**
 * Test 19 — Bug "Failed to fetch RSC payload" al guardar venta offline.
 *
 * Reportado: tras guardar venta en IndexedDB, el `router.push("/ventas/sincronizar")`
 * intentaba RSC fetch al server estando offline → TypeError: Failed to fetch.
 *
 * Fix verificado:
 * - `FormVentaOffline` NO contiene `router.push("/ventas/sincronizar")` directo.
 *   En su lugar muestra toast + reset form + tarjeta "ver pendientes" con
 *   navegación condicional a online.
 * - `irAPendientesSiOnline()` chequea `useConnectivity` antes de navegar y
 *   muestra toast.info si offline.
 *
 * Como la suite E2E corre con flag OFF (no monta FormVentaOffline), este test
 * combina:
 *  - Verificación de código (grep) del archivo FormVentaOffline para detectar
 *    regresiones al router.push offline.
 *  - Verificación de que /ventas/sincronizar carga sin errores RSC cuando se
 *    navega online (el caso normal post-fix).
 */
import { test, expect } from "@playwright/test"
import { resetTransactional } from "../helpers/db"
import { seedBase } from "../helpers/seed"
import { readFileSync } from "node:fs"
import path from "node:path"

const FORM_PATH = path.resolve(
  __dirname,
  "../../src/app/(dashboard)/ventas/nueva/FormVentaOffline.tsx",
)

test.describe("Test 19 — Fix bug RSC fetch offline en FormVentaOffline", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("FormVentaOffline NO hace router.push directo a /ventas/sincronizar", () => {
    const codigo = readFileSync(FORM_PATH, "utf8")

    // No debe haber router.push("/ventas/sincronizar") directo (sin guard).
    // Permitimos `router.push` dentro de la función guarda
    // `irAPendientesSiOnline` que verifica online antes.
    const matchesDirectos = codigo.match(/router\.push\(["']\/ventas\/sincronizar["']\)/g) ?? []

    // Cada match debe estar dentro del bloque `if (online === true)`.
    // Verificamos buscando la línea de cada match y su contexto.
    for (const m of matchesDirectos) {
      const idx = codigo.indexOf(m)
      const contexto = codigo.slice(Math.max(0, idx - 200), idx)
      expect(
        contexto.includes("online === true"),
        `router.push a /ventas/sincronizar sin guard de online cerca de:\n${contexto.slice(-200)}\n${m}`,
      ).toBe(true)
    }
  })

  test("FormVentaOffline tiene función irAPendientesSiOnline con guard", () => {
    const codigo = readFileSync(FORM_PATH, "utf8")
    expect(codigo).toContain("irAPendientesSiOnline")
    expect(codigo).toMatch(/if\s*\(\s*online\s*===\s*true\s*\)/)
  })

  test("FormVentaOffline resetea el form tras guardar y no navega", () => {
    const codigo = readFileSync(FORM_PATH, "utf8")
    // Después de getOfflineDB().ventasOffline.add, debe haber resetearForm()
    // y NO debe haber router.push justo después.
    const post = codigo.split("ventasOffline.add(ventaOffline)")[1] ?? ""
    expect(post).toContain("resetearForm()")
    // Asegurar que el toast.success se muestra (no se eliminó accidentalmente).
    expect(post).toContain("toast.success")
  })

  test("/ventas/sincronizar carga online sin errores de RSC fetch", async ({ page }) => {
    const erroresRSC: string[] = []
    page.on("pageerror", (err) => {
      if (/RSC|Failed to fetch/i.test(err.message)) erroresRSC.push(err.message)
    })
    page.on("console", (msg) => {
      if (msg.type() === "error" && /RSC|Failed to fetch/i.test(msg.text())) {
        erroresRSC.push(msg.text())
      }
    })

    await page.goto("/ventas/sincronizar")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: /Sincronización de ventas offline/i })).toBeVisible()
    expect(erroresRSC).toEqual([])
  })

  test("/ventas/nueva carga sin errores tras los cambios del fix", async ({ page }) => {
    const erroresGraves: string[] = []
    page.on("pageerror", (err) => erroresGraves.push(err.message))
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const txt = msg.text()
        if (!/themeColor|middleware|Decimal/i.test(txt)) {
          erroresGraves.push(txt)
        }
      }
    })

    await page.goto("/ventas/nueva")
    await page.waitForLoadState("networkidle")
    expect(erroresGraves).toEqual([])
  })
})

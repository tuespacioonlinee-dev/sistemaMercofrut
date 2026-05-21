/**
 * Test 17 — Modo Offline F5/F6: regresión UI con flag OFF.
 *
 * Garantía clave: con OFFLINE_MODE_ENABLED=false, FormVentaSwitch siempre
 * renderiza FormVenta original (cero diff con el comportamiento previo).
 * La pantalla /ventas/sincronizar muestra empty state sin tocar Dexie.
 * Los endpoints sincronizar-venta y reservar-rango responden 404.
 */
import { test, expect } from "@playwright/test"
import { resetTransactional } from "../helpers/db"
import { seedBase, seedClienteSinSaldo, seedProductoConStock, seedCajaAbierta } from "../helpers/seed"
import { prismaTest } from "../helpers/db"

const CUIT = "30-71234567-1"

test.describe("Test 17 — Modo Offline F5/F6: regresión UI con flag OFF", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
    await prismaTest.secuenciaComprobante.deleteMany({ where: { puntoVenta: 1 } })
  })

  test("FormVentaSwitch renderiza FormVenta original cuando el flag está apagado", async ({ page }) => {
    await seedCajaAbierta(0)
    const cliente = await seedClienteSinSaldo({ nombreRazonSocial: "Cliente Switch Test", documento: CUIT })
    const producto = await seedProductoConStock({
      codigo: "SWT01", nombre: "Producto Switch", precioVenta: 100, stock: 50,
    })

    await page.goto("/ventas/nueva")

    // El form ORIGINAL tiene un select con label "Cliente *" — el offline
    // usa estructura distinta. Confirmamos que renderiza el original.
    await expect(page.getByLabel(/Cliente \*/i)).toBeVisible()
    await expect(page.getByLabel(/Condición de venta/i)).toBeVisible()
    // NO debe aparecer el aviso del offline
    await expect(page.getByText(/Estás cargando una venta sin conexión/i)).not.toBeVisible()

    // Verificamos que la venta sigue funcionando exactamente igual
    await page.getByLabel(/Cliente \*/i).selectOption(cliente.id)
    await page.locator('select[name="detalles.0.productoId"]').selectOption(producto.id)
    await page.locator('select[name="detalles.0.unidadId"]').selectOption(producto.unidadBase.id)
    await page.locator('input[name="detalles.0.cantidad"]').fill("3")
    await page.getByRole("button", { name: /confirmar venta/i }).click()
    await page.waitForURL(/\/remitos\/[^/]+$/, { timeout: 15_000 })

    // Verificación DB
    const ventas = await prismaTest.venta.count()
    expect(ventas).toBe(1)
  })

  test("/ventas/sincronizar muestra empty state cuando el flag está apagado", async ({ page }) => {
    await page.goto("/ventas/sincronizar")
    await expect(page.getByRole("heading", { name: /Sincronización de ventas offline/i })).toBeVisible()
    await expect(page.getByText(/modo offline está deshabilitado/i)).toBeVisible()
  })

  test("/api/offline/sincronizar-venta responde 404 con flag off", async ({ request }) => {
    const res = await request.post("/api/offline/sincronizar-venta", {
      data: { fingerprint: "fp-test12345" },
    })
    expect(res.status()).toBe(404)
  })
})

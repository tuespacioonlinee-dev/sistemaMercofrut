/**
 * Test 9 — Verificación de reportes extra: /reportes/caja y /reportes/cuentas.
 *
 * No están explícitamente en el spec del bloque 2 pero son parte de la
 * pantalla de reportes — verificamos que los totales se calculan bien
 * a partir de los movimientos sembrados.
 */
import { test, expect } from "@playwright/test"
import { resetTransactional } from "../helpers/db"
import {
  seedBase,
  seedCajaAbierta,
  seedMovimientoCaja,
  seedClienteConSaldoCC,
  seedProveedorConSaldoCC,
} from "../helpers/seed"

test.describe("Test 9 — Reportes auxiliares: caja y cuentas", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("debería mostrar totales por columna del reporte de caja", async ({ page }) => {
    const caja = await seedCajaAbierta(5_000) // saldo inicial 5.000

    // 2 ventas contado, 1 cobro CC, 1 pago a proveedor.
    await seedMovimientoCaja({
      cajaId: caja.id, tipo: "CONTADO_HABER", categoria: "VENTA_CONTADO",
      monto: 1_000, descripcion: "Venta #A",
    })
    await seedMovimientoCaja({
      cajaId: caja.id, tipo: "CONTADO_HABER", categoria: "VENTA_CONTADO",
      monto: 2_000, descripcion: "Venta #B",
    })
    await seedMovimientoCaja({
      cajaId: caja.id, tipo: "CC_HABER", categoria: "COBRO_CLIENTE",
      monto:  500, descripcion: "Cobro CC",
    })
    await seedMovimientoCaja({
      cajaId: caja.id, tipo: "CC_DEBE", categoria: "PAGO_PROVEEDOR",
      monto: 1_500, descripcion: "Pago prov",
    })

    await page.goto("/reportes/caja")

    await expect(page.getByRole("heading", { name: /Reporte de Caja/i })).toBeVisible()

    // Las 4 columnas contables están en la página con los totales agregados.
    // Verificamos por el texto formateado en pesos.
    // CONTADO_HABER total = 3.000, CONTADO_DEBE = 0, CC_HABER = 500, CC_DEBE = 1.500.
    // formatearPesos genera "$ 3.000,00" etc.
    await expect(page.getByText("$ 3.000,00").first()).toBeVisible()  // Ingresos
    await expect(page.getByText("$ 500,00").first()).toBeVisible()    // Haber CC
    await expect(page.getByText("$ 1.500,00").first()).toBeVisible()  // Debe CC

    // Saldo caja efectivo = 5.000 + 3.000 - 0 = 8.000.
    await expect(page.getByText("$ 8.000,00").first()).toBeVisible()

    // Los 4 conceptos están listados en la tabla de movimientos.
    await expect(page.getByText("Venta #A")).toBeVisible()
    await expect(page.getByText("Venta #B")).toBeVisible()
    await expect(page.getByText("Cobro CC", { exact: true })).toBeVisible()
    await expect(page.getByText("Pago prov", { exact: true })).toBeVisible()
  })

  test("debería listar cuentas con saldo y mostrar totales por titular", async ({ page }) => {
    await seedClienteConSaldoCC({
      nombreRazonSocial: "Cliente Deudor SA",
      documento: "30-99999999-7",
      saldoDeudor: 12_000,
    })
    await seedProveedorConSaldoCC({
      nombreRazonSocial: "Proveedor Mayorista",
      documento: "30-88888888-7",
      saldoDeudor: 30_000,
    })

    await page.goto("/reportes/cuentas")

    await expect(page.getByRole("heading", { name: /Cuentas Corrientes/i })).toBeVisible()

    // Totales por titular.
    await expect(page.getByText(/Clientes nos deben/i)).toBeVisible()
    await expect(page.getByText(/Debemos a proveedores/i)).toBeVisible()
    await expect(page.getByText("$ 12.000,00").first()).toBeVisible()
    await expect(page.getByText("$ 30.000,00").first()).toBeVisible()

    // Las cuentas están listadas.
    await expect(page.getByText("Cliente Deudor SA")).toBeVisible()
    await expect(page.getByText("Proveedor Mayorista")).toBeVisible()
  })
})

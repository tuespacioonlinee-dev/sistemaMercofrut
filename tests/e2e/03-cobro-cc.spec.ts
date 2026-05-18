/**
 * Test 3 — Cobro de cuenta corriente con impacto en caja.
 *
 * Sub-tests:
 *   A. Cobro válido $30.000 sobre $50.000 deudor:
 *      - registra MovimientoCuenta HABER
 *      - baja el saldo de la cuenta a $20.000
 *      - registra MovimientoCaja CC_HABER por el monto
 *      - redirige al detalle de la cuenta
 *   B. Cobro $80.000 (excede saldo $50.000):
 *      - el form muestra mensaje de error
 *      - el saldo de la cuenta NO se modifica
 *      - NO se crean nuevos MovimientoCuenta ni MovimientoCaja
 */
import { test, expect } from "@playwright/test"
import { prismaTest, resetTransactional } from "../helpers/db"
import {
  seedBase,
  seedCajaAbierta,
  seedClienteConSaldoCC,
} from "../helpers/seed"

const CLIENTE_CUIT = "30-71234567-1"
const SALDO_DEUDOR_INICIAL = 50_000

test.describe("Test 3 — Cobro CC con impacto en caja", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("debería registrar un cobro válido y reflejarlo en cuenta y caja", async ({ page }) => {
    const caja = await seedCajaAbierta(0)
    const { cliente, cuenta } = await seedClienteConSaldoCC({
      nombreRazonSocial: "Verdulería del Centro",
      documento: CLIENTE_CUIT,
      saldoDeudor: SALDO_DEUDOR_INICIAL,
    })

    await page.goto("/cobros/nuevo")

    // Seleccionar el cliente desde el buscador (click en el botón del listado).
    await page.getByRole("button", { name: new RegExp(cliente.nombreRazonSocial) }).first().click()

    await page.getByLabel(/Monto cobrado/i).fill("30000")
    await page.getByLabel(/Concepto/i).fill("Pago a cuenta — abono parcial")
    await page.getByRole("button", { name: /registrar cobro/i }).click()

    // Tras un cobro exitoso el form redirige al detalle de la cuenta.
    await page.waitForURL(new RegExp(`/cuentas/${cuenta.id}$`), { timeout: 15_000 })

    // ── Aserciones DB ──
    // El cobro creó un MovimientoCuenta HABER por 30.000.
    const movsHaber = await prismaTest.movimientoCuenta.findMany({
      where: { cuentaId: cuenta.id, tipo: "HABER" },
    })
    expect(movsHaber).toHaveLength(1)
    expect(Number(movsHaber[0].monto)).toBe(30_000)
    expect(Number(movsHaber[0].saldoAnterior)).toBe(SALDO_DEUDOR_INICIAL)
    expect(Number(movsHaber[0].saldoPosterior)).toBe(SALDO_DEUDOR_INICIAL - 30_000)
    expect(movsHaber[0].descripcion).toBe("Pago a cuenta — abono parcial")

    // El saldo de la cuenta bajó a 20.000.
    const cuentaPostCobro = await prismaTest.cuenta.findUniqueOrThrow({ where: { id: cuenta.id } })
    expect(Number(cuentaPostCobro.saldo)).toBe(20_000)

    // En caja: un MovimientoCaja CC_HABER por 30.000.
    const movsCaja = await prismaTest.movimientoCaja.findMany({
      where: { cajaId: caja.id, deletedAt: null },
    })
    expect(movsCaja).toHaveLength(1)
    expect(movsCaja[0].tipo).toBe("CC_HABER")
    expect(movsCaja[0].categoria).toBe("COBRO_CLIENTE")
    expect(Number(movsCaja[0].monto)).toBe(30_000)
  })

  test("debería rechazar un cobro que supere el saldo deudor", async ({ page }) => {
    const caja = await seedCajaAbierta(0)
    const { cliente, cuenta } = await seedClienteConSaldoCC({
      nombreRazonSocial: "Frutería La Cumbre",
      documento: CLIENTE_CUIT,
      saldoDeudor: SALDO_DEUDOR_INICIAL,
    })

    await page.goto("/cobros/nuevo")

    await page.getByRole("button", { name: new RegExp(cliente.nombreRazonSocial) }).first().click()
    await page.getByLabel(/Monto cobrado/i).fill("80000")
    await page.getByLabel(/Concepto/i).fill("Intento de cobro excesivo")
    await page.getByRole("button", { name: /registrar cobro/i }).click()

    // El form NO debe redirigir y debe mostrar un mensaje de error.
    await expect(page.getByText(/no puede superar el saldo/i)).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/cobros\/nuevo/)

    // ── Aserciones DB ──
    // El saldo de la cuenta NO cambió.
    const cuentaPost = await prismaTest.cuenta.findUniqueOrThrow({ where: { id: cuenta.id } })
    expect(Number(cuentaPost.saldo)).toBe(SALDO_DEUDOR_INICIAL)

    // El único MovimientoCuenta es el DEBE inicial del seed; NO hay HABER nuevo.
    const movsHaber = await prismaTest.movimientoCuenta.findMany({
      where: { cuentaId: cuenta.id, tipo: "HABER" },
    })
    expect(movsHaber).toHaveLength(0)

    // En caja: cero movimientos creados por este intento fallido.
    const movsCaja = await prismaTest.movimientoCaja.findMany({
      where: { cajaId: caja.id, deletedAt: null },
    })
    expect(movsCaja).toHaveLength(0)
  })
})

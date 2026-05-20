/**
 * Test 4 — Cierre de caja con validación de cuadre.
 *
 * Adaptación a la realidad del sistema:
 * - No existe ruta `/caja/cierre`. El cierre se hace desde `/caja`, donde
 *   está embebido el componente FormCierreCaja con los totales por columna
 *   y el arqueo.
 *
 * Sub-tests:
 *   A. Cierre cuadrado (arqueo = saldo esperado):
 *      - cierra OK
 *      - estado → CERRADA, fechaCierre, cerradaPor y totales por columna persistidos
 *      - se puede generar el reporte diario (/caja/reporte responde)
 *   B. Cierre con diferencia y SIN motivo en observaciones:
 *      - el server lo rechaza con un mensaje claro
 *      - la caja sigue ABIERTA
 *   C. Cierre con diferencia y CON motivo en observaciones:
 *      - cierra OK con diferencia ≠ 0 persistida
 *      - observaciones contienen el motivo del operador
 */
import { test, expect } from "@playwright/test"
import { prismaTest, resetTransactional } from "../helpers/db"
import { seedBase, seedCajaAbierta, seedMovimientoCaja } from "../helpers/seed"

const SALDO_INICIAL = 0
const VENTA_1 = 1_000
const VENTA_2 = 1_000
const COBRO_CC = 500
const PAGO_PROV = 800

// Saldo "físico" esperado: solo CONTADO_HABER y CONTADO_DEBE afectan el efectivo.
// CC_HABER y CC_DEBE son asientos contables que no mueven el efectivo de caja.
const SALDO_ESPERADO = SALDO_INICIAL + VENTA_1 + VENTA_2 // 2.000

async function sembrarMovimientosBase(cajaId: string) {
  await seedMovimientoCaja({
    cajaId, tipo: "CONTADO_HABER", categoria: "VENTA_CONTADO",
    monto: VENTA_1, descripcion: "Venta #1 contado",
  })
  await seedMovimientoCaja({
    cajaId, tipo: "CONTADO_HABER", categoria: "VENTA_CONTADO",
    monto: VENTA_2, descripcion: "Venta #2 contado",
  })
  await seedMovimientoCaja({
    cajaId, tipo: "CC_HABER", categoria: "COBRO_CLIENTE",
    monto: COBRO_CC, descripcion: "Cobro CC parcial",
  })
  await seedMovimientoCaja({
    cajaId, tipo: "CC_DEBE", categoria: "PAGO_PROVEEDOR",
    monto: PAGO_PROV, descripcion: "Pago proveedor X",
  })
}

test.describe("Test 4 — Cierre de caja con cuadre", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("debería cerrar caja cuando el arqueo coincide con el saldo esperado", async ({ page }) => {
    const caja = await seedCajaAbierta(SALDO_INICIAL)
    await sembrarMovimientosBase(caja.id)

    await page.goto("/caja")

    // El form de cierre muestra los totales por las 4 columnas.
    await expect(page.getByText("Contado", { exact: true })).toBeVisible()
    await expect(page.getByText("Cuenta Corriente", { exact: true })).toBeVisible()

    await page.getByLabel(/Dinero contado en caja/i).fill(String(SALDO_ESPERADO))
    await page.getByRole("button", { name: /^Cerrar caja$/i }).click()

    // Tras un cierre OK, /caja muestra el form de apertura (no hay caja abierta).
    await expect(page.getByRole("heading", { name: /Abrir caja/i })).toBeVisible({ timeout: 10_000 })

    // ── Aserciones DB ──
    const cajaCerrada = await prismaTest.cajaDiaria.findUniqueOrThrow({
      where: { id: caja.id },
      include: { cerradaPor: { select: { email: true } } },
    })
    expect(cajaCerrada.estado).toBe("CERRADA")
    expect(cajaCerrada.fechaCierre).not.toBeNull()
    expect(cajaCerrada.cerradaPorId).not.toBeNull()
    expect(cajaCerrada.cerradaPor?.email).toBe("admin@test.local")
    expect(Number(cajaCerrada.saldoFinal)).toBe(SALDO_ESPERADO)
    expect(Number(cajaCerrada.saldoArqueo)).toBe(SALDO_ESPERADO)
    expect(Number(cajaCerrada.diferencia)).toBe(0)
    expect(Number(cajaCerrada.totalContadoHaber)).toBe(VENTA_1 + VENTA_2)
    expect(Number(cajaCerrada.totalContadoDebe)).toBe(0)
    expect(Number(cajaCerrada.totalCCHaber)).toBe(COBRO_CC)
    expect(Number(cajaCerrada.totalCCDebe)).toBe(PAGO_PROV)

    // El reporte diario de la caja debe ser navegable.
    await page.goto(`/caja/reporte?id=${caja.id}`)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test("debería rechazar el cierre cuando hay diferencia y no se indica motivo", async ({ page }) => {
    const caja = await seedCajaAbierta(SALDO_INICIAL)
    await sembrarMovimientosBase(caja.id)

    await page.goto("/caja")

    // Arqueo intencionalmente menor al esperado, sin observaciones.
    await page.getByLabel(/Dinero contado en caja/i).fill(String(SALDO_ESPERADO - 200))
    await page.getByRole("button", { name: /^Cerrar caja$/i }).click()

    // El server debe haber rechazado: mensaje visible y caja sigue ABIERTA.
    await expect(page.getByText(/diferencia.*motivo|indicá el motivo/i)).toBeVisible({ timeout: 10_000 })

    // ── Aserciones DB ──
    const cajaPost = await prismaTest.cajaDiaria.findUniqueOrThrow({ where: { id: caja.id } })
    expect(cajaPost.estado).toBe("ABIERTA")
    expect(cajaPost.fechaCierre).toBeNull()
    expect(cajaPost.cerradaPorId).toBeNull()
    expect(cajaPost.saldoFinal).toBeNull()
    expect(cajaPost.diferencia).toBeNull()
  })

  test("debería permitir el cierre con diferencia cuando hay motivo en observaciones", async ({ page }) => {
    const caja = await seedCajaAbierta(SALDO_INICIAL)
    await sembrarMovimientosBase(caja.id)

    await page.goto("/caja")

    await page.getByLabel(/Dinero contado en caja/i).fill(String(SALDO_ESPERADO - 200))
    await page.getByLabel(/Observaciones/i).fill("Faltante de $200 — caja chica para gastos menores")
    await page.getByRole("button", { name: /^Cerrar caja$/i }).click()

    await expect(page.getByRole("heading", { name: /Abrir caja/i })).toBeVisible({ timeout: 10_000 })

    // ── Aserciones DB ──
    const cajaCerrada = await prismaTest.cajaDiaria.findUniqueOrThrow({ where: { id: caja.id } })
    expect(cajaCerrada.estado).toBe("CERRADA")
    expect(Number(cajaCerrada.saldoArqueo)).toBe(SALDO_ESPERADO - 200)
    expect(Number(cajaCerrada.diferencia)).toBe(-200)
    expect(cajaCerrada.observaciones).toContain("Faltante de $200")
  })
})

/**
 * Test 5 — Reporte de cuenta corriente por persona.
 *
 * Cubre el flujo completo de `/cuentas/consulta`:
 * - Buscar al cliente por nombre (debounce + lista de resultados).
 * - Seleccionar y ver la tabla de movimientos con filtro TOTALES por defecto.
 * - Cambiar a filtro "Comprobantes No Saldados" y verificar que solo aparecen
 *   las ventas con saldo pendiente > 0.
 * - Descargar el PDF (verificación del archivo, sin parsear contenido).
 */
import { test, expect } from "@playwright/test"
import { prismaTest, resetTransactional } from "../helpers/db"
import { seedBase, obtenerAdmin, seedClienteSinSaldo } from "../helpers/seed"
import { esperarDescarga } from "../helpers/pdf"

const CUIT_CLIENTE = "30-71234567-1"

/**
 * Inserta una secuencia ordenada de MovimientoCuenta en `cuentaId`.
 * Cada mov calcula saldoAnterior/saldoPosterior partiendo de `saldoBase`.
 */
async function sembrarHistorialCuenta(opts: {
  cuentaId: string
  saldoBase: number
  movs: Array<{
    tipo: "DEBE" | "HABER"
    monto: number
    descripcion: string
    origenTipo: string
    origenId: string
  }>
}) {
  const admin = await obtenerAdmin()
  let saldoActual = opts.saldoBase

  const now = Date.now()
  for (let i = 0; i < opts.movs.length; i++) {
    const m = opts.movs[i]
    const saldoAnt = saldoActual
    const delta = m.tipo === "DEBE" ? m.monto : -m.monto
    saldoActual = saldoAnt + delta

    await prismaTest.movimientoCuenta.create({
      data: {
        cuentaId: opts.cuentaId,
        tipo: m.tipo,
        monto: m.monto,
        saldoAnterior: saldoAnt,
        saldoPosterior: saldoActual,
        descripcion: m.descripcion,
        usuarioId: admin.id,
        origenTipo: m.origenTipo,
        origenId: m.origenId,
        // Fechas crecientes para que el orderBy por fecha quede determinístico.
        fecha: new Date(now + i * 1000),
      },
    })
  }

  // Persistir el saldo final en la cuenta.
  await prismaTest.cuenta.update({
    where: { id: opts.cuentaId },
    data: { saldo: saldoActual },
  })

  return saldoActual
}

test.describe("Test 5 — Reporte CTA CTE por persona", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("debería mostrar movimientos, filtrar no saldados y descargar PDF", async ({ page }) => {
    // ── Seed ──
    const cliente = await seedClienteSinSaldo({
      nombreRazonSocial: "Frutera del Valle",
      documento: CUIT_CLIENTE,
    })

    const cuenta = await prismaTest.cuenta.create({
      data: {
        nombre: `Cta. Cte. - ${cliente.nombreRazonSocial}`,
        tipo: "CORRIENTE",
        titular: "CLIENTE",
        clienteId: cliente.id,
        saldo: 0,
      },
    })

    // 3 ventas + 1 cobro aplicado a venta3 (la "salda") + 1 cobro general.
    await sembrarHistorialCuenta({
      cuentaId: cuenta.id,
      saldoBase: 0,
      movs: [
        { tipo: "DEBE",  monto: 1_000, descripcion: "Venta #1", origenTipo: "venta",          origenId: "v1" },
        { tipo: "DEBE",  monto: 1_000, descripcion: "Venta #2", origenTipo: "venta",          origenId: "v2" },
        { tipo: "DEBE",  monto: 1_000, descripcion: "Venta #3", origenTipo: "venta",          origenId: "v3" },
        { tipo: "HABER", monto: 1_000, descripcion: "Cobro aplicado a Venta #3", origenTipo: "cobro", origenId: "v3" },
        { tipo: "HABER", monto:   500, descripcion: "Cobro a cuenta",  origenTipo: "COBRO_CLIENTE", origenId: cuenta.id },
      ],
    })

    // Sanity check del seed antes de tocar UI.
    const movsSembrados = await prismaTest.movimientoCuenta.count({ where: { cuentaId: cuenta.id } })
    expect(movsSembrados, "el seed debe haber dejado 5 movimientos en la cuenta").toBe(5)

    // ── Flujo UI ──
    await page.goto("/cuentas/consulta")

    // Buscar por nombre (≥ 2 chars). El form usa debounce con useTransition.
    await page.getByPlaceholder(/Nombre.*CUIT.*código/i).fill("Frutera")

    // Esperar que aparezca el resultado y hacer click.
    const resultado = page.getByRole("button", { name: /Frutera del Valle/ })
    await resultado.waitFor({ state: "visible", timeout: 10_000 })
    await resultado.click()

    // ── Aserciones: filtro TOTALES (default) ──
    // El header de la tabla muestra el filtro activo + cantidad de movimientos.
    // (Hay dos elementos con ese texto: el radio y el header — uso el header
    // que también muestra el conteo entre paréntesis.)
    await expect(page.getByText(/Movimientos Totales de Cta\. Cte\..*5 movimientos/i))
      .toBeVisible({ timeout: 10_000 })

    // Las descripciones de los 5 movimientos deben estar visibles en la tabla.
    // exact: true para distinguir "Venta #3" de "Cobro aplicado a Venta #3".
    await expect(page.getByRole("cell", { name: "Venta #1", exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Venta #2", exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Venta #3", exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Cobro aplicado a Venta #3" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Cobro a cuenta" })).toBeVisible()

    // ── Cambio a filtro NO_SALDADOS ──
    // El radio se identifica por el label completo.
    await page.getByText("Comprobantes No Saldados").click()

    // Solo venta1 y venta2 quedan: tienen saldo pendiente. Venta3 fue saldada.
    await expect(page.getByText(/Comprobantes No Saldados.*2 movimientos/i))
      .toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole("cell", { name: "Venta #1", exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Venta #2", exact: true })).toBeVisible()
    // En NO_SALDADOS, ni Venta #3 (saldada) ni "Cobro aplicado a Venta #3" deben aparecer.
    await expect(page.getByRole("cell", { name: "Venta #3", exact: true })).not.toBeVisible()
    await expect(page.getByRole("cell", { name: "Cobro aplicado a Venta #3" })).not.toBeVisible()

    // ── Descarga del PDF ──
    const download = await esperarDescarga(page, async () => {
      await page.getByRole("button", { name: /^PDF$/ }).click()
    })
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    expect(download.suggestedFilename().toLowerCase()).toContain("frutera")
  })
})

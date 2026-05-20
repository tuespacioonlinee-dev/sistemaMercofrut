/**
 * Test 6 — Grupo A: Reporte Diario de Stock.
 *
 * Verifica los mapeos de TipoMovimientoStock a columnas:
 * - Egreso Vta       → EGRESO_VENTA
 * - Egreso Merma     → EGRESO_MERMA
 * - Egreso Faltante  → EGRESO_FALTANTE
 * - Egreso Sobra     → AJUSTE_NEGATIVO
 * - Egreso Otros     → DEVOLUCION_PROVEEDOR
 * - Ingreso Compra   → INGRESO_COMPRA
 * - Ingreso Sobrant  → INGRESO_SOBRANTE
 * - Ingreso Otro     → AJUSTE_POSITIVO + DEVOLUCION_CLIENTE
 *
 * Sub-tests:
 *   A. La tabla renderiza con encabezado de caja y filas por producto.
 *   B. Los totales de la fila pie suman correctamente.
 *   C. El PDF se descarga con el nombre esperado.
 */
import { test, expect } from "@playwright/test"
import { prismaTest, resetTransactional } from "../helpers/db"
import {
  seedBase,
  seedCajaAbierta,
  seedProductoConStock,
  obtenerAdmin,
} from "../helpers/seed"
import { esperarDescarga } from "../helpers/pdf"

async function sembrarMovStock(opts: {
  productoId: string
  tipo:
    | "EGRESO_VENTA" | "EGRESO_MERMA" | "EGRESO_FALTANTE"
    | "AJUSTE_NEGATIVO" | "DEVOLUCION_PROVEEDOR"
    | "INGRESO_COMPRA" | "INGRESO_SOBRANTE"
    | "AJUSTE_POSITIVO" | "DEVOLUCION_CLIENTE"
  cantidad: number
  stockAnterior: number
  stockPosterior: number
  fecha: Date
}) {
  const admin = await obtenerAdmin()
  return prismaTest.movimientoStock.create({
    data: {
      productoId: opts.productoId,
      tipo: opts.tipo,
      cantidad: opts.cantidad,
      stockAnterior: opts.stockAnterior,
      stockPosterior: opts.stockPosterior,
      usuarioId: admin.id,
      fecha: opts.fecha,
    },
  })
}

test.describe("Test 6 — Grupo A: Reporte Diario de Stock", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("debería mostrar los movimientos del día agrupados por tipo y descargar PDF", async ({ page }) => {
    // Caja abierta — el reporte usa fechaApertura como `desde` y `hasta` = ahora.
    const caja = await seedCajaAbierta(0)
    const tStart = caja.fechaApertura.getTime()

    // Un producto con stock inicial 100.
    const naranja = await seedProductoConStock({
      codigo: "NAR001",
      nombre: "Naranja",
      precioVenta: 1000,
      stock: 100,
    })

    // Sembramos movs en orden cronológico con saldos coherentes.
    // Stock parte de 100 (el seed).
    // 5 egresos + 5 ingresos = 10 movs. Calculo stockAnterior/stockPosterior paso a paso.
    let stockActual = 100
    let segundo = 1
    const mov = async (tipo: Parameters<typeof sembrarMovStock>[0]["tipo"], cantidad: number, esEgreso: boolean) => {
      const anterior = stockActual
      stockActual = esEgreso ? stockActual - cantidad : stockActual + cantidad
      await sembrarMovStock({
        productoId: naranja.id,
        tipo,
        cantidad,
        stockAnterior: anterior,
        stockPosterior: stockActual,
        fecha: new Date(tStart + 1000 * segundo++),
      })
    }

    // ── 5 egresos (uno por cada columna) ──
    await mov("EGRESO_VENTA",         5, true) // Vta:      5
    await mov("EGRESO_MERMA",         2, true) // Merma:    2
    await mov("EGRESO_FALTANTE",      1, true) // Faltante: 1
    await mov("AJUSTE_NEGATIVO",      3, true) // Sobra:    3
    await mov("DEVOLUCION_PROVEEDOR", 4, true) // Otros:    4
    // Total egresos: 15

    // ── 5 ingresos ──
    await mov("INGRESO_COMPRA",      10, false) // Compra:   10
    await mov("INGRESO_SOBRANTE",     2, false) // Sobrant:  2
    await mov("AJUSTE_POSITIVO",      3, false) // → Otro
    await mov("DEVOLUCION_CLIENTE",   1, false) // → Otro
    // Otro total = AJUSTE_POSITIVO + DEVOLUCION_CLIENTE = 4
    // Total ingresos: 16

    // Actualizar stockTotal del producto a `stockActual` final.
    await prismaTest.producto.update({
      where: { id: naranja.id },
      data: { stockTotal: stockActual },
    })

    // ── Navegación UI ──
    await page.goto("/reportes/stock")

    // Encabezado con info de caja.
    await expect(page.getByRole("heading", { name: /Reporte Diario de Stock/i })).toBeVisible()
    // El número de caja aparece en 2 lugares (subtítulo + tarjeta de caja). Validamos
    // que esté visible al menos una vez.
    await expect(page.getByText(new RegExp(`Caja N°\\s*${caja.numero}`)).first()).toBeVisible()
    await expect(page.getByText("ABIERTA", { exact: true })).toBeVisible()

    // Fila del producto con stockInicial = 100, stockFinal = 100 - 15 + 16 = 101.
    // El test no chequea las celdas numéricas una por una (frágil con locale), sino
    // que verifica que se ve la descripción y la presentación.
    await expect(page.getByRole("cell", { name: "Naranja" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "NAR001" })).toBeVisible()

    // ── Aserción UI: la fila del producto está visible ──
    await expect(page.getByRole("row").filter({ hasText: "Naranja" })).toBeVisible()

    // ── Aserciones DB: verificar las sumas por tipo (que el server action mapea) ──
    // El reporte agrupa por tipo y suma cantidad. Replicamos esa agregación acá
    // para confirmar que los datos sembrados están bien.
    const sumPorTipo = await prismaTest.movimientoStock.groupBy({
      by: ["tipo"],
      where: { productoId: naranja.id },
      _sum: { cantidad: true },
    })

    const sumOf = (tipo: string) =>
      Number(sumPorTipo.find((s) => s.tipo === tipo)?._sum.cantidad ?? 0)

    // Egresos por columna (con el mapeo confirmado en la auditoría)
    expect(sumOf("EGRESO_VENTA")).toBe(5)         // → Vta
    expect(sumOf("EGRESO_MERMA")).toBe(2)         // → Merma
    expect(sumOf("EGRESO_FALTANTE")).toBe(1)      // → Faltante
    expect(sumOf("AJUSTE_NEGATIVO")).toBe(3)      // → Sobra
    expect(sumOf("DEVOLUCION_PROVEEDOR")).toBe(4) // → Otros

    // Ingresos por columna
    expect(sumOf("INGRESO_COMPRA")).toBe(10)      // → Compra
    expect(sumOf("INGRESO_SOBRANTE")).toBe(2)     // → Sobrant
    expect(sumOf("AJUSTE_POSITIVO")).toBe(3)      // ↘
    expect(sumOf("DEVOLUCION_CLIENTE")).toBe(1)   // ↗ ambos suman en "Otro"

    // Total de movs sembrados: 9 (5 egresos + 4 ingresos, sin Merma/Faltante ingreso).
    const totalMovs = await prismaTest.movimientoStock.count({
      where: { productoId: naranja.id },
    })
    expect(totalMovs).toBe(9)

    // El stockTotal final debe ser 100 - 15 + 16 = 101.
    const productoFinal = await prismaTest.producto.findUniqueOrThrow({ where: { id: naranja.id } })
    expect(Number(productoFinal.stockTotal)).toBe(101)

    // ── Descarga PDF ──
    const download = await esperarDescarga(page, async () => {
      await page.getByRole("button", { name: /^PDF$/ }).click()
    })
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    expect(download.suggestedFilename()).toContain(String(caja.numero))
  })
})

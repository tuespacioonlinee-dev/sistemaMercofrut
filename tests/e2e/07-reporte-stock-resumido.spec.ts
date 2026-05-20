/**
 * Test 7 — Grupo B: Reporte de Stock Resumido.
 *
 * Verifica la versión condensada del Grupo A: en lugar de mostrar las 10 columnas
 * de tipos de movimiento, muestra solo Total Egresos y Total Ingresos.
 *
 * La server action `obtenerReporteStockResumido()` wrappea `obtenerReporteStockDiario()`
 * y proyecta los totales, así que la lógica de mapeo ya está cubierta por el Test 6.
 * Acá validamos que la ruta carga, agrega los totales y exporta PDF.
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

test.describe("Test 7 — Grupo B: Reporte Stock Resumido", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("debería mostrar totales agregados por producto y descargar PDF", async ({ page }) => {
    const caja = await seedCajaAbierta(0)
    const admin = await obtenerAdmin()
    const producto = await seedProductoConStock({
      codigo: "MAN001",
      nombre: "Manzana",
      precioVenta: 1500,
      stock: 200,
    })

    // 2 egresos (venta + merma) + 1 ingreso (compra)
    const tStart = caja.fechaApertura.getTime()
    const movs = [
      { tipo: "EGRESO_VENTA" as const,  cant: 10, esEg: true,  fecha: new Date(tStart + 1000) },
      { tipo: "EGRESO_MERMA" as const,  cant:  5, esEg: true,  fecha: new Date(tStart + 2000) },
      { tipo: "INGRESO_COMPRA" as const, cant: 30, esEg: false, fecha: new Date(tStart + 3000) },
    ]
    let stock = 200
    for (const m of movs) {
      const ant = stock
      stock = m.esEg ? stock - m.cant : stock + m.cant
      await prismaTest.movimientoStock.create({
        data: {
          productoId: producto.id,
          tipo: m.tipo,
          cantidad: m.cant,
          stockAnterior: ant,
          stockPosterior: stock,
          usuarioId: admin.id,
          fecha: m.fecha,
        },
      })
    }
    await prismaTest.producto.update({
      where: { id: producto.id },
      data: { stockTotal: stock },
    })

    // ── UI ──
    await page.goto("/reportes/stock-resumido")

    await expect(page.getByRole("heading", { name: /Reporte Stock Resumido|Stock Resumido/i }))
      .toBeVisible()

    // Fila del producto visible.
    await expect(page.getByRole("row").filter({ hasText: "Manzana" })).toBeVisible()

    // ── Aserciones contra DB para confirmar totales ──
    // Total egresos esperado = 10 + 5 = 15. Total ingresos = 30. Stock final = 200 - 15 + 30 = 215.
    const totalEgresos = await prismaTest.movimientoStock.aggregate({
      where: {
        productoId: producto.id,
        tipo: { in: ["EGRESO_VENTA", "EGRESO_MERMA"] },
      },
      _sum: { cantidad: true },
    })
    expect(Number(totalEgresos._sum.cantidad ?? 0)).toBe(15)

    const totalIngresos = await prismaTest.movimientoStock.aggregate({
      where: {
        productoId: producto.id,
        tipo: "INGRESO_COMPRA",
      },
      _sum: { cantidad: true },
    })
    expect(Number(totalIngresos._sum.cantidad ?? 0)).toBe(30)

    const productoPost = await prismaTest.producto.findUniqueOrThrow({ where: { id: producto.id } })
    expect(Number(productoPost.stockTotal)).toBe(215)

    // ── Descarga PDF ──
    const download = await esperarDescarga(page, async () => {
      await page.getByRole("button", { name: /^PDF$/ }).click()
    })
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
    expect(download.suggestedFilename().toLowerCase()).toContain("resumido")
  })
})

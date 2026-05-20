/**
 * Test 11 — Bloque B: Notas de crédito y débito.
 *
 * Sub-tests (via UI completo del form de emisión):
 *   1. Emitir NC del 50% de una venta CC → saldo cliente baja a la mitad,
 *      stock devuelto, MovimientoCuenta HABER creado, número con formato AFIP.
 *   2. Emitir NC con generaMovimientoStock=false → saldo baja, stock NO cambia.
 *   3. Emitir ND → saldo cliente sube, MovimientoCuenta DEBE creado.
 *   4. Intentar NC mayor al saldo deudor → toast con error visible, sin efectos.
 *
 * Cada test siembra una venta limpia vía Prisma (la venta de origen NO es
 * lo que estamos testeando; queremos foco en la emisión de la nota).
 */
import { test, expect } from "@playwright/test"
import { prismaTest, resetTransactional } from "../helpers/db"
import {
  seedBase,
  seedCajaAbierta,
  seedClienteSinSaldo,
  seedProductoConStock,
  obtenerAdmin,
} from "../helpers/seed"

const CUIT = "30-71234567-1"

interface SeedResult {
  ventaId: string
  cuentaId: string
  productoId: string
  cuenta: Awaited<ReturnType<typeof prismaTest.cuenta.findUniqueOrThrow>>
  producto: Awaited<ReturnType<typeof seedProductoConStock>>
}

async function seedVentaCCConSaldo(opts: {
  nombre: string
  cantidad: number
  precio: number
  stockInicial: number
}): Promise<SeedResult> {
  const admin = await obtenerAdmin()
  const cliente = await seedClienteSinSaldo({ nombreRazonSocial: opts.nombre, documento: CUIT })
  const producto = await seedProductoConStock({
    codigo: `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    nombre: `Prod-${opts.nombre}`,
    precioVenta: opts.precio,
    stock: opts.stockInicial,
  })
  const subtotal = opts.cantidad * opts.precio
  const cuenta = await prismaTest.cuenta.create({
    data: {
      nombre: `CC ${opts.nombre}`,
      tipo: "CORRIENTE",
      titular: "CLIENTE",
      clienteId: cliente.id,
      saldo: subtotal, // saldo deudor inicial = lo que se vendió
    },
  })
  const venta = await prismaTest.venta.create({
    data: {
      clienteId: cliente.id,
      cuentaId:  cuenta.id,
      condicion: "CUENTA_CORRIENTE",
      subtotal,
      descuento: 0,
      total: subtotal,
      creadaPorId: admin.id,
      detalles: {
        create: [
          {
            productoId: producto.id,
            unidadId:   producto.unidadBase.id,
            cantidad:   opts.cantidad,
            cantidadBase: opts.cantidad,
            precioUnitario: opts.precio,
            subtotal,
          },
        ],
      },
    },
  })
  // Movimiento de cuenta DEBE coherente con saldo
  await prismaTest.movimientoCuenta.create({
    data: {
      cuentaId: cuenta.id,
      tipo: "DEBE",
      monto: subtotal,
      saldoAnterior: 0,
      saldoPosterior: subtotal,
      descripcion: `Venta #${venta.numero}`,
      usuarioId: admin.id,
    },
  })
  // Stock descontado por la venta
  await prismaTest.producto.update({
    where: { id: producto.id },
    data: { stockTotal: { decrement: opts.cantidad } },
  })
  return { ventaId: venta.id, cuentaId: cuenta.id, productoId: producto.id, cuenta, producto }
}

test.describe("Test 11 — Bloque B: Notas de crédito y débito", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
    await prismaTest.secuenciaComprobante.deleteMany({ where: { puntoVenta: 1 } })
  })

  test("emite NC del 50% de la venta, devuelve stock y baja saldo", async ({ page }) => {
    await seedCajaAbierta(0)
    const { ventaId, cuentaId, productoId } = await seedVentaCCConSaldo({
      nombre: "NC50",
      cantidad: 10,
      precio: 100,
      stockInicial: 100, // → 90 tras la venta
    })

    await page.goto(`/notas/nueva?ventaId=${ventaId}&tipo=CREDITO`)
    await expect(page.getByRole("heading", { name: /Nota de crédito/i })).toBeVisible()

    // Reducir cantidad de 10 → 5 (50%) y completar motivo
    const inputCant = page.locator('input[type="number"]').nth(0)
    await inputCant.fill("5")
    await page.getByLabel(/Motivo/i).fill("Devolución parcial de 5 unidades")

    // Confirmar (devuelve stock por default)
    await page.getByRole("button", { name: /Emitir nota de crédito/i }).click()

    // Redirige a /notas/<id>
    await page.waitForURL(/\/notas\/c[a-z0-9]+$/, { timeout: 15_000 })

    // Aserciones DB
    const cuentaPost = await prismaTest.cuenta.findUniqueOrThrow({ where: { id: cuentaId } })
    expect(Number(cuentaPost.saldo)).toBe(500)

    const movsHaber = await prismaTest.movimientoCuenta.findMany({
      where: { cuentaId, tipo: "HABER", origenTipo: "nota_credito" },
    })
    expect(movsHaber).toHaveLength(1)
    expect(Number(movsHaber[0].monto)).toBe(500)

    const productoPost = await prismaTest.producto.findUniqueOrThrow({ where: { id: productoId } })
    expect(Number(productoPost.stockTotal)).toBe(95) // 90 + 5

    const nota = await prismaTest.notaCreditoDebito.findFirstOrThrow({
      where: { ventaOrigenId: ventaId },
    })
    expect(nota.tipo).toBe("CREDITO")
    expect(nota.numero).toMatch(/^0001-\d{8}$/)
    expect(Number(nota.montoTotal)).toBe(500)
  })

  test("NC sin devolver stock baja saldo pero no toca inventario", async ({ page }) => {
    await seedCajaAbierta(0)
    const { ventaId, cuentaId, productoId } = await seedVentaCCConSaldo({
      nombre: "NCsinStock",
      cantidad: 10,
      precio: 50,
      stockInicial: 50,
    })
    const stockPostVenta = (await prismaTest.producto.findUniqueOrThrow({ where: { id: productoId } })).stockTotal

    await page.goto(`/notas/nueva?ventaId=${ventaId}&tipo=CREDITO`)
    // Cant: 2 (mantengo precio 50 → subtotal 100)
    await page.locator('input[type="number"]').nth(0).fill("2")
    // Destildar "Devuelve stock"
    const stockCheckbox = page.locator('input[type="checkbox"][title*="stock"]').first()
    await stockCheckbox.uncheck()
    await page.getByLabel(/Motivo/i).fill("Descuento posterior sin devolución")
    await page.getByRole("button", { name: /Emitir nota de crédito/i }).click()
    await page.waitForURL(/\/notas\/c[a-z0-9]+$/, { timeout: 15_000 })

    const cuentaPost = await prismaTest.cuenta.findUniqueOrThrow({ where: { id: cuentaId } })
    expect(Number(cuentaPost.saldo)).toBe(400) // 500 - 100

    const productoPost = await prismaTest.producto.findUniqueOrThrow({ where: { id: productoId } })
    expect(Number(productoPost.stockTotal)).toBe(Number(stockPostVenta)) // sin cambios

    const movsStockNota = await prismaTest.movimientoStock.count({
      where: { origenTipo: "nota_credito" },
    })
    expect(movsStockNota).toBe(0)
  })

  test("ND suma deuda al cliente sin tocar stock", async ({ page }) => {
    await seedCajaAbierta(0)
    const { ventaId, cuentaId, productoId } = await seedVentaCCConSaldo({
      nombre: "ND-Cargo",
      cantidad: 10,
      precio: 200,
      stockInicial: 30,
    })
    const stockPrevia = (await prismaTest.producto.findUniqueOrThrow({ where: { id: productoId } })).stockTotal

    await page.goto(`/notas/nueva?ventaId=${ventaId}&tipo=DEBITO`)
    await expect(page.getByRole("heading", { name: /Nota de débito/i })).toBeVisible()

    // Cant: 1, precio: 150 → subtotal 150
    await page.locator('input[type="number"]').nth(0).fill("1")
    await page.locator('input[type="number"]').nth(1).fill("150")
    await page.getByLabel(/Motivo/i).fill("Cargo adicional por ajuste de precio")
    await page.getByRole("button", { name: /Emitir nota de débito/i }).click()
    await page.waitForURL(/\/notas\/c[a-z0-9]+$/, { timeout: 15_000 })

    const cuentaPost = await prismaTest.cuenta.findUniqueOrThrow({ where: { id: cuentaId } })
    expect(Number(cuentaPost.saldo)).toBe(2150) // 2000 + 150

    const movsDebe = await prismaTest.movimientoCuenta.findMany({
      where: { cuentaId, tipo: "DEBE", origenTipo: "nota_debito" },
    })
    expect(movsDebe).toHaveLength(1)
    expect(Number(movsDebe[0].monto)).toBe(150)

    const productoPost = await prismaTest.producto.findUniqueOrThrow({ where: { id: productoId } })
    expect(Number(productoPost.stockTotal)).toBe(Number(stockPrevia)) // intacto
  })

  test("rechaza NC que supere el saldo deudor con error visible", async ({ page }) => {
    await seedCajaAbierta(0)
    const { ventaId, cuentaId } = await seedVentaCCConSaldo({
      nombre: "NCexcede",
      cantidad: 3,
      precio: 100,
      stockInicial: 50,
    })
    // Saldo = 300

    await page.goto(`/notas/nueva?ventaId=${ventaId}&tipo=CREDITO`)
    // Intentar precio 1000 sobre 3 unidades → 3000 (excede 300)
    await page.locator('input[type="number"]').nth(0).fill("3")
    await page.locator('input[type="number"]').nth(1).fill("1000")
    await page.getByLabel(/Motivo/i).fill("Intento de NC excedida")
    await page.getByRole("button", { name: /Emitir nota de crédito/i }).click()

    // Debe aparecer toast de error y NO redirigir
    await expect(page.getByText(/supera el saldo deudor/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/notas\/nueva/)

    // No se creó nota ni se movió saldo
    const notas = await prismaTest.notaCreditoDebito.count()
    expect(notas).toBe(0)

    const cuentaPost = await prismaTest.cuenta.findUniqueOrThrow({ where: { id: cuentaId } })
    expect(Number(cuentaPost.saldo)).toBe(300)
  })
})

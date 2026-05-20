/**
 * Test 2 — Venta con remito automático y partida doble.
 *
 * Cubre los dos modos de venta y verifica los efectos colaterales en
 * stock, caja, cuenta corriente y remitos.
 *
 * Sub-tests:
 *   A. Venta CONTADO con 2 productos:
 *      - genera Venta + Remito EMITIDO con número correlativo
 *      - registra MovimientoCaja CONTADO_HABER por el total
 *      - descuenta stock atómicamente y crea 2 MovimientoStock EGRESO_VENTA
 *      - NO crea MovimientoCuenta DEBE (es contado, no hay deuda)
 *      - redirige a la pantalla del remito
 *   B. Venta CUENTA_CORRIENTE con 1 producto:
 *      - genera Venta + Remito EMITIDO
 *      - registra MovimientoCuenta DEBE en la cuenta CORRIENTE del cliente
 *      - registra MovimientoCaja CC_DEBE (asiento contable, no afecta efectivo)
 *      - NO altera el saldo físico de caja (no hay CONTADO_HABER ni CONTADO_DEBE)
 *      - el saldo de la cuenta del cliente refleja la nueva deuda
 */
import { test, expect } from "@playwright/test"
import { prismaTest, resetTransactional } from "../helpers/db"
import {
  seedBase,
  seedCajaAbierta,
  seedClienteSinSaldo,
  seedProductoConStock,
} from "../helpers/seed"

const CLIENTE_CUIT = "30-71234567-1"
const SALDO_INICIAL_CAJA = 0

test.describe("Test 2 — Venta con remito y partida doble", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("debería crear una venta CONTADO con remito y movimiento de caja, descontando stock", async ({ page }) => {
    // ── Seed específico ──
    const caja = await seedCajaAbierta(SALDO_INICIAL_CAJA)
    const cliente = await seedClienteSinSaldo({
      nombreRazonSocial: "Frutas Pérez SRL",
      documento: CLIENTE_CUIT,
    })
    const naranja = await seedProductoConStock({
      codigo: "NAR001",
      nombre: "Naranja",
      precioVenta: 1000,
      stock: 50,
    })
    const manzana = await seedProductoConStock({
      codigo: "MAN001",
      nombre: "Manzana",
      precioVenta: 2000,
      stock: 50,
    })

    // ── Flujo UI ──
    await page.goto("/ventas/nueva")

    await page.getByLabel(/Cliente \*/i).selectOption(cliente.id)
    await page.getByLabel(/Condición de venta/i).selectOption("CONTADO")

    // Producto 1 — Naranja, 5 kg.
    // Los selects de detalles no tienen labels accesibles; usamos selectores por name.
    // Seleccionamos el producto y luego forzamos la unidad explícitamente para evitar
    // condiciones de carrera con el auto-set de unidadId del form.
    await page.locator('select[name="detalles.0.productoId"]').selectOption(naranja.id)
    await page.locator('select[name="detalles.0.unidadId"]').selectOption(naranja.unidadBase.id)
    await page.locator('input[name="detalles.0.cantidad"]').fill("5")

    // Click "Agregar producto" para agregar la segunda línea.
    await page.getByRole("button", { name: /agregar producto/i }).click()

    // Producto 2 — Manzana, 3 kg.
    await page.locator('select[name="detalles.1.productoId"]').selectOption(manzana.id)
    await page.locator('select[name="detalles.1.unidadId"]').selectOption(manzana.unidadBase.id)
    await page.locator('input[name="detalles.1.cantidad"]').fill("3")

    await page.getByRole("button", { name: /confirmar venta/i }).click()

    // Tras una venta exitosa con remito, el form redirige a /remitos/<id>.
    await page.waitForURL(/\/remitos\/[^/]+$/, { timeout: 15_000 })

    // ── Aserciones contra DB ──
    // Una sola venta, sin ANULADA.
    const ventas = await prismaTest.venta.findMany({
      include: { detalles: true, remitos: true, cuenta: true },
    })
    expect(ventas).toHaveLength(1)

    const venta = ventas[0]
    const totalEsperado = 5 * 1000 + 3 * 2000 // 11.000
    expect(venta.estado).toBe("CONFIRMADA")
    expect(venta.condicion).toBe("CONTADO")
    expect(Number(venta.subtotal)).toBe(totalEsperado)
    expect(Number(venta.descuento)).toBe(0)
    expect(Number(venta.total)).toBe(totalEsperado)
    expect(venta.clienteId).toBe(cliente.id)
    expect(venta.detalles).toHaveLength(2)

    // El remito debe estar EMITIDO, con número correlativo formateado.
    expect(venta.remitos).toHaveLength(1)
    const remito = venta.remitos[0]
    expect(remito.estado).toBe("EMITIDO")
    expect(remito.numero).toMatch(/^\d{4,5}-\d{8}$/)

    // MovimientoCaja: exactamente uno tipo CONTADO_HABER con el total de la venta.
    const movsCaja = await prismaTest.movimientoCaja.findMany({
      where: { cajaId: caja.id, deletedAt: null },
    })
    expect(movsCaja).toHaveLength(1)
    expect(movsCaja[0].tipo).toBe("CONTADO_HABER")
    expect(movsCaja[0].categoria).toBe("VENTA_CONTADO")
    expect(Number(movsCaja[0].monto)).toBe(totalEsperado)
    expect(movsCaja[0].origenTipo).toBe("venta")
    expect(movsCaja[0].origenId).toBe(venta.id)

    // En venta CONTADO también se asienta un MovimientoCuenta DEBE, pero en la
    // cuenta tipo CONTADO del cliente — eso es la mitad "deudora" de la partida
    // doble (la mitad "acreedora" es el MovimientoCaja CONTADO_HABER de arriba).
    // Lo que importa es que la cuenta sea CONTADO, no CORRIENTE.
    expect(venta.cuenta.tipo).toBe("CONTADO")
    const movsCuentaDebe = await prismaTest.movimientoCuenta.findMany({
      where: { cuentaId: venta.cuentaId, tipo: "DEBE" },
    })
    expect(movsCuentaDebe).toHaveLength(1)
    expect(Number(movsCuentaDebe[0].monto)).toBe(totalEsperado)

    // MovimientoStock: dos egresos por venta, con stockPosterior coherente.
    const movsStock = await prismaTest.movimientoStock.findMany({
      where: { tipo: "EGRESO_VENTA", origenTipo: "venta", origenId: venta.id },
      orderBy: { fecha: "asc" },
    })
    expect(movsStock).toHaveLength(2)

    const movNaranja = movsStock.find((m) => m.productoId === naranja.id)
    const movManzana = movsStock.find((m) => m.productoId === manzana.id)
    expect(movNaranja).toBeDefined()
    expect(movManzana).toBeDefined()
    expect(Number(movNaranja!.cantidad)).toBe(5)
    expect(Number(movNaranja!.stockAnterior)).toBe(50)
    expect(Number(movNaranja!.stockPosterior)).toBe(45)
    expect(Number(movManzana!.cantidad)).toBe(3)
    expect(Number(movManzana!.stockAnterior)).toBe(50)
    expect(Number(movManzana!.stockPosterior)).toBe(47)

    // Stock final en la tabla Producto.
    const naranjaFinal = await prismaTest.producto.findUniqueOrThrow({ where: { id: naranja.id } })
    const manzanaFinal = await prismaTest.producto.findUniqueOrThrow({ where: { id: manzana.id } })
    expect(Number(naranjaFinal.stockTotal)).toBe(45)
    expect(Number(manzanaFinal.stockTotal)).toBe(47)
  })

  test("debería crear una venta CUENTA_CORRIENTE generando deuda sin afectar efectivo de caja", async ({ page }) => {
    // ── Seed específico ──
    const caja = await seedCajaAbierta(SALDO_INICIAL_CAJA)
    const cliente = await seedClienteSinSaldo({
      nombreRazonSocial: "Verdulería del Norte",
      documento: CLIENTE_CUIT,
    })
    const naranja = await seedProductoConStock({
      codigo: "NAR001",
      nombre: "Naranja",
      precioVenta: 1500,
      stock: 30,
    })

    // ── Flujo UI ──
    await page.goto("/ventas/nueva")

    await page.getByLabel(/Cliente \*/i).selectOption(cliente.id)
    await page.getByLabel(/Condición de venta/i).selectOption("CUENTA_CORRIENTE")

    await page.locator('select[name="detalles.0.productoId"]').selectOption(naranja.id)
    await page.locator('select[name="detalles.0.unidadId"]').selectOption(naranja.unidadBase.id)
    await page.locator('input[name="detalles.0.cantidad"]').fill("5")

    await page.getByRole("button", { name: /confirmar venta/i }).click()
    await page.waitForURL(/\/remitos\/[^/]+$/, { timeout: 15_000 })

    // ── Aserciones contra DB ──
    const venta = await prismaTest.venta.findFirstOrThrow({
      include: { cuenta: true, remitos: true },
    })
    const totalEsperado = 5 * 1500 // 7.500
    expect(venta.condicion).toBe("CUENTA_CORRIENTE")
    expect(Number(venta.total)).toBe(totalEsperado)
    expect(venta.remitos).toHaveLength(1)

    // La cuenta del cliente debe ser tipo CORRIENTE y reflejar la deuda.
    expect(venta.cuenta.tipo).toBe("CORRIENTE")
    expect(venta.cuenta.clienteId).toBe(cliente.id)
    expect(Number(venta.cuenta.saldo)).toBe(totalEsperado)

    // Debe existir exactamente un MovimientoCuenta DEBE por el total.
    const movsCuenta = await prismaTest.movimientoCuenta.findMany({
      where: { cuentaId: venta.cuentaId },
    })
    expect(movsCuenta).toHaveLength(1)
    expect(movsCuenta[0].tipo).toBe("DEBE")
    expect(Number(movsCuenta[0].monto)).toBe(totalEsperado)
    expect(Number(movsCuenta[0].saldoAnterior)).toBe(0)
    expect(Number(movsCuenta[0].saldoPosterior)).toBe(totalEsperado)

    // En caja: NO debe haber CONTADO_HABER ni CONTADO_DEBE (no afecta efectivo).
    // SÍ debe haber un asiento CC_DEBE por el total.
    const movsCaja = await prismaTest.movimientoCaja.findMany({
      where: { cajaId: caja.id, deletedAt: null },
    })
    const tipos = movsCaja.map((m) => m.tipo).sort()
    expect(tipos).toEqual(["CC_DEBE"])

    const movCCDebe = movsCaja.find((m) => m.tipo === "CC_DEBE")!
    expect(Number(movCCDebe.monto)).toBe(totalEsperado)
    expect(movCCDebe.origenTipo).toBe("venta")
    expect(movCCDebe.origenId).toBe(venta.id)

    // El saldo "físico" de caja no se mueve: solo cuentan CONTADO_HABER/DEBE.
    const cajaPostventa = await prismaTest.cajaDiaria.findUniqueOrThrow({
      where: { id: caja.id },
    })
    expect(Number(cajaPostventa.saldoInicial)).toBe(SALDO_INICIAL_CAJA)
    expect(cajaPostventa.estado).toBe("ABIERTA") // sigue abierta, no se cerró

    // Stock descontado.
    const naranjaFinal = await prismaTest.producto.findUniqueOrThrow({ where: { id: naranja.id } })
    expect(Number(naranjaFinal.stockTotal)).toBe(25)
  })
})

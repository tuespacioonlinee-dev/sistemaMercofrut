/**
 * Test 13 — Bloque D: Validaciones Zod (unit tests).
 *
 * Auditoría exhaustiva de los esquemas Zod de los módulos de Juan
 * (ventas, caja, cuentas, remitos, notas). Verifica que datos inválidos
 * sean rechazados con mensaje claro y que datos válidos pasen.
 *
 * Esto es complementario a los tests E2E ya existentes (cliente con CUIT
 * inválido, cobro mayor al saldo, cierre de caja con diferencia sin motivo,
 * NC mayor al saldo deudor) que verifican las validaciones desde la UI.
 */
import { describe, it, expect } from "vitest"
import { ventaSchema, detalleVentaSchema } from "../ventas"
import { esquemaAperturaCaja, esquemaCierreCaja, esquemaMovimientoCaja } from "../caja"
import { esquemaCuenta } from "../cuentas"
import { esquemaCrearRemito, esquemaAnularRemito } from "../remitos"
import { notaSchema, lineaNotaSchema, esquemaAnularNota } from "../notas"

describe("ventaSchema", () => {
  const lineaValida = { productoId: "p1", unidadId: "u1", cantidad: 5, precioUnitario: 100 }

  it("acepta una venta mínima válida", () => {
    const r = ventaSchema.safeParse({
      clienteId: "c1",
      condicion: "CONTADO",
      descuento: 0,
      detalles: [lineaValida],
    })
    expect(r.success).toBe(true)
  })

  it("rechaza venta sin líneas", () => {
    const r = ventaSchema.safeParse({
      clienteId: "c1", condicion: "CONTADO", descuento: 0, detalles: [],
    })
    expect(r.success).toBe(false)
  })

  it("rechaza venta sin cliente", () => {
    const r = ventaSchema.safeParse({
      clienteId: "", condicion: "CONTADO", descuento: 0, detalles: [lineaValida],
    })
    expect(r.success).toBe(false)
  })

  it("rechaza descuento negativo", () => {
    const r = ventaSchema.safeParse({
      clienteId: "c1", condicion: "CONTADO", descuento: -10, detalles: [lineaValida],
    })
    expect(r.success).toBe(false)
  })

  it("rechaza condición inválida", () => {
    const r = ventaSchema.safeParse({
      clienteId: "c1", condicion: "TARJETA" as never, descuento: 0, detalles: [lineaValida],
    })
    expect(r.success).toBe(false)
  })
})

describe("detalleVentaSchema", () => {
  it("rechaza cantidad ≤ 0", () => {
    expect(detalleVentaSchema.safeParse({
      productoId: "p1", unidadId: "u1", cantidad: 0, precioUnitario: 100,
    }).success).toBe(false)
  })

  it("rechaza precio negativo", () => {
    expect(detalleVentaSchema.safeParse({
      productoId: "p1", unidadId: "u1", cantidad: 1, precioUnitario: -1,
    }).success).toBe(false)
  })

  it("acepta precio = 0 (cortesía/promo)", () => {
    expect(detalleVentaSchema.safeParse({
      productoId: "p1", unidadId: "u1", cantidad: 1, precioUnitario: 0,
    }).success).toBe(true)
  })
})

describe("esquemaAperturaCaja", () => {
  it("acepta saldo inicial = 0", () => {
    expect(esquemaAperturaCaja.safeParse({ saldoInicial: 0 }).success).toBe(true)
  })
  it("rechaza saldo inicial negativo", () => {
    expect(esquemaAperturaCaja.safeParse({ saldoInicial: -100 }).success).toBe(false)
  })
})

describe("esquemaCierreCaja", () => {
  it("acepta arqueo ≥ 0", () => {
    expect(esquemaCierreCaja.safeParse({ saldoArqueo: 0 }).success).toBe(true)
    expect(esquemaCierreCaja.safeParse({ saldoArqueo: 1000 }).success).toBe(true)
  })
  it("rechaza arqueo negativo", () => {
    expect(esquemaCierreCaja.safeParse({ saldoArqueo: -1 }).success).toBe(false)
  })
})

describe("esquemaMovimientoCaja", () => {
  it("rechaza monto ≤ 0", () => {
    expect(esquemaMovimientoCaja.safeParse({
      categoria: "GASTO", monto: 0, descripcion: "x",
    }).success).toBe(false)
  })
  it("rechaza descripción vacía", () => {
    expect(esquemaMovimientoCaja.safeParse({
      categoria: "GASTO", monto: 100, descripcion: "",
    }).success).toBe(false)
  })
  it("acepta movimiento válido con categoría GASTO", () => {
    expect(esquemaMovimientoCaja.safeParse({
      categoria: "GASTO", monto: 100, descripcion: "Pago servicios",
    }).success).toBe(true)
  })
})

describe("esquemaCuenta", () => {
  it("acepta cuenta CORRIENTE válida", () => {
    expect(esquemaCuenta.safeParse({
      nombre: "Cta Cte - Cliente X", tipo: "CORRIENTE", clienteId: "c1",
    }).success).toBe(true)
  })
  it("rechaza nombre muy corto", () => {
    expect(esquemaCuenta.safeParse({
      nombre: "x", tipo: "CONTADO", clienteId: "c1",
    }).success).toBe(false)
  })
  it("rechaza tipo inválido", () => {
    expect(esquemaCuenta.safeParse({
      nombre: "Cta", tipo: "TARJETA" as never, clienteId: "c1",
    }).success).toBe(false)
  })
})

describe("esquemaCrearRemito + esquemaAnularRemito", () => {
  it("acepta remito con venta", () => {
    expect(esquemaCrearRemito.safeParse({ ventaId: "v1" }).success).toBe(true)
  })
  it("rechaza remito sin venta", () => {
    expect(esquemaCrearRemito.safeParse({ ventaId: "" }).success).toBe(false)
  })
  it("anular requiere motivo no vacío", () => {
    expect(esquemaAnularRemito.safeParse({ motivoAnulacion: "" }).success).toBe(false)
    expect(esquemaAnularRemito.safeParse({ motivoAnulacion: "Error de carga" }).success).toBe(true)
  })
  it("anular rechaza motivo demasiado largo", () => {
    expect(esquemaAnularRemito.safeParse({
      motivoAnulacion: "x".repeat(301),
    }).success).toBe(false)
  })
})

describe("notaSchema + lineaNotaSchema", () => {
  const lineaValida = {
    productoId: "p1", unidadId: "u1",
    cantidad: 1, precioUnitario: 100,
    generaMovimientoStock: true,
  }
  it("acepta nota válida", () => {
    expect(notaSchema.safeParse({
      tipo: "CREDITO", letra: "X", ventaOrigenId: "v1",
      motivo: "Devolución de mercadería",
      lineas: [lineaValida],
    }).success).toBe(true)
  })
  it("rechaza nota sin líneas", () => {
    expect(notaSchema.safeParse({
      tipo: "CREDITO", letra: "X", ventaOrigenId: "v1",
      motivo: "Motivo válido", lineas: [],
    }).success).toBe(false)
  })
  it("rechaza motivo muy corto", () => {
    expect(notaSchema.safeParse({
      tipo: "CREDITO", letra: "X", ventaOrigenId: "v1",
      motivo: "X", lineas: [lineaValida],
    }).success).toBe(false)
  })
  it("rechaza tipo inválido", () => {
    expect(notaSchema.safeParse({
      tipo: "AJUSTE" as never, letra: "X", ventaOrigenId: "v1",
      motivo: "x", lineas: [lineaValida],
    }).success).toBe(false)
  })
  it("línea rechaza cantidad ≤ 0", () => {
    expect(lineaNotaSchema.safeParse({
      ...lineaValida, cantidad: 0,
    }).success).toBe(false)
  })
  it("anular nota requiere motivo", () => {
    expect(esquemaAnularNota.safeParse({ motivoAnulacion: "" }).success).toBe(false)
    expect(esquemaAnularNota.safeParse({ motivoAnulacion: "Cliente desistió" }).success).toBe(true)
  })
})

/**
 * Tests unitarios — esquemas Zod del modo offline (Fase 2).
 *
 * La lógica de las server actions de offline.ts se prueba en E2E
 * (F5/F6) porque requiere session+role que rompe el runner unit.
 */
import { describe, it, expect } from "vitest"
import {
  esquemaHeartbeat,
  esquemaReservarRango,
  esquemaSincronizarVenta,
} from "../offline"

describe("esquemaHeartbeat", () => {
  it("acepta heartbeat mínimo", () => {
    expect(
      esquemaHeartbeat.safeParse({ fingerprint: "abc12345" }).success,
    ).toBe(true)
  })
  it("rechaza fingerprint corto", () => {
    expect(esquemaHeartbeat.safeParse({ fingerprint: "abc" }).success).toBe(false)
  })
  it("acepta nombre opcional", () => {
    expect(
      esquemaHeartbeat.safeParse({ fingerprint: "abc12345", nombre: "Test" }).success,
    ).toBe(true)
  })
  it("default estado = ONLINE", () => {
    const r = esquemaHeartbeat.parse({ fingerprint: "abc12345" })
    expect(r.estado).toBe("ONLINE")
  })
  it("rechaza estado inválido", () => {
    expect(
      esquemaHeartbeat.safeParse({ fingerprint: "abc12345", estado: "BUSY" as never }).success,
    ).toBe(false)
  })
})

describe("esquemaReservarRango", () => {
  it("acepta input mínimo con defaults", () => {
    const r = esquemaReservarRango.parse({ fingerprint: "abc12345" })
    expect(r.cantidad).toBe(20)
    expect(r.tipo).toBe("REMITO")
    expect(r.letra).toBe("X")
  })
  it("acepta cantidad customizada", () => {
    const r = esquemaReservarRango.parse({ fingerprint: "abc12345", cantidad: 5 })
    expect(r.cantidad).toBe(5)
  })
  it("rechaza cantidad > 50", () => {
    expect(
      esquemaReservarRango.safeParse({ fingerprint: "abc12345", cantidad: 100 }).success,
    ).toBe(false)
  })
  it("rechaza cantidad < 1", () => {
    expect(
      esquemaReservarRango.safeParse({ fingerprint: "abc12345", cantidad: 0 }).success,
    ).toBe(false)
  })
  it("rechaza cantidad no entera", () => {
    expect(
      esquemaReservarRango.safeParse({ fingerprint: "abc12345", cantidad: 2.5 }).success,
    ).toBe(false)
  })
  it("rechaza tipo inválido", () => {
    expect(
      esquemaReservarRango.safeParse({ fingerprint: "abc12345", tipo: "TICKET" as never }).success,
    ).toBe(false)
  })
})

describe("esquemaSincronizarVenta", () => {
  const lineaValida = {
    productoId: "p1", unidadId: "u1", cantidad: 1, precioUnitario: 100,
  }
  const baseValida = {
    fingerprint:             "abc12345",
    clienteId:               "cli1",
    detalles:                [lineaValida],
    descuento:               0,
    numeroReservadoToken:    "tok-1",
    numeroReservadoFormateado: "0001-00000001",
    clientRequestId:         "550e8400-e29b-41d4-a716-446655440000",
    creadaEnOfflineISO:      "2026-05-21T10:00:00.000Z",
  }

  it("acepta input válido", () => {
    expect(esquemaSincronizarVenta.safeParse(baseValida).success).toBe(true)
  })
  it("rechaza sin líneas", () => {
    expect(
      esquemaSincronizarVenta.safeParse({ ...baseValida, detalles: [] }).success,
    ).toBe(false)
  })
  it("rechaza número con formato inválido", () => {
    expect(
      esquemaSincronizarVenta.safeParse({
        ...baseValida,
        numeroReservadoFormateado: "ABC-XYZ",
      }).success,
    ).toBe(false)
  })
  it("rechaza clientRequestId que no sea UUID", () => {
    expect(
      esquemaSincronizarVenta.safeParse({
        ...baseValida,
        clientRequestId: "not-a-uuid",
      }).success,
    ).toBe(false)
  })
  it("rechaza fecha ISO inválida", () => {
    expect(
      esquemaSincronizarVenta.safeParse({
        ...baseValida,
        creadaEnOfflineISO: "ayer",
      }).success,
    ).toBe(false)
  })
  it("rechaza cantidad ≤ 0 en línea", () => {
    expect(
      esquemaSincronizarVenta.safeParse({
        ...baseValida,
        detalles: [{ ...lineaValida, cantidad: 0 }],
      }).success,
    ).toBe(false)
  })
  it("rechaza descuento negativo", () => {
    expect(
      esquemaSincronizarVenta.safeParse({ ...baseValida, descuento: -1 }).success,
    ).toBe(false)
  })
})

import { describe, it, expect } from "vitest"
import { esquemaCliente } from "@/lib/validaciones/clientes"

describe("esquemaCliente", () => {
  const base = {
    nombreRazonSocial: "Pérez Juan",
    tipoDocumento:     "DNI" as const,
    documento:         "30123456",
    condicionIva:      "CONSUMIDOR_FINAL" as const,
  }

  it("acepta un cliente mínimo válido", () => {
    const r = esquemaCliente.safeParse(base)
    expect(r.success).toBe(true)
  })

  it("rechaza nombre muy corto", () => {
    const r = esquemaCliente.safeParse({ ...base, nombreRazonSocial: "A" })
    expect(r.success).toBe(false)
  })

  it("rechaza documento muy corto", () => {
    const r = esquemaCliente.safeParse({ ...base, documento: "1234" })
    expect(r.success).toBe(false)
  })

  it("rechaza email inválido", () => {
    const r = esquemaCliente.safeParse({ ...base, email: "no-es-email" })
    expect(r.success).toBe(false)
  })

  it("acepta email vacío", () => {
    const r = esquemaCliente.safeParse({ ...base, email: "" })
    expect(r.success).toBe(true)
  })

  it("acepta listaPrecioId opcional", () => {
    const r1 = esquemaCliente.safeParse({ ...base, listaPrecioId: null })
    expect(r1.success).toBe(true)

    const r2 = esquemaCliente.safeParse({ ...base, listaPrecioId: "abc123" })
    expect(r2.success).toBe(true)
  })
})

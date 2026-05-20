/**
 * Tests unitarios del helper de numeración de comprobantes.
 *
 * Corre contra la branch de testing de Neon (la misma que usa Playwright).
 * Las secuencias se borran al inicio de cada test para garantizar aislamiento.
 *
 * Cubrimos:
 *  - Generación secuencial básica
 *  - Contadores independientes por tipo+letra+PV
 *  - **Concurrencia** con Promise.all → 10 tx paralelas devuelven 10 números únicos
 *  - **Rollback** mid-transaction → contador no queda incrementado
 *  - PV nuevo → arranca en 1
 *  - Formato AFIP
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { PrismaClient } from "@prisma/client"
import { config as loadEnv } from "dotenv"
import path from "node:path"
import { generarNumeroComprobante, formatearNumero } from "./numeracion"

loadEnv({ path: path.resolve(__dirname, "../../../.env.test") })

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL! } },
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("generarNumeroComprobante", () => {
  beforeEach(async () => {
    // Aislamiento: borramos solo las secuencias que los tests crean/modifican
    // (PV 1 y PV 99). No tocamos otras secuencias que puedan existir.
    await prisma.secuenciaComprobante.deleteMany({
      where: { puntoVenta: { in: [1, 99] } },
    })
  })

  it("genera el primer número como 1", async () => {
    const r = await prisma.$transaction((tx) =>
      generarNumeroComprobante(tx, { tipo: "REMITO", letra: "X", puntoVenta: 1 }),
    )
    expect(r.valor).toBe(1)
    expect(r.numero).toBe("0001-00000001")
  })

  it("incrementa secuencialmente en llamadas sucesivas", async () => {
    for (let i = 1; i <= 5; i++) {
      const r = await prisma.$transaction((tx) =>
        generarNumeroComprobante(tx, { tipo: "REMITO", letra: "X", puntoVenta: 1 }),
      )
      expect(r.valor).toBe(i)
    }
  })

  it("mantiene contadores independientes por (tipo, letra, PV)", async () => {
    const a1 = await prisma.$transaction((tx) =>
      generarNumeroComprobante(tx, { tipo: "FACTURA", letra: "A", puntoVenta: 1 }),
    )
    const b1 = await prisma.$transaction((tx) =>
      generarNumeroComprobante(tx, { tipo: "FACTURA", letra: "B", puntoVenta: 1 }),
    )
    const a2 = await prisma.$transaction((tx) =>
      generarNumeroComprobante(tx, { tipo: "FACTURA", letra: "A", puntoVenta: 1 }),
    )
    expect(a1.valor).toBe(1)
    expect(b1.valor).toBe(1)
    expect(a2.valor).toBe(2)
  })

  it("concurrencia: 10 tx paralelas devuelven 10 números únicos consecutivos", async () => {
    const promesas = Array.from({ length: 10 }, () =>
      prisma.$transaction((tx) =>
        generarNumeroComprobante(tx, { tipo: "REMITO", letra: "X", puntoVenta: 1 }),
      ),
    )
    const resultados = await Promise.all(promesas)
    const valores = resultados.map((r) => r.valor).sort((a, b) => a - b)
    expect(valores).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    // Y todos los números formateados también son únicos:
    const numerosUnicos = new Set(resultados.map((r) => r.numero))
    expect(numerosUnicos.size).toBe(10)
  })

  it("rollback: si la tx falla DESPUÉS del increment, el contador no queda incrementado", async () => {
    // 1ra tx exitosa → contador = 1
    const primero = await prisma.$transaction((tx) =>
      generarNumeroComprobante(tx, { tipo: "REMITO", letra: "X", puntoVenta: 1 }),
    )
    expect(primero.valor).toBe(1)

    // 2da tx incrementaría a 2 pero throw → rollback
    await expect(
      prisma.$transaction(async (tx) => {
        await generarNumeroComprobante(tx, { tipo: "REMITO", letra: "X", puntoVenta: 1 })
        throw new Error("simulación de error mid-transaction")
      }),
    ).rejects.toThrow("simulación")

    // 3ra tx debe obtener 2 (no 3), confirmando que el rollback restauró el contador
    const tercero = await prisma.$transaction((tx) =>
      generarNumeroComprobante(tx, { tipo: "REMITO", letra: "X", puntoVenta: 1 }),
    )
    expect(tercero.valor).toBe(2)
  })

  it("PV nuevo: primera secuencia arranca en 1", async () => {
    const r = await prisma.$transaction((tx) =>
      generarNumeroComprobante(tx, { tipo: "REMITO", letra: "X", puntoVenta: 99 }),
    )
    expect(r.valor).toBe(1)
    expect(r.numero).toBe("0099-00000001")
  })
})

describe("formatearNumero", () => {
  it("formato AFIP estándar", () => {
    expect(formatearNumero(1, 1)).toBe("0001-00000001")
    expect(formatearNumero(99, 12345678)).toBe("0099-12345678")
    expect(formatearNumero(1, 0)).toBe("0001-00000000")
  })
})

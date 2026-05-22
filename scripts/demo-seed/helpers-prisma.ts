/**
 * Helpers de Prisma — wrappers para Decimal y opciones de transacción.
 */
import { Prisma } from "@prisma/client"

/**
 * Convierte un number a Prisma.Decimal con 2 decimales para montos en pesos.
 * NUNCA pases un number directo a Prisma — siempre usá Decimal para evitar
 * pérdida de precisión en montos.
 */
export function dec(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2))
}

/**
 * Variante para cantidades de stock (3 decimales, ej: 0.125 kg).
 */
export function decQty(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(3))
}

/**
 * Opciones standard para $transaction grandes. Default de Prisma es 5s lo cual
 * es muy poco para batch inserts. Subimos a 60s con maxWait 30s.
 */
export const TX_OPCIONES_GRANDES = {
  maxWait: 30_000,
  timeout: 120_000,
} as const

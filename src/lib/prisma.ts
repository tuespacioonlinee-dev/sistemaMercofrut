import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Cliente Prisma singleton.
 *
 * En desarrollo se reusa la instancia globalmente para evitar fugas de conexión
 * al hacer hot-reload. En producción (Vercel serverless) cada lambda invocación
 * crea su propio client; el pooler de Neon mitiga las conexiones concurrentes
 * y `connection_limit` debe estar seteado en DATABASE_URL.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/**
 * Helper para envolver transacciones con timeouts más generosos.
 *
 * Default Prisma: maxWait 2s, timeout 5s. Para operaciones grandes (venta de 30 ítems
 * + cold start de Neon) son insuficientes. Subimos a maxWait 10s, timeout 20s.
 *
 * Uso: await runTx(async (tx) => { ... })
 */
export function runTx<T>(fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>) {
  return prisma.$transaction(fn, { maxWait: 10_000, timeout: 20_000 })
}

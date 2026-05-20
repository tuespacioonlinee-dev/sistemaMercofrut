/**
 * Cliente Prisma dedicado para tests + utilidad de reset.
 *
 * IMPORTANTE: Este módulo SOLO debe usarse dentro de `tests/`. No importar
 * desde código de aplicación. Apunta exclusivamente a TEST_DATABASE_URL.
 */
import { PrismaClient } from "@prisma/client"
import { config as loadEnv } from "dotenv"
import path from "node:path"
import { assertNotProductionDb } from "./guard"

loadEnv({ path: path.resolve(__dirname, "../../.env.test") })

const url = process.env.TEST_DATABASE_URL
if (!url) {
  throw new Error("Falta TEST_DATABASE_URL en .env.test")
}

// Guard contra apuntar a un host de producción (ver helpers/guard.ts).
assertNotProductionDb(url)

export const prismaTest = new PrismaClient({
  datasources: { db: { url } },
})

/**
 * Trunca TODAS las tablas transaccionales en orden inverso de FKs.
 * Mantiene `Usuario`, `Categoria`, `UnidadMedida`, `ProductoUnidad`, `ParametrosComprobante`,
 * `ParametrosNegocio` — esos los siembra `seedBase()` una vez al inicio.
 *
 * Resetea las secuencias autoincrementales (CajaDiaria.numero, Venta.numero).
 */
export async function resetTransactional() {
  // Orden: hijos → padres. Postgres TRUNCATE CASCADE simplifica pero queremos control.
  await prismaTest.$executeRawUnsafe(`
    TRUNCATE TABLE
      "MovimientoCaja",
      "MovimientoCuenta",
      "MovimientoStock",
      "DetalleVenta",
      "DetalleCompra",
      "Factura",
      "Remito",
      "Venta",
      "Compra",
      "LoteProducto",
      "Cuenta",
      "Cliente",
      "Proveedor",
      "Producto",
      "CajaDiaria"
    RESTART IDENTITY CASCADE
  `)
}

/**
 * Cierra la conexión. Llamar en globalTeardown si lo agregamos.
 */
export async function disconnectTest() {
  await prismaTest.$disconnect()
}

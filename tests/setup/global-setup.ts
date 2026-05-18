/**
 * globalSetup de Playwright.
 *
 * Corre UNA VEZ antes de toda la suite. Responsabilidades:
 * 1. Verificar que TEST_DATABASE_URL apunta a una branch de testing (no producción).
 * 2. Aplicar migraciones (`prisma migrate deploy`) contra esa branch.
 * 3. Sembrar datos base (usuario admin, categoría/unidad por defecto, params).
 *
 * Cada test individual hace su propio truncate + seed específico en beforeEach.
 */
import { execSync } from "node:child_process"
import path from "node:path"
import { config as loadEnv } from "dotenv"
import { assertNotProductionDb } from "../helpers/guard"
import { seedBase } from "../helpers/seed"

loadEnv({ path: path.resolve(__dirname, "../../.env.test") })

async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error("Falta TEST_DATABASE_URL en .env.test")

  // Guard contra apuntar a un host de producción (ver helpers/guard.ts).
  assertNotProductionDb(url)

  console.log("[global-setup] Aplicando migraciones a la branch de testing…")
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  })

  await seedBase()
  console.log("[global-setup] ✅ Base lista (admin + catálogo mínimo).")
}

export default globalSetup

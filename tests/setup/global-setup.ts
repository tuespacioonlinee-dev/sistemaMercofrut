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
import fs from "node:fs"
import { config as loadEnv } from "dotenv"
import { assertNotProductionDb } from "../helpers/guard"
import { prismaTest } from "../helpers/db"
import { seedBase } from "../helpers/seed"

loadEnv({ path: path.resolve(__dirname, "../../.env.test") })

async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error("Falta TEST_DATABASE_URL en .env.test")

  // Guard contra apuntar a un host de producción (ver helpers/guard.ts).
  assertNotProductionDb(url)

  // Warm-up: Neon suspende las branches inactivas. Una query liviana acá
  // despierta el compute antes de cualquier comando de Prisma.
  console.log("[global-setup] Warm-up de la branch de testing…")
  const tWarmStart = Date.now()
  for (let intento = 1; intento <= 3; intento++) {
    try {
      await prismaTest.$queryRaw`SELECT 1`
      break
    } catch (e) {
      if (intento === 3) throw e
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  console.log(`[global-setup] ✓ Branch despierta en ${Date.now() - tWarmStart}ms`)

  // Comparamos migraciones del filesystem vs la tabla _prisma_migrations.
  // Si están sincronizadas, evitamos `migrate deploy` (que toma un advisory
  // lock con timeout fijo de 10s — frágil contra Neon recién despertada).
  const migrationsDir = path.resolve(__dirname, "../../prisma/migrations")
  const dirEntries = fs.readdirSync(migrationsDir, { withFileTypes: true })
  const migracionesEnFs = dirEntries
    .filter((e) => e.isDirectory() && /^\d/.test(e.name))
    .map((e) => e.name)
    .sort()

  let migracionesEnDb: string[] = []
  try {
    const rows = await prismaTest.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
      ORDER BY migration_name
    `
    migracionesEnDb = rows.map((r) => r.migration_name)
  } catch {
    // La tabla todavía no existe → primera vez, hay que correr deploy.
  }

  const sincronizado =
    migracionesEnFs.length === migracionesEnDb.length &&
    migracionesEnFs.every((m, i) => m === migracionesEnDb[i])

  if (sincronizado) {
    console.log(`[global-setup] ✓ ${migracionesEnFs.length} migraciones ya sincronizadas — skip migrate deploy.`)
  } else {
    // Prisma migrate NO soporta el pooler de Neon (no acepta SET commands).
    // Usamos el endpoint direct (sin "-pooler").
    const directUrl = url.replace(/-pooler(\.[^/]+)/, "$1")
    console.log(`[global-setup] Faltan migraciones (${migracionesEnDb.length}/${migracionesEnFs.length}). Aplicando…`)
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: directUrl, DIRECT_URL: directUrl },
    })
  }

  await seedBase()
  console.log("[global-setup] ✅ Base lista (admin + catálogo mínimo).")
}

export default globalSetup

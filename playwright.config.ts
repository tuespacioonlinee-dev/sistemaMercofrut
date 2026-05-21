// playwright.config.ts
// Config unificado que corre AMBAS suites:
//   1. tests/e2e/*.spec.ts — suite mía (storageState con login pre-hecho).
//   2. e2e/*.spec.ts       — suite de Tomás (login inline en cada test).
//
// Ambas apuntan a la branch de testing de Neon vía TEST_DATABASE_URL,
// evitando tocar la base de producción.
import { defineConfig, devices } from "@playwright/test"
import { config as loadEnv } from "dotenv"
import path from "node:path"

// Cargar .env.test (NO commiteado) y exponer DATABASE_URL al test runner para
// que los `new PrismaClient()` en seeds de los tests usen la branch de testing.
loadEnv({ path: path.resolve(__dirname, ".env.test") })

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "Falta TEST_DATABASE_URL en .env.test. Copiá .env.test.example y completá la URL de la Neon branch de testing.",
  )
}

// Exponer DATABASE_URL al runner — los seeds que hacen `new PrismaClient()`
// sin pasar `datasources` toman la URL de aquí, garantizando que apuntan a
// la branch de testing (NUNCA a producción).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.DIRECT_URL   = process.env.TEST_DATABASE_URL

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  // No declaramos `testDir` global — cada proyecto define el suyo.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  globalSetup: require.resolve("./tests/setup/global-setup.ts"),

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // 1. Setup project — login UI del admin y guarda storageState.
    //    Necesario para la suite mía. La suite de Tomás no lo usa.
    {
      name: "setup",
      testDir: "./tests/setup",
      testMatch: /auth\.setup\.ts/,
    },
    // 2. Suite "tomas" — corre los specs de Tomás en ./e2e con login inline.
    //    No depende del setup (cada test loguea por su cuenta).
    {
      name: "tomas",
      testDir: "./e2e",
      testMatch: /.*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        // Sin storageState — el seed crea un usuario test-e2e@mercofrut.com
        // y los tests loguean explícitamente.
      },
    },
    // 3. Suite "juan" — todos los specs míos en ./tests/e2e usando storageState
    //    del proyecto setup (login pre-hecho del admin@test.local).
    {
      name: "juan",
      testDir: "./tests/e2e",
      testMatch: /.*\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    // Usamos --webpack porque turbopack tiene problemas con OneDrive sync
    // (cache persistente bloqueado).
    command: "npx next dev --webpack",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // El server de Next.js apunta a la branch de testing (NUNCA a prod).
      DATABASE_URL: process.env.TEST_DATABASE_URL!,
      DIRECT_URL:   process.env.TEST_DATABASE_URL!,
      AUTH_SECRET:  process.env.AUTH_SECRET ?? "test-secret-cambiar",
    },
  },
})

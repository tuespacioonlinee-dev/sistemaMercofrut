import { defineConfig, devices } from "@playwright/test"
import { config as loadEnv } from "dotenv"
import path from "node:path"

// Cargar variables de entorno desde .env.test (NO commiteado).
loadEnv({ path: path.resolve(__dirname, ".env.test") })

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "Falta TEST_DATABASE_URL en .env.test. Copiá .env.test.example y completá la URL de la Neon branch de testing.",
  )
}

// El servidor dev de Next.js durante los tests usa TEST_DATABASE_URL como DATABASE_URL real.
// Esto se inyecta vía webServer.env más abajo — no se sobrescribe el .env.local de desarrollo.

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./tests/e2e",

  // Cada test debe poder correr aislado.
  fullyParallel: false, // serial: comparten la misma base, evitamos colisiones en reset/seed.
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],

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
    // Proyecto de setup que hace login UI y guarda storageState. Corre primero.
    {
      name: "setup",
      testDir: "./tests/setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Proyecto principal: todos los .spec.ts heredan el storageState del setup.
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    // Usamos webpack (no turbopack) porque el cache persistente de turbopack
    // tiene problemas con OneDrive sync en la carpeta del proyecto.
    command: "npx next dev --webpack",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // El server de Next.js apunta a la branch de testing.
      // Estas variables se MERGEAN al process.env del subproceso y tienen
      // prioridad sobre lo que cargue Next.js de .env.local.
      DATABASE_URL: process.env.TEST_DATABASE_URL!,
      DIRECT_URL:   process.env.TEST_DATABASE_URL!,
      AUTH_SECRET:  process.env.AUTH_SECRET ?? "test-secret-cambiar",
      // No seteamos NODE_ENV: "next dev" requiere "development".
    },
  },
})

import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Excluimos los tests que necesitan DB real (mejor correrlos aparte
    // contra una DB de prueba con setup explícito).
    exclude: ["src/**/*.e2e.{test,spec}.{ts,tsx}", "node_modules", ".next"],
    globals: true,
  },
})

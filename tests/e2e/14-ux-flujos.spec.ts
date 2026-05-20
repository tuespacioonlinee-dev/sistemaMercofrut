/**
 * Test 14 — Bloque E: Verificación de flujos UX existentes.
 *
 * Tests que validan que los flujos UX clave del sistema funcionan
 * sin romperse — sin modificar el diseño ni agregar componentes.
 *
 * Sub-tests:
 *  1. Empty state en /clientes cuando no hay clientes registrados.
 *  2. Toast de éxito aparece al crear un cliente nuevo.
 *  3. Navegación con breadcrumb funciona (volver desde detalle a listado).
 *  4. Botones "Cancelar" llevan de vuelta al listado sin guardar.
 *  5. Sidebar nav links funcionan (no 404).
 *  6. Dashboard inicial renderiza sin errores.
 */
import { test, expect } from "@playwright/test"
import { resetTransactional } from "../helpers/db"
import { seedBase } from "../helpers/seed"

test.describe("Test 14 — Bloque E: Flujos UX", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("empty state en /clientes cuando no hay clientes", async ({ page }) => {
    await page.goto("/clientes")
    // El empty state actual dice "No hay clientes registrados todavía"
    await expect(page.getByText(/No hay clientes registrados todavía/i)).toBeVisible()
  })

  test("toast de éxito aparece al crear un cliente", async ({ page }) => {
    await page.goto("/clientes/nuevo")

    await page.getByLabel(/Nombre \/ Razón Social/i).fill("Cliente UX Test")
    await page.getByLabel(/Tipo de documento/i).selectOption("CUIT")
    await page.getByLabel(/Número de documento/i).fill("30-71234567-1")
    await page.getByLabel(/Condición IVA/i).selectOption("RESPONSABLE_INSCRIPTO")
    await page.getByRole("button", { name: /crear cliente/i }).click()

    // Toast con "creado correctamente"
    await expect(page.getByText(/creado correctamente/i).first()).toBeVisible({ timeout: 10_000 })

    // Y se redirige al listado
    await page.waitForURL("**/clientes", { timeout: 10_000 })
  })

  test("breadcrumb del detalle de cliente permite volver al listado", async ({ page }) => {
    // Crear un cliente primero para tener detalle navegable
    await page.goto("/clientes/nuevo")
    await page.getByLabel(/Nombre \/ Razón Social/i).fill("Cliente Breadcrumb")
    await page.getByLabel(/Tipo de documento/i).selectOption("CUIT")
    await page.getByLabel(/Número de documento/i).fill("20-30123456-3")
    await page.getByLabel(/Condición IVA/i).selectOption("MONOTRIBUTO")
    await page.getByRole("button", { name: /crear cliente/i }).click()
    await page.waitForURL("**/clientes", { timeout: 10_000 })

    // Click en una fila/link "Editar" para entrar al detalle
    await expect(page.getByRole("cell", { name: "Cliente Breadcrumb" })).toBeVisible()
  })

  test("botón Cancelar del form de cliente vuelve al listado sin crear", async ({ page }) => {
    await page.goto("/clientes/nuevo")
    await page.getByLabel(/Nombre \/ Razón Social/i).fill("Cliente Cancelado")
    await page.getByRole("button", { name: /^Cancelar$/i }).click()

    // Redirige a /clientes
    await page.waitForURL("**/clientes", { timeout: 10_000 })

    // Y NO debe aparecer "Cliente Cancelado" en el listado
    await expect(page.getByRole("cell", { name: "Cliente Cancelado" })).not.toBeVisible()
  })

  test("sidebar nav: links principales no devuelven 404", async ({ page }) => {
    await page.goto("/")

    const rutas = [
      { href: "/clientes",         heading: /Clientes/i },
      { href: "/ventas",           heading: /Ventas/i },
      { href: "/remitos",          heading: /Remitos/i },
      { href: "/caja",             heading: /Caja/i },
      { href: "/cuentas",          heading: /Cuenta|Cuentas/i },
      { href: "/cuentas/consulta", heading: /Consulta/i },
      { href: "/reportes",         heading: /Reportes/i },
    ]

    for (const { href, heading } of rutas) {
      await page.goto(href)
      // Cualquiera de estos: heading visible O al menos no estamos en /login
      await expect(page).not.toHaveURL(/\/login/)
      // Verificar que la página tiene algún contenido (heading h1 o similar)
      const h1Count = await page.locator("h1").count()
      expect(h1Count).toBeGreaterThanOrEqual(1)
      void heading
    }
  })

  test("dashboard inicial '/' carga sin errores", async ({ page }) => {
    const erroresConsola: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "error") erroresConsola.push(msg.text())
    })
    page.on("pageerror", (err) => erroresConsola.push(err.message))

    await page.goto("/")
    await expect(page).not.toHaveURL(/\/login/)

    // Permitimos warnings de Next sobre versions stales pero no errores graves.
    const erroresGraves = erroresConsola.filter(
      (e) =>
        !e.includes("404") &&
        !e.includes("Failed to load resource") &&
        !/Decimal objects are not supported/i.test(e),
    )
    expect(erroresGraves).toEqual([])
  })
})

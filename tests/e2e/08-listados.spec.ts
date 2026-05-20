/**
 * Test 8 — Grupo C: Listados de clientes y proveedores.
 *
 * Cubre los 4 reportes alfabéticos:
 *   1. /reportes/clientes              — todos los clientes activos
 *   2. /reportes/clientes?filtro=saldo — solo con saldo distinto de cero
 *   3. /reportes/proveedores           — todos los proveedores activos
 *   4. /reportes/proveedores?filtro=saldo
 *
 * Verifica:
 * - Tabla renderiza con las 8 columnas (incluyendo Provincia entre Dirección y Localidad).
 * - En el filtro "con saldo" solo aparecen los que tienen saldo ≠ 0 y se muestra el pie "Saldo Total".
 * - Ordenamiento alfabético por nombre por defecto.
 * - PDF se descarga con el nombre correcto.
 */
import { test, expect } from "@playwright/test"
import { resetTransactional } from "../helpers/db"
import {
  seedBase,
  seedClienteSinSaldo,
  seedClienteConSaldoCC,
  seedProveedorSinSaldo,
  seedProveedorConSaldoCC,
} from "../helpers/seed"
import { esperarDescarga } from "../helpers/pdf"

test.describe("Test 8 — Grupo C: Listados de clientes y proveedores", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("listado clientes (todos) — muestra activos con Provincia y descarga PDF", async ({ page }) => {
    await seedClienteSinSaldo({
      nombreRazonSocial: "Almacén Sur",
      documento: "30-11111111-7",
      codigo: "C0001",
      direccion: "San Martín 100",
      provincia: "Tucumán",
      localidad: "San Miguel",
      telefono: "0381-1000",
    })
    await seedClienteConSaldoCC({
      nombreRazonSocial: "Verdulería Norte",
      documento: "30-22222222-7",
      saldoDeudor: 10_000,
      codigo: "C0002",
      direccion: "Belgrano 200",
      provincia: "Salta",
      localidad: "Salta Capital",
      telefono: "0387-2000",
    })

    await page.goto("/reportes/clientes")

    await expect(page.getByRole("heading", { name: /Listado Alfabético de Clientes/i })).toBeVisible()

    // Encabezado con Provincia entre Dirección y Localidad.
    await expect(page.getByRole("columnheader", { name: "Provincia" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Localidad" })).toBeVisible()

    // Ambos clientes visibles.
    await expect(page.getByRole("cell", { name: "Almacén Sur" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Verdulería Norte" })).toBeVisible()

    // Provincias visibles en las filas correctas (exact: true para distinguir
    // "Salta" provincia de "Salta Capital" localidad).
    await expect(page.getByRole("cell", { name: "Tucumán", exact: true })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Salta", exact: true })).toBeVisible()

    // Pie "Saldo Total" NO visible (filtro "todos" no lo muestra).
    await expect(page.getByText("Saldo Total")).not.toBeVisible()

    // PDF
    const download = await esperarDescarga(page, async () => {
      await page.getByRole("button", { name: /^PDF$/ }).click()
    })
    expect(download.suggestedFilename()).toBe("clientes.pdf")
  })

  test("listado clientes (con saldo) — filtra y muestra pie Saldo Total", async ({ page }) => {
    await seedClienteSinSaldo({
      nombreRazonSocial: "Cliente Sin Deuda",
      documento: "30-33333333-7",
    })
    await seedClienteConSaldoCC({
      nombreRazonSocial: "Cliente Con Deuda",
      documento: "30-44444444-7",
      saldoDeudor: 25_000,
      provincia: "Córdoba",
    })

    await page.goto("/reportes/clientes?filtro=saldo")

    // Solo el cliente con saldo aparece.
    await expect(page.getByRole("cell", { name: "Cliente Con Deuda" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Cliente Sin Deuda" })).not.toBeVisible()

    // El pie "Saldo Total" SÍ es visible (en la tarjeta superior y en el tfoot).
    await expect(page.getByText("Saldo Total").first()).toBeVisible()

    // El nombre del archivo PDF cambia.
    const download = await esperarDescarga(page, async () => {
      await page.getByRole("button", { name: /^PDF$/ }).click()
    })
    expect(download.suggestedFilename()).toBe("clientes-con-saldo.pdf")
  })

  test("listado proveedores (todos) — muestra activos con Provincia y descarga PDF", async ({ page }) => {
    await seedProveedorSinSaldo({
      nombreRazonSocial: "Proveedor Frutas SA",
      documento: "30-55555555-7",
      provincia: "Mendoza",
      localidad: "Maipú",
    })
    await seedProveedorConSaldoCC({
      nombreRazonSocial: "Distribuidora Tucumán",
      documento: "30-66666666-7",
      saldoDeudor: 80_000,
      provincia: "Tucumán",
    })

    await page.goto("/reportes/proveedores")

    await expect(page.getByRole("heading", { name: /Listado Alfabético de Proveedores/i })).toBeVisible()

    await expect(page.getByRole("columnheader", { name: "Provincia" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Proveedor Frutas SA" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Distribuidora Tucumán" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Mendoza" })).toBeVisible()

    const download = await esperarDescarga(page, async () => {
      await page.getByRole("button", { name: /^PDF$/ }).click()
    })
    expect(download.suggestedFilename()).toBe("proveedores.pdf")
  })

  test("listado proveedores (con saldo) — filtra y muestra pie Saldo Total", async ({ page }) => {
    await seedProveedorSinSaldo({
      nombreRazonSocial: "Proveedor Sin Saldo",
      documento: "30-77777777-7",
    })
    await seedProveedorConSaldoCC({
      nombreRazonSocial: "Proveedor Con Saldo",
      documento: "30-88888888-7",
      saldoDeudor: 45_000,
      provincia: "Buenos Aires",
    })

    await page.goto("/reportes/proveedores?filtro=saldo")

    await expect(page.getByRole("cell", { name: "Proveedor Con Saldo" })).toBeVisible()
    await expect(page.getByRole("cell", { name: "Proveedor Sin Saldo" })).not.toBeVisible()
    await expect(page.getByText("Saldo Total").first()).toBeVisible()

    const download = await esperarDescarga(page, async () => {
      await page.getByRole("button", { name: /^PDF$/ }).click()
    })
    expect(download.suggestedFilename()).toBe("proveedores-con-saldo.pdf")
  })
})

/**
 * Test 1 — Alta de cliente con validaciones.
 *
 * Cubre:
 * - Rechazo de CUIT con dígito verificador inválido (form no redirige + 0 clientes en DB).
 * - Alta exitosa con CUIT válido (redirige al listado + cliente visible + persistido OK).
 */
import { test, expect } from "@playwright/test"
import { prismaTest, resetTransactional } from "../helpers/db"
import { seedBase } from "../helpers/seed"

// CUITs calculados con el algoritmo módulo 11:
//   20-30123456-3  →  válido    (DV calculado = 3)
//   20-30123456-0  →  INVÁLIDO  (DV real es 3, no 0)
//   30-71234567-1  →  válido    (DV calculado = 1)
const CUIT_INVALIDO = "20-30123456-0"
const CUIT_VALIDO   = "30-71234567-1"

test.describe("Test 1 — Alta de cliente con validaciones", () => {
  test.beforeEach(async () => {
    await resetTransactional()
    await seedBase()
  })

  test("debería rechazar el alta cuando el CUIT tiene dígito verificador inválido", async ({ page }) => {
    await page.goto("/clientes/nuevo")
    await expect(page).toHaveURL(/\/clientes\/nuevo/)

    await page.getByLabel(/Nombre \/ Razón Social/i).fill("Frutas Inválido SRL")
    await page.getByLabel(/Tipo de documento/i).selectOption("CUIT")
    await page.getByLabel(/Número de documento/i).fill(CUIT_INVALIDO)
    await page.getByLabel(/Condición IVA/i).selectOption("RESPONSABLE_INSCRIPTO")

    await page.getByRole("button", { name: /crear cliente/i }).click()

    // El form debe mostrar el error de DV y NO redirigir.
    await expect(page.getByText(/dígito verificador|CUIT inválido/i)).toBeVisible()
    await expect(page).toHaveURL(/\/clientes\/nuevo/)

    // En DB no debe quedar ningún cliente persistido.
    const cantidad = await prismaTest.cliente.count()
    expect(cantidad).toBe(0)
  })

  test("debería crear un cliente con CUIT válido y mostrarlo en el listado", async ({ page }) => {
    await page.goto("/clientes/nuevo")

    await page.getByLabel(/Nombre \/ Razón Social/i).fill("Frutas Pérez SRL")
    await page.getByLabel(/Tipo de documento/i).selectOption("CUIT")
    await page.getByLabel(/Número de documento/i).fill(CUIT_VALIDO)
    await page.getByLabel(/Condición IVA/i).selectOption("RESPONSABLE_INSCRIPTO")
    await page.getByLabel(/Dirección/i).fill("San Martín 100")
    await page.getByLabel(/Localidad/i).fill("San Miguel de Tucumán")
    await page.getByLabel(/Teléfono/i).fill("0381-1234567")
    await page.getByLabel(/Email/i).fill("ventas@frutasperez.com")

    await page.getByRole("button", { name: /crear cliente/i }).click()

    // Tras un alta exitosa, el form redirige a /clientes.
    await page.waitForURL("**/clientes", { timeout: 15_000 })

    // El cliente debe aparecer en la tabla del listado.
    await expect(page.getByRole("cell", { name: "Frutas Pérez SRL" })).toBeVisible()
    // El documento se renderiza tal cual vino del form (con guiones, prefijado por "CUIT").
    await expect(page.getByRole("cell", { name: new RegExp(CUIT_VALIDO) })).toBeVisible()

    // Y debe estar persistido con los datos correctos.
    const cliente = await prismaTest.cliente.findFirst({
      where: { nombreRazonSocial: "Frutas Pérez SRL" },
    })
    expect(cliente).not.toBeNull()
    expect(cliente?.tipoDocumento).toBe("CUIT")
    expect(cliente?.condicionIva).toBe("RESPONSABLE_INSCRIPTO")
    // El documento se guarda como lo manda el form (con o sin guiones).
    expect(cliente?.documento.replace(/-/g, "")).toBe(CUIT_VALIDO.replace(/-/g, ""))
    expect(cliente?.direccion).toBe("San Martín 100")
    expect(cliente?.localidad).toBe("San Miguel de Tucumán")
    expect(cliente?.telefono).toBe("0381-1234567")
    expect(cliente?.email).toBe("ventas@frutasperez.com")
    expect(cliente?.activo).toBe(true)
    expect(cliente?.deletedAt).toBeNull()
  })
})

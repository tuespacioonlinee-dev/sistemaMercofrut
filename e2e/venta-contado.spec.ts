import { test, expect } from "@playwright/test";
import { seed, cleanup, disconnect, TEST_USER, TEST_PRODUCT, TEST_CLIENTE_CONTADO } from "./helpers/seed";
import { login } from "./helpers/auth";

test.beforeAll(async () => {
  await seed();
});

test.afterAll(async () => {
  await cleanup();
  await disconnect();
});

test.beforeEach(async ({ page }) => {
  await login(page, TEST_USER.email, TEST_USER.password);
});

test("crear venta contado y verificar en listado", async ({ page }) => {
  // Abrir caja si no está abierta
  await page.goto("/caja");
  const noCaja = page.getByText("No hay caja abierta");
  if (await noCaja.isVisible().catch(() => false)) {
    await page.locator("#saldoInicial").fill("0");
    await page.getByRole("button", { name: "Abrir caja" }).click();
    await expect(noCaja).not.toBeVisible({ timeout: 10_000 });
  }

  // Ir a nueva venta
  await page.goto("/ventas/nueva");

  // Seleccionar cliente contado
  await page.locator("select#clienteId").selectOption({ label: new RegExp(TEST_CLIENTE_CONTADO.nombreRazonSocial) });

  // Condición: Contado
  await page.locator("select#condicion").selectOption("CONTADO");

  // Agregar producto — click en botón "+"
  await page.getByRole("button", { name: /agregar/i }).first().click();

  // Seleccionar producto en la primera línea
  const firstRow = page.locator("[data-testid='detalle-row']").first().or(page.locator("select").nth(2));
  await firstRow.selectOption({ label: new RegExp(TEST_PRODUCT.nombre) });

  // Llenar cantidad
  await page.locator("input[type='number'][step='0.001']").first().fill("2");

  // Esperar que el total se calcule
  await page.waitForTimeout(500);

  // Confirmar venta
  await page.getByRole("button", { name: "Confirmar venta" }).click();

  // Esperar redirect al listado de ventas
  await expect(page).toHaveURL(/\/ventas/, { timeout: 10_000 });

  // Verificar que la venta aparece en el listado
  await expect(page.getByText(TEST_CLIENTE_CONTADO.nombreRazonSocial)).toBeVisible();
});

test("verificar que el stock bajó después de la venta", async ({ page }) => {
  await page.goto("/stock");

  // Buscar el producto test
  await page.locator("input").first().fill(TEST_PRODUCT.nombre);
  await page.waitForTimeout(500);

  // El stock debería ser 98 (100 - 2 vendidas en el test anterior)
  const row = page.locator("tr", { hasText: TEST_PRODUCT.nombre });
  await expect(row).toBeVisible();
  await expect(row.getByText("98")).toBeVisible();
});

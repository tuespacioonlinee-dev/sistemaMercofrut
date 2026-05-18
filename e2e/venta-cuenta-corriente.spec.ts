import { test, expect } from "@playwright/test";
import { seed, cleanup, disconnect, TEST_USER, TEST_PRODUCT, TEST_CLIENTE_CC } from "./helpers/seed";
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

test("crear venta cuenta corriente y verificar saldo", async ({ page }) => {
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

  // Seleccionar cliente CC
  await page.locator("select#clienteId").selectOption({ label: new RegExp(TEST_CLIENTE_CC.nombreRazonSocial) });

  // Condición: Cuenta Corriente
  await page.locator("select#condicion").selectOption("CUENTA_CORRIENTE");

  // Agregar producto
  await page.getByRole("button", { name: /agregar/i }).first().click();

  // Seleccionar producto
  const productSelect = page.locator("select").nth(2);
  await productSelect.selectOption({ label: new RegExp(TEST_PRODUCT.nombre) });

  // Cantidad: 3
  await page.locator("input[type='number'][step='0.001']").first().fill("3");

  await page.waitForTimeout(500);

  // Confirmar venta
  await page.getByRole("button", { name: "Confirmar venta" }).click();

  await expect(page).toHaveURL(/\/ventas/, { timeout: 10_000 });
});

test("verificar que el saldo CC del cliente aumentó", async ({ page }) => {
  await page.goto("/cuentas/consulta");

  // Buscar cliente CC
  await page.locator("input").first().fill(TEST_CLIENTE_CC.nombreRazonSocial);
  await page.waitForTimeout(1000);

  // Click en el resultado
  await page.getByText(TEST_CLIENTE_CC.nombreRazonSocial).first().click();

  // Verificar que hay saldo (el total de 3 x 1500 = 4500)
  await expect(page.getByText("4.500")).toBeVisible({ timeout: 5_000 });
});

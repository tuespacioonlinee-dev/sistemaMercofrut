// e2e/cobro.spec.ts
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

test("crear deuda y cobrar parcialmente", async ({ page }) => {
  // Primero: abrir caja
  await page.goto("/caja");
  const noCaja = page.getByText("No hay caja abierta");
  if (await noCaja.isVisible().catch(() => false)) {
    await page.locator("#saldoInicial").fill("0");
    await page.getByRole("button", { name: "Abrir caja" }).click();
    await expect(noCaja).not.toBeVisible({ timeout: 10_000 });
  }

  // Crear venta CC para generar deuda
  await page.goto("/ventas/nueva");
  await page.locator("select#clienteId").selectOption({ label: `${TEST_CLIENTE_CC.nombreRazonSocial} — ${TEST_CLIENTE_CC.documento}` });
  await page.locator("select#condicion").selectOption("CUENTA_CORRIENTE");
  // Seleccionar producto en la línea existente (el form ya viene con 1 fila)
  await page.locator("select").nth(2).selectOption({ label: TEST_PRODUCT.nombre });
  await page.locator("input[type='number'][step='0.001']").first().fill("2");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Confirmar venta" }).click();
  // Esperar que salga de /ventas/nueva
  await page.waitForURL((url) => !url.pathname.includes("/nueva"), { timeout: 15_000 });

  // Ir a cobros
  await page.goto("/cobros/nuevo");

  // Buscar cliente
  await page.locator("input").first().fill(TEST_CLIENTE_CC.nombreRazonSocial);
  await page.waitForTimeout(1000);

  // Click en resultado
  await page.getByText(TEST_CLIENTE_CC.nombreRazonSocial).first().click();
  await page.waitForTimeout(500);

  // Cobrar parcialmente (la deuda es 3000, cobramos 1000)
  await page.locator("#monto").fill("1000");
  await page.locator("#concepto").fill("Cobro parcial E2E");

  // Registrar cobro
  await page.getByRole("button", { name: "Registrar cobro" }).click();

  // Esperar confirmación (la página puede redirigir o mostrar success)
  await page.waitForTimeout(2000);
});

test("verificar que el saldo bajó después del cobro", async ({ page }) => {
  await page.goto("/cuentas/consulta");

  // Buscar cliente CC
  await page.getByPlaceholder(/nombre|buscar|cuit/i).fill(TEST_CLIENTE_CC.nombreRazonSocial);

  // Esperar a que aparezcan los resultados de búsqueda
  const resultado = page.locator("button", { hasText: TEST_CLIENTE_CC.nombreRazonSocial });
  await expect(resultado.first()).toBeVisible({ timeout: 5_000 });
  await resultado.first().click();

  // Esperar a que carguen los datos de la cuenta
  await page.waitForTimeout(1000);

  // Saldo debería ser 2000 (3000 de deuda - 1000 cobrado), formateado como "$ 2.000,00"
  await expect(page.getByText("2.000").first()).toBeVisible({ timeout: 10_000 });
});

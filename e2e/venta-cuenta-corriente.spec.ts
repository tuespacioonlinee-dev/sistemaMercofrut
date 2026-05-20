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

  // Seleccionar cliente CC (label exacto: "nombre — documento")
  await page.locator("select#clienteId").selectOption({ label: `${TEST_CLIENTE_CC.nombreRazonSocial} — ${TEST_CLIENTE_CC.documento}` });

  // Condición: Cuenta Corriente
  await page.locator("select#condicion").selectOption("CUENTA_CORRIENTE");

  // Seleccionar producto en la línea existente (el form ya viene con 1 fila)
  await page.locator("select").nth(2).selectOption({ label: TEST_PRODUCT.nombre });

  // Cantidad: 3
  await page.locator("input[type='number'][step='0.001']").first().fill("3");

  await page.waitForTimeout(500);

  // Confirmar venta
  await page.getByRole("button", { name: "Confirmar venta" }).click();

  // Esperar que salga de /ventas/nueva
  await page.waitForURL((url) => !url.pathname.includes("/nueva"), { timeout: 15_000 });
});

test("verificar que el saldo CC del cliente aumentó", async ({ page }) => {
  await page.goto("/cuentas/consulta");

  // Buscar cliente CC
  await page.getByPlaceholder(/nombre|buscar|cuit/i).fill(TEST_CLIENTE_CC.nombreRazonSocial);

  // Esperar a que aparezcan los resultados de búsqueda
  const resultado = page.locator("button", { hasText: TEST_CLIENTE_CC.nombreRazonSocial });
  await expect(resultado.first()).toBeVisible({ timeout: 5_000 });
  await resultado.first().click();

  // Esperar a que carguen los datos de la cuenta
  await page.waitForTimeout(1000);

  // Verificar que hay saldo (el total de 3 x 1500 = 4500, formateado como "$ 4.500,00")
  await expect(page.getByText("4.500").first()).toBeVisible({ timeout: 10_000 });
});

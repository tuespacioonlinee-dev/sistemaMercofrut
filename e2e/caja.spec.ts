// e2e/caja.spec.ts
import { test, expect } from "@playwright/test";
import { seed, cleanup, disconnect, TEST_USER } from "./helpers/seed";
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

test("abrir caja con saldo inicial", async ({ page }) => {
  await page.goto("/caja");

  await expect(page.getByText("No hay caja abierta")).toBeVisible();

  await page.locator("#saldoInicial").fill("5000");
  await page.getByRole("button", { name: "Abrir caja" }).click();

  await expect(page.getByText("No hay caja abierta")).not.toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Saldo inicial")).toBeVisible();
});

test("cerrar caja con arqueo", async ({ page }) => {
  await page.goto("/caja");

  // Si no hay caja abierta, abrir una
  const noCaja = page.getByText("No hay caja abierta");
  if (await noCaja.isVisible().catch(() => false)) {
    await page.locator("#saldoInicial").fill("5000");
    await page.getByRole("button", { name: "Abrir caja" }).click();
    await expect(noCaja).not.toBeVisible({ timeout: 10_000 });
  }

  await page.locator("#saldoArqueo").fill("5000");
  await page.getByRole("button", { name: "Cerrar caja" }).click();

  await expect(page.getByText("No hay caja abierta")).toBeVisible({ timeout: 10_000 });
});

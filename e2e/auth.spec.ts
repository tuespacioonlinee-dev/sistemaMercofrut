import { test, expect } from "@playwright/test";
import { seed, cleanup, disconnect, TEST_USER } from "./helpers/seed";

test.beforeAll(async () => {
  await seed();
});

test.afterAll(async () => {
  await cleanup();
  await disconnect();
});

test("login con credenciales válidas redirige al dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill(TEST_USER.email);
  await page.locator("#password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL("/", { timeout: 10_000 });
  await expect(page.getByText("Bienvenido")).toBeVisible();
});

test("login con credenciales inválidas muestra error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#email").fill("noexiste@test.com");
  await page.locator("#password").fill("wrongpass");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.locator(".text-destructive")).toBeVisible({ timeout: 5_000 });
  await expect(page).toHaveURL(/\/login/);
});

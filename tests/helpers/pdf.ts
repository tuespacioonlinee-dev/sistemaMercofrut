/**
 * Helper para validar descargas de PDF en tests.
 *
 * Uso:
 * ```ts
 * const download = await esperarDescarga(page, async () => {
 *   await page.getByRole("button", { name: /pdf/i }).click()
 * })
 * expect(download.suggestedFilename()).toMatch(/\.pdf$/)
 * ```
 */
import type { Page, Download } from "@playwright/test"

export async function esperarDescarga(
  page: Page,
  trigger: () => Promise<void>,
): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15_000 }),
    trigger(),
  ])
  return download
}

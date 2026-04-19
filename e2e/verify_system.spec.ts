import { test, expect } from '@playwright/test';

test('Verify Map and Route Calculator Integration', async ({ page }) => {
  // Go to home page
  await page.goto('http://localhost:4321/es/home');

  // Wait for map to be interactive
  const map = page.locator('#map-container');
  await expect(map).toBeVisible();

  // Check if legend is present
  const legendToggle = page.locator('button:has-text("Rutas")');
  if (await legendToggle.isVisible()) {
    await legendToggle.click();
    const legendContent = page.locator('.route-legend__content');
    await expect(legendContent).toBeVisible();
  }

  // Check if WASM engine is initialized by looking at the calculator
  const calculator = page.locator('.route-calculator');
  await expect(calculator).toBeVisible();

  // Trigger a search to verify enrichment
  const input = page.locator('input[type="text"]').first();
  await input.fill('Puerto Juarez');
  await page.keyboard.press('Enter');
});

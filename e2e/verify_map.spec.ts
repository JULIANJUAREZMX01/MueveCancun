import { test, expect } from '@playwright/test';

test('map draws a route using the offline WASM engine', async ({ page, context }) => {
  await context.addCookies([
    { name: 'tutorial_completed', value: 'true', url: 'http://localhost:4321' },
    { name: 'locale', value: 'es', url: 'http://localhost:4321' },
  ]);
  await page.route('**/api/v1/journey', route => route.abort());
  await page.goto('/es/home');

  await expect(page.locator('#map-container')).toBeVisible();
  await expect(page.locator('#calculator-sheet')).toHaveClass(/is-expanded/);
  await expect(page.locator('#origin-input')).toBeVisible();
  await expect(page.locator('#dest-input')).toBeVisible();
  await expect(page.locator('#trip-status-bar')).toBeHidden();
  await expect(page.locator('#quick-actions')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.WASM_READY === true), { timeout: 60_000 }).toBe(true);
  await expect.poll(() => page.locator('#map-container .leaflet-overlay-pane path').count()).toBeLessThan(100);

  await page.fill('#origin-input', 'El Crucero');
  await page.fill('#dest-input', 'Plaza Las Américas');
  await page.click('#search-route-btn');

  const firstResult = page.locator('#results-container .journey-card').first();
  await expect(firstResult).toBeVisible({ timeout: 15_000 });
  await firstResult.click();

  await expect(page.locator('#route-banner')).toBeVisible();
  await expect(page.locator('#map-container .leaflet-overlay-pane path').first()).toBeVisible();
});

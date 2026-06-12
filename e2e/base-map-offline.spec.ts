import { expect, test, type Page } from '@playwright/test';

async function failCartoAndAssertCleanFallback(page: Page, path: string, mapSelector: string) {
  await page.route('**/api/map-tile/**', route => route.abort('failed'));
  await page.goto(path);

  const map = page.locator(mapSelector);
  await expect(map).toBeVisible();
  await expect(map.locator('[data-base-map-status="unavailable"]')).toBeVisible({ timeout: 15_000 });
  await expect(map).toHaveClass(/map-base-unavailable/);

  await expect.poll(() => map.locator('.leaflet-tile-pane img').count()).toBe(0);
  await expect.poll(() => map.locator('img').evaluateAll(images => images.filter(image => {
    const element = image as HTMLImageElement;
    return element.complete && element.naturalWidth === 0;
  }).length)).toBe(0);
}

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'tutorial_completed', value: 'true', url: 'http://localhost:4321' },
    { name: 'locale', value: 'es', url: 'http://localhost:4321' },
  ]);
});

test('removes failed Carto tiles while keeping interactive map overlays available', async ({ page }) => {
  await failCartoAndAssertCleanFallback(page, '/es/home', '#map-container');
  await expect(page.locator('#map-container .local-route-line').first()).toBeVisible();
  await expect(page.locator('#map-container')).toHaveAttribute('data-local-routes', '78');
  await expect(page.locator('#gps-center-btn')).toBeVisible();
});

test('uses the same clean fallback on the tracking map', async ({ page }) => {
  await failCartoAndAssertCleanFallback(page, '/es/tracking', '#tracking-map');
  await expect(page.locator('#tracking-map .leaflet-control-zoom')).toBeVisible();
  await expect(page.locator('#tracking-map .local-route-line').first()).toBeVisible();
  await expect(page.locator('#tracking-map')).toHaveAttribute('data-local-routes', '78');
});

test('uses the same clean fallback on the shared-location detail map', async ({ page }) => {
  await page.route('**/api/v1/share?id=offline-map-test', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      lat: 21.1619,
      lng: -86.8515,
      nickname: 'Viajero offline',
      phase: 'walking',
      updated_at: new Date().toISOString(),
    }),
  }));

  await failCartoAndAssertCleanFallback(page, '/share/offline-map-test', '#share-map');
  await expect(page.locator('#share-map .leaflet-marker-pane')).toBeVisible();
});

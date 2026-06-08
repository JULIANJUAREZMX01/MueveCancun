import { test, expect } from '@playwright/test';

test.describe('mobile tracking controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tutorial_completed', 'true');
      window.localStorage.setItem('lang', 'es');
      document.cookie = 'tutorial_completed=true; path=/; SameSite=Lax';
      document.cookie = 'locale=es; path=/; SameSite=Lax';
    });
    await page.route('**/api/master_routes.json', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ rutas: [{ id: 'R1_ZONA_HOTELERA_001', nombre: 'Ruta Hotelera con un nombre largo para móvil' }] }),
    }));
    await page.route('**/api/tracking**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await page.route('**/api/v1/telemetry**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  });

  test('selects a route, changes views, and collapses the active panel', async ({ page }) => {
    await page.goto('/es/tracking');

    const routeSelect = page.locator('#route-select');
    await expect(routeSelect).toBeVisible();
    await routeSelect.selectOption('R1_ZONA_HOTELERA_001');
    await expect(routeSelect).toHaveValue('R1_ZONA_HOTELERA_001');

    await page.locator('[data-view="heatmap"]').click();
    await expect(page.locator('#buses-panel')).toBeHidden();
    await expect(page.locator('#stops-panel')).toBeHidden();

    await page.locator('[data-view="stops"]').click();
    const stopsPanel = page.locator('#stops-panel');
    await expect(stopsPanel).toBeVisible();
    await expect(page.locator('#buses-panel')).toBeHidden();

    const handle = stopsPanel.locator('.panel-handle');
    await handle.focus();
    await page.keyboard.press('End');
    await expect(stopsPanel).toHaveAttribute('data-panel-state', 'expanded');
    await expect(page.locator('body')).toHaveClass(/tracking-panel-expanded/);

    await page.keyboard.press('Home');
    await expect(stopsPanel).toHaveAttribute('data-panel-state', 'collapsed');
    await expect(page.locator('body')).not.toHaveClass(/tracking-panel-expanded/);
  });
});

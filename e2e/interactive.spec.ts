import { test, expect } from '@playwright/test';

test.describe('PWA Interactive Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tutorial_completed', 'true');
      localStorage.setItem('lang', 'es');
      document.cookie = "tutorial_completed=true; path=/";
    });
  });

  test('Route Calculator search works', async ({ page }) => {
    await page.goto('/es/home');
    const searchBtn = page.locator('#search-btn');
    await expect(searchBtn).toBeEnabled({ timeout: 30000 });
    await page.locator('#origin-input').fill('El Crucero');
    await page.locator('#destination-input').fill('Zona Hotelera');
    await page.evaluate(() => {
      const btn = document.getElementById('search-btn');
      if (btn) (btn as HTMLElement).click();
    });
    await expect(page.locator('#results-info')).toBeVisible({ timeout: 15000 });
  });

  test('Report Widget offline queueing and sync flush', async ({ page }) => {
    await page.goto('/es/home');

    // 1. Open Widget
    await page.evaluate(() => {
       const fab = document.getElementById('rw-fab');
       if (fab) fab.click();
    });
    await expect(page.locator('#rw-overlay')).toBeVisible();

    // 2. Fill
    await page.selectOption('select[name="tipo"]', 'precio');
    await page.fill('textarea[name="descripcion"]', 'Deterministic offline sync testing description');

    // 3. GO OFFLINE
    await page.context().setOffline(true);

    // 4. Submit
    await page.evaluate(() => {
      const form = document.getElementById('rw-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    });

    // 5. Verify Badge appears via poll
    const badge = page.locator('#rw-queue-badge');
    await expect(badge).toHaveText('1', { timeout: 15000 });

    // 6. Mock API for Sync
    await page.route('**/issues', async route => {
      await route.fulfill({ status: 201, body: '{}' });
    });

    // 7. GO ONLINE
    await page.context().setOffline(false);

    // 8. Trigger sync and Poll for badge hidden (indicating flush)
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    await expect.poll(async () => {
       return await badge.isVisible();
    }, {
      message: 'Wait for offline queue to flush (badge hidden)',
      timeout: 20000,
    }).toBe(false);
  });
});

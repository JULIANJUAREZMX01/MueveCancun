import { test, expect } from '@playwright/test';

test.describe('PWA Interactive Components', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tutorial_completed', 'true');
      window.localStorage.setItem('lang', 'es');
      document.cookie = "tutorial_completed=true; path=/";
      document.cookie = "locale=es; path=/";
    });
  });

  test('Route Calculator search works', async ({ page }) => {
    await page.goto('/es/home');
    await expect(page.locator('#btn-text')).not.toHaveText(/Cargando|Loading/i, { timeout: 25000 });

    await page.fill('#origin-input', 'ADO Centro');
    await page.fill('#destination-input', 'El Crucero');

    const searchBtn = page.locator('#search-btn');
    await expect(searchBtn).toBeEnabled();
    await searchBtn.evaluate(el => (el as HTMLElement).click());

    await expect(page.locator('#results-container > div, #best-result-area > div').first()).toBeVisible({ timeout: 15000 });
  });

  test('Report Widget offline queueing and sync flush', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    await page.route('**/api.github.com/**', async route => {
        await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/es/home');
    await page.waitForLoadState('networkidle');

    // 1. Open widget
    const fab = page.locator('#rw-fab');
    await fab.click();
    await expect(page.locator('#rw-overlay')).toBeVisible();

    // 2. Fill form
    await page.selectOption('#rw-tipo', 'precio');
    await page.fill('#rw-desc', 'Test offline report description');

    // 3. Set offline
    await page.context().setOffline(true);

    // 4. Submit
    await page.locator('#rw-submit').click();

    // 5. Verify Badge appears
    const badge = page.locator('#rw-queue-badge');
    await expect(badge).toBeVisible({ timeout: 10000 });
    await expect(badge).toHaveText('1');

    // 6. Set online
    await page.context().setOffline(false);

    // 7. Verify sync triggers and badge clears
    // We check for hidden attribute or hidden state
    await expect(badge).toBeHidden({ timeout: 25000 });
  });

});

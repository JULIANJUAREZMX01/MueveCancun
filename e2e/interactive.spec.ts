import { test, expect } from '@playwright/test';

test.describe('PWA Interactive Components', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    await page.addInitScript(() => {
      window.localStorage.setItem('tutorial_completed', 'true');
      window.localStorage.setItem('lang', 'es');
      document.cookie = "tutorial_completed=true; path=/; SameSite=Lax";
      document.cookie = "locale=es; path=/; SameSite=Lax";
    });
  });

  test('Route Calculator search works', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/es/home');

    // Wait for WASM ready flag
    await expect.poll(async () => {
        return await page.evaluate(() => (window as any).WASM_READY === true);
    }, { timeout: 60000, message: 'WASM NOT READY' }).toBe(true);

    await page.fill('#origin-input', 'Villas Otoch Paraíso');
    await page.fill('#dest-input', 'El Crucero');

    const searchBtn = page.locator('#search-route-btn');
    await searchBtn.click();

    const results = page.locator('#results-info');
    await expect(results).toBeVisible({ timeout: 45000 });

    // Check if we got results or "No results" message
    const containerText = await page.locator('#results-container').innerText();
    console.log('RESULTS CONTAINER TEXT:', containerText);

    await expect(page.locator('#results-container > div').first()).toBeVisible({ timeout: 15000 });
  });

  test('Report Widget behavior', async ({ page }) => {
    await page.goto('/es/home');
    const fab = page.locator('#rw-fab');
    await expect(fab).toBeVisible({ timeout: 15000 });
    await fab.click();
    await expect(page.locator('#rw-overlay')).toBeVisible({ timeout: 10000 });
    await page.locator('#rw-close').click();
    await expect(page.locator('#rw-overlay')).toBeHidden({ timeout: 10000 });
  });

});

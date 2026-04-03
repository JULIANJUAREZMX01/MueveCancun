import { test, expect } from '@playwright/test';

test.describe('PWA Navigation & Crawl', () => {

  test('should handle onboarding flow', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    await expect(page.locator('text=/Bienvenido|Welcome/')).toBeVisible();

    const nextBtn = page.locator('#btn-next');
    const startEs = page.locator('#start-es');

    await expect
      .poll(async () => {
        if (await startEs.isVisible()) return true;
        if (await nextBtn.isVisible()) {
          await nextBtn.click({ force: true });
        }
        return false;
      }, { timeout: 5000 })
      .toBe(true);
    await startEs.click({ force: true });

    await expect(page).toHaveURL(/\/es\/home/);
  });

  test('should verify unified financial view in Wallet', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('tutorial_completed', 'true');
        window.localStorage.setItem('lang', 'es');
        document.cookie = "tutorial_completed=true; path=/";
        document.cookie = "locale=es; path=/";
    });
    await page.goto('/es/wallet');
    await expect(page.locator('h2').filter({ hasText: /Escudo/i })).toBeVisible();
  });

  test('should redirect legacy paths to unified wallet', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('tutorial_completed', 'true');
    });

    // es
    await page.addInitScript(() => {
        window.localStorage.setItem('lang', 'es');
        document.cookie = "locale=es; path=/";
    });
    await page.goto('/es/donate');
    await expect(page).toHaveURL(/\/es\/wallet/);

    // en
    await page.addInitScript(() => {
        window.localStorage.setItem('lang', 'en');
        document.cookie = "locale=en; path=/";
    });
    await page.goto('/en/suscripcion');
    await expect(page).toHaveURL(/\/en\/wallet/);
  });

  test('should verify other critical paths', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('tutorial_completed', 'true');
        document.cookie = "tutorial_completed=true; path=/";
    });

    const paths = ['/es/rutas', '/es/tracking', '/es/guess'];
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('h1, h2, #map, .calculator-wrapper').first()).toBeVisible({ timeout: 10000 });
    }
  });

});

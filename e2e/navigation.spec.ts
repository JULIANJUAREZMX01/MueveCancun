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

  test('should verify Wallet page', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('tutorial_completed', 'true');
        window.localStorage.setItem('lang', 'es');
        document.cookie = "tutorial_completed=true; path=/";
        document.cookie = "locale=es; path=/";
    });
    await page.goto('/es/wallet');
    // Check for "Saldo Actual" - lowercase i for case insensitive
    await expect(page.locator('text=Saldo Actual')).toBeVisible();
  });

  test('should verify critical paths', async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('tutorial_completed', 'true');
        document.cookie = "tutorial_completed=true; path=/";
    });

    const paths = ['/es/rutas', '/es/tracking', '/es/guess', '/es/about'];
    for (const path of paths) {
      await page.goto(path);
      // Wait for any identifiable content
      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('networkidle');
    }
  });

});

import { test, expect } from '@playwright/test';

test.describe('PWA Navigation & Crawl', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tutorial_completed', 'true');
      localStorage.setItem('lang', 'es');
      document.cookie = "tutorial_completed=true; path=/";
    });
  });

  test('should handle onboarding redirect to home', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(es|en)\/home/);
  });

  test('should verify unified financial view in Wallet', async ({ page }) => {
    await page.goto('/es/wallet');
    // Use a more specific locator
    await expect(page.locator('h2:has-text("Escudo de Cancún")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Shield Guardian')).toBeVisible();
  });

  test('should redirect legacy paths to unified wallet', async ({ page }) => {
    const legacyPaths = ['/es/donate', '/es/suscripcion'];
    for (const path of legacyPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/es\/wallet/, { timeout: 10000 });
    }
  });

  test('should verify other critical paths', async ({ page }) => {
    const paths = ['/es/rutas', '/es/about', '/es/home'];
    for (const path of paths) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path));
      const body = await page.textContent('body');
      expect(body).not.toContain('404');
    }
  });
});

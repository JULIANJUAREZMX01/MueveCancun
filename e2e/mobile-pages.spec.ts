import { expect, test } from '@playwright/test';

const mobilePages = [
  { name: 'guess', path: '/es/guess' },
  { name: 'route-detail', path: '/es/ruta/R1_ZONA_HOTELERA_001' },
  { name: 'contribute', path: '/es/contribuir' },
  { name: 'subscription', path: '/es/suscripcion' },
  { name: 'routes', path: '/es/rutas' },
];

test.describe('migrated pages on mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tutorial_completed', 'true');
      localStorage.setItem('lang', 'es');
      localStorage.setItem('theme', 'light');
      document.cookie = 'tutorial_completed=true; path=/; SameSite=Lax';
      document.cookie = 'locale=es; path=/; SameSite=Lax';
    });
  });

  for (const mobilePage of mobilePages) {
    test(`${mobilePage.name} mobile snapshot`, async ({ page }) => {
      await page.goto(mobilePage.path);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`${mobilePage.name}-mobile.png`, {
        animations: 'disabled',
        fullPage: true,
      });
    });
  }
});

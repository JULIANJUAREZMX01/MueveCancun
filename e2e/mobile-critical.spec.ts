import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 360, height: 800 }, isMobile: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tutorial_completed', 'true');
    localStorage.setItem('theme', 'light');
    document.cookie = 'tutorial_completed=true; path=/';
    document.cookie = 'locale=es; path=/';
  });
});

test('critical mobile pages fit the viewport and keep icons bounded', async ({ page }) => {
  for (const path of ['/es/guess', '/es/contribuir', '/es/suscripcion']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      largestSvg: Math.max(0, ...Array.from(document.querySelectorAll('svg')).map((svg) => svg.getBoundingClientRect().width)),
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport + 1);
    expect(metrics.largestSvg).toBeLessThanOrEqual(96);
  }
});

test('home and tracking render a local map surface without external tile images', async ({ page }) => {
  for (const path of ['/es/home', '/es/tracking']) {
    await page.goto(path);
    await expect(page.locator(path.endsWith('home') ? '#map-container' : '#tracking-map')).toBeVisible();
    await expect.poll(() => page.locator('.leaflet-overlay-pane path').count(), { timeout: 20_000 }).toBeGreaterThan(0);
    await expect(page.locator('img.leaflet-tile')).toHaveCount(0);
  }
});

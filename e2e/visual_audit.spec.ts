import { expect, test } from '@playwright/test';

test.describe('Visual Audit & Snapshot Evidence', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tutorial_completed', 'true');
      window.localStorage.setItem('lang', 'es');
      document.cookie = "tutorial_completed=true; path=/; SameSite=Lax";
      document.cookie = "locale=es; path=/; SameSite=Lax";
    });
  });

  const pages = [
    { name: 'home', path: '/es/home' },
    { name: 'rutas', path: '/es/rutas' },
    { name: 'wallet', path: '/es/wallet' },
    { name: 'about', path: '/es/about' },
    { name: 'guess', path: '/es/guess' }
  ];

  for (const p of pages) {
    test(`Audit Page: ${p.name} (Light & Dark)`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');

      // Light Mode
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.waitForTimeout(200);
      await page.screenshot({ path: `verification-artifacts/visual/${p.name}-light.png`, fullPage: true });

      // Dark Mode
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `verification-artifacts/visual/${p.name}-dark.png`, fullPage: true });
    });
  }
});

test.describe('Overlay collision guard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tutorial_completed', 'true');
      window.localStorage.setItem('lang', 'es');
      document.cookie = 'tutorial_completed=true; path=/; SameSite=Lax';
      document.cookie = 'locale=es; path=/; SameSite=Lax';
    });
  });

  test('global widgets do not intersect each other or shared safe zones', async ({ page }) => {
    await page.goto('/es/rutas');
    await page.waitForLoadState('networkidle');

    const collisions = await page.evaluate(() => {
      const visibleRect = (element: Element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 ? rect : null;
      };
      const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const items = [...document.querySelectorAll('[data-overlay-item]')]
        .map(element => ({ name: element.getAttribute('data-overlay-item') ?? 'unknown', rect: visibleRect(element) }))
        .filter((item): item is { name: string; rect: DOMRect } => Boolean(item.rect));
      const reserved = ['#app-header', '.bottom-nav']
        .map(selector => ({ name: selector, rect: document.querySelector(selector) ? visibleRect(document.querySelector(selector)!) : null }))
        .filter((item): item is { name: string; rect: DOMRect } => Boolean(item.rect));
      const found: string[] = [];

      items.forEach((item, index) => {
        items.slice(index + 1).forEach(other => {
          if (intersects(item.rect, other.rect)) found.push(`${item.name} intersects ${other.name}`);
        });
        reserved.forEach(zone => {
          if (intersects(item.rect, zone.rect)) found.push(`${item.name} intersects ${zone.name}`);
        });
      });
      return found;
    });

    expect(collisions).toEqual([]);
  });

  for (const pageConfig of [
    { path: '/es/tracking', mode: 'tracking' },
    { path: '/es/home', mode: 'expanded-map' },
    { path: '/es/contribuir', mode: 'form' },
    { path: '/es/guess', mode: 'camera' },
  ]) {
    test(`${pageConfig.mode} pages omit non-essential widgets`, async ({ page }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('body')).toHaveAttribute('data-map-mode', pageConfig.mode);
      await expect(page.locator('[data-overlay-item="report"], [data-overlay-item="nexus"], [data-overlay-item="donate"]')).toHaveCount(0);
    });
  }
});

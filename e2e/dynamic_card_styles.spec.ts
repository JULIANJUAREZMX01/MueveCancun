import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('tutorial_completed', 'true');
    window.localStorage.setItem('lang', 'es');
    document.cookie = 'tutorial_completed=true; path=/; SameSite=Lax';
    document.cookie = 'locale=es; path=/; SameSite=Lax';
  });
});

test('route cards receive their global dynamic styles', async ({ page }) => {
  await page.goto('/es/rutas');

  const card = page.locator('.route-card-vl').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('display', 'flex');
  await expect(card).toHaveCSS('height', '80px');
  await expect(card).toHaveCSS('border-left-width', '4px');
  await expect(card).toHaveCSS('border-radius', '24px');

  const type = card.locator('.rcv-type');
  await expect(type).toHaveCSS('width', '40px');
  await expect(type).toHaveCSS('height', '40px');
  await expect(card.locator('.rcv-name')).toHaveCSS('font-weight', '800');
});

test('bus cards receive their global dynamic styles', async ({ page }) => {
  await page.route('**/api/tracking*', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([{
      id: 'e2e-bus', route_id: 'R1', lat: 21.1619, lng: -86.8515,
      speed_kmh: 28, heading: 90, stop_name: 'El Crucero', occupancy_pct: 55, is_stub: true,
    }]),
  }));

  await page.goto('/es/tracking');

  const card = page.locator('.bus-item').first();
  await expect(card).toBeVisible();
  await expect(card).toHaveCSS('display', 'flex');
  await expect(card).toHaveCSS('border-radius', '14px');
  await expect(card).toHaveCSS('border-left-width', /1(?:\.5)?px/);
  await expect(card.locator('.bus-svg')).toHaveCSS('width', '36px');
  await expect(card.locator('.occ-bar')).toHaveCSS('height', '5px');
  await expect(card.locator('.occ-fill')).toHaveCSS('width', /.+px/);
});

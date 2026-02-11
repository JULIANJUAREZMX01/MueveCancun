import { test, expect } from '@playwright/test';
import path from 'path';

test('Verify UI Restoration', async ({ page }) => {
  // 1. Go to Home
  await page.goto('http://localhost:4321/');

  // 2. Check Hero Headline
  const hero = page.locator('.hero-headline h1');
  await expect(hero).toContainText('¿Qué ruta me lleva?');
  await expect(hero).toContainText('Cancún');

  // 3. Check Brand Animation (Top Bar Mobile or Desktop Header)
  // Depending on viewport, either .brand-tetris or header .brand-tetris-container exists
  const brand = page.locator('.brand-tetris, .brand-tetris-container').first();
  await expect(brand).toBeVisible();

  // 4. Check Quick Access Zones in Search
  const quickZones = page.locator('.zone-chip');
  await expect(quickZones).toHaveCount(4); // Cancún, Pto Morelos, Riviera Maya, Aeropuerto

  // 5. Check Navigation (Community Link)
  const navLink = page.locator('a[href="/community"]');
  await expect(navLink).toBeVisible();

  // 6. Go to Catalog (Rutas)
  await page.goto('http://localhost:4321/rutas');

  // 7. Verify Routes Loaded (More than 2)
  const routeCards = page.locator('.glass-card');
  const count = await routeCards.count();
  console.log(`Found ${count} route cards`);
  expect(count).toBeGreaterThan(2);

  // 8. Go to Community
  await page.goto('http://localhost:4321/community');
  await expect(page.locator('h1')).toContainText('Comunidad');

  // Screenshot
  await page.screenshot({ path: 'verification/ui_restored.png', fullPage: true });
});

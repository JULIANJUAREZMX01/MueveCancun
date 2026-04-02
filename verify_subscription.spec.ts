import { test, expect } from '@playwright/test';

test('subscription page renders correctly', async ({ page }) => {
  await page.goto('/es/suscripcion');
  await expect(page.locator('h1')).toContainText('MueveCancún');
  await expect(page.locator('text=Panel de Suscripciones')).toBeVisible();
  await expect(page.locator('text=Starter')).toBeVisible();
  await expect(page.locator('text=Elite')).toBeVisible();
  await expect(page.locator('text=Elite Anual')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'verification-subscription-es.png', fullPage: true });

  await page.goto('/en/suscripcion');
  await expect(page.locator('text=Subscription Panel')).toBeVisible();
  await expect(page.locator('text=Phase 1 — Starter')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'verification-subscription-en.png', fullPage: true });
});

test('navigation items are present', async ({ page }) => {
  await page.goto('/es/home');
  // Check bottom nav on mobile-like viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('nav.graffiti-nav >> text=Suscripciones')).toBeVisible();

  // Check desktop nav
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('nav >> text=Suscripciones')).toBeVisible();
});

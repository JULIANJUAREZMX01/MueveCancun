import { test, expect } from '@playwright/test';

test('verify interactive map features', async ({ page }) => {
  await page.goto('http://localhost:4321/es/home');
  // Set tutorial cookie
  await page.context().addCookies([{ name: 'tutorial_completed', value: 'true', url: 'http://localhost:4321' }]);
  await page.reload();

  // Wait for map
  await page.waitForSelector('#map');

  // Click on the map to trigger nearest stop popup
  // Cancún center approx
  await page.mouse.click(500, 500);

  // Wait for popup
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'map_popup_test.png' });

  // Try to search a route
  await page.fill('#origin-input', 'Crucero');
  await page.fill('#dest-input', 'Plaza las Americas');
  await page.click('#search-route-btn');

  // Wait for results
  await page.waitForSelector('#results-container .group');
  await page.screenshot({ path: 'route_results_test.png' });

  // Click a result to show on map
  await page.click('#results-container .group:first-child');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'route_on_map_test.png' });
});

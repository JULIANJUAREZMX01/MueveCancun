import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Home
  await page.goto('http://localhost:3007');
  await page.screenshot({ path: 'verification/home_v2.png' });

  // Mapa
  await page.goto('http://localhost:3007/mapa');
  await page.waitForTimeout(2000); // Wait for mapbox
  await page.screenshot({ path: 'verification/mapa_v2.png' });

  await browser.close();
})();

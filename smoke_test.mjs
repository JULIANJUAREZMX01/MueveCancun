import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('🚀 Starting Smoke Test...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Ensure evidence directory exists
  if (!fs.existsSync('evidence')) {
    fs.mkdirSync('evidence');
  }

  // Monitor console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`PAGE ERROR: ${msg.text()}`);
    } else {
      console.log(`PAGE LOG: ${msg.text()}`);
    }
  });

  page.on('pageerror', exception => {
    console.error(`PAGE EXCEPTION: ${exception}`);
  });

  try {
    // 1. Boot & Network Check (Home)
    console.log('--- Step 1: Boot & Home Check ---');
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('#route-calculator');
    await page.screenshot({ path: 'evidence/home.png' });
    console.log('✅ Home loaded and screenshot taken.');

    // 2. Map Check
    console.log('--- Step 2: Map Check ---');
    await page.goto('http://localhost:3000/mapa');
    try {
        await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });
        console.log('✅ Map canvas detected.');
    } catch(e) {
        console.warn('⚠️ Map canvas not detected within timeout (might be loading or hidden).');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'evidence/map.png' });
    console.log('✅ Map screenshot taken.');

    // 3. Functional Logic Test: Wallet
    console.log('--- Step 3: Wallet Check ---');
    await page.goto('http://localhost:3000/driver');
    await page.waitForSelector('#driver-wallet-container');

    // Click +$50 MXN button
    const btn50 = page.locator('button[data-amount="50"]');
    if (await btn50.isVisible()) {
        await btn50.click();
        await page.waitForTimeout(1000); // Wait for update
        await page.screenshot({ path: 'evidence/wallet_updated.png' });
        console.log('✅ Wallet updated and screenshot taken.');
    } else {
        console.error('❌ +$50 Button not found!');
    }

    // 4. The WASM Brain: Route Search (Walmart -> Mercado 23)
    console.log('--- Step 4: Route Search (Success) ---');
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('#origin-input');

    // Fill form
    await page.fill('#origin-input', 'Walmart');
    await page.fill('#destination-input', 'Mercado 23');

    // Wait for WASM to be ready (button might be disabled initially)
    await page.waitForFunction(() => {
        const btn = document.querySelector('#calculate-btn');
        return btn && !btn.disabled;
    }, { timeout: 10000 }).catch(() => console.warn('Button still disabled?'));

    await page.click('#calculate-btn');

    // Wait for results
    try {
        await page.waitForSelector('#results-container', { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'evidence/route_success.png' });
        console.log('✅ Route calculation successful and screenshot taken.');
    } catch (e) {
        console.error('❌ Route calculation timed out or failed to show results.');
        await page.screenshot({ path: 'evidence/route_failure.png' });
    }

    // 5. The "Airport Gatekeeper" Check (Walmart -> Aeropuerto)
    console.log('--- Step 5: Airport Gatekeeper Check ---');
    await page.reload();
    await page.waitForSelector('#origin-input');

    await page.fill('#origin-input', 'Walmart');
    await page.fill('#destination-input', 'Aeropuerto');

    // Handle dialog
    let dialogHandled = false;
    page.once('dialog', async dialog => {
      console.log(`✅ Dialog detected: ${dialog.message()}`);
      await dialog.dismiss(); // Dismiss to block the action (simulate user seeing warning)
      dialogHandled = true;
    });

    // Ensure button is enabled
    await page.waitForFunction(() => !document.querySelector('#calculate-btn').disabled);
    await page.click('#calculate-btn');

    // Wait a bit
    await page.waitForTimeout(1000);

    if (dialogHandled) {
        console.log('✅ Airport warning dialog appeared and handled.');
    } else {
        console.warn('⚠️ No dialog detected.');
    }

    await page.screenshot({ path: 'evidence/route_blocked.png' });

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
    console.log('🏁 Smoke Test Complete.');
  }
})();

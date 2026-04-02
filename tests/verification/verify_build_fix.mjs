import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('--- Setting Tutorial Cookie ---');
    await page.goto('http://localhost:4321/');
    await page.evaluate(() => {
      localStorage.setItem('tutorial_completed', 'true');
      localStorage.setItem('lang', 'es');
      document.cookie = "tutorial_completed=true; path=/; max-age=31536000";
      document.cookie = "lang=es; path=/; max-age=31536000";
    });

    console.log('--- Navigating to Wallet Page ---');
    await page.goto('http://localhost:4321/es/wallet');
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    console.log('Page Title:', title);

    // Check balance is present
    const balance = await page.locator('#balance-amount').textContent();
    console.log('Balance found:', balance);

    // Take screenshot
    await page.screenshot({ path: 'verification-artifacts/wallet_fix_verification.png' });
    console.log('Screenshot saved to verification-artifacts/wallet_fix_verification.png');

    // Check Home
    console.log('\n--- Navigating to Home ---');
    await page.goto('http://localhost:4321/es/home');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'verification-artifacts/home_fix_verification.png' });
    console.log('Screenshot saved to verification-artifacts/home_fix_verification.png');

  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

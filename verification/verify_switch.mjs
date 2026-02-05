import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to home page directly...');
    await page.goto('http://localhost:4321/home', { waitUntil: 'networkidle' });

    console.log('Checking for Switch component...');

    // Locate the label text
    const labelText = page.getByText('Turista');
    await labelText.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Label "Turista" found and visible.');

    // Locate the hidden input by ID
    const switchInput = page.locator('#tourist-mode-home');

    // Take screenshot of initial state
    await page.screenshot({ path: 'verification/initial_state.png' });

    // Click the label (user interaction)
    console.log('Toggling switch by clicking label...');
    await labelText.click();

    // Wait for transition
    await page.waitForTimeout(500);

    // Screenshot
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'verification/switch_toggled.png' });

    // Verify checked state (it started true, so now it should be false)
    const isChecked = await switchInput.isChecked();
    console.log(`Switch is checked: ${isChecked}`);

    // Original state was checked={true}
    // Click should make it false
    if (isChecked) {
        throw new Error('Switch did not toggle (expected false)!');
    }

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

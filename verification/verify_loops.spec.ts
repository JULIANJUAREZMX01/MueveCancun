import { test, expect } from '@playwright/test';

test.describe('Redirection Loop Verification', () => {
  test('should complete tutorial and stay on home', async ({ page }) => {
    await page.goto('http://localhost:4321/');

    // Match the title without being overly strict on the full string
    const welcomeTitle = page.locator('.step.active h1');
    await expect(welcomeTitle).toContainText('Bienvenido');

    console.log('Clicking through tutorial...');
    const btnNext = page.locator('#btn-next');
    for (let i = 0; i < 3; i++) {
        await btnNext.click();
    }

    console.log('Clicking Comenzar en Español...');
    const btnStart = page.locator('#start-es');
    await btnStart.click();

    // Verify we land on /es/home and STAY there
    await page.waitForURL('**/es/home', { timeout: 15000 });
    expect(page.url()).toContain('/es/home');

    // Wait to ensure no redirect kicks us out
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/es/home');
    console.log('Reached and stayed on /es/home.');
  });

  test('should handle root-to-localized redirect with existing state', async ({ page }) => {
    await page.goto('http://localhost:4321/');
    await page.evaluate(() => {
        document.cookie = "tutorial_completed=true; path=/; SameSite=Lax";
        localStorage.setItem('tutorial_completed', 'true');
        localStorage.setItem('lang', 'es');
    });

    console.log('Navigating to root with state...');
    await page.goto('http://localhost:4321/');

    // Wait for the redirect to /es/home
    await page.waitForURL('**/es/home', { timeout: 10000 });
    expect(page.url()).toContain('/es/home');
    console.log('Auto-redirected successfully.');
  });
});

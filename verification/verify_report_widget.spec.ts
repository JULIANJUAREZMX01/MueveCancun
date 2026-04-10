import { test, expect } from '@playwright/test';

test.describe('ReportWidget Verification', () => {
  test('should open and close the report widget', async ({ page }) => {
    // Inject cookies to bypass tutorial
    await page.context().addCookies([
      { name: 'tutorial_completed', value: 'true', domain: 'localhost', path: '/' },
      { name: 'locale', value: 'es', domain: 'localhost', path: '/' }
    ]);

    await page.goto('http://localhost:4321/es/home');

    // Wait for the FAB to be visible
    const fab = page.locator('#rw-fab');
    await expect(fab).toBeVisible();

    // Click to open
    await fab.click();

    // Check modal is visible
    const overlay = page.locator('#rw-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).not.toHaveAttribute('hidden');

    // Take screenshot of open modal
    await page.screenshot({ path: 'verification/screenshots/report_modal_open.png' });

    // Click cancel to close
    const cancelBtn = page.locator('#rw-cancel');
    await cancelBtn.click();

    // Check modal is hidden
    await expect(overlay).toBeHidden();

    // Test View Transitions (if possible in this env)
    // Navigate to another page
    await page.click('a[href*="/rutas"]');
    await page.waitForURL('**/rutas');

    // Check if widget still works after navigation
    await expect(fab).toBeVisible();
    await fab.click();
    await expect(overlay).toBeVisible();
    await page.screenshot({ path: 'verification/screenshots/report_modal_after_nav.png' });
  });

  test('should handle submission correctly', async ({ page }) => {
    await page.context().addCookies([
      { name: 'tutorial_completed', value: 'true', domain: 'localhost', path: '/' },
      { name: 'locale', value: 'es', domain: 'localhost', path: '/' }
    ]);

    await page.goto('http://localhost:4321/es/home');
    await page.locator('#rw-fab').click();

    // Fill form
    await page.selectOption('#rw-tipo', 'precio');
    await page.fill('#rw-ruta', 'R-1');
    await page.fill('#rw-desc', 'Prueba de reporte funcional con API');

    // Submit
    await page.click('#rw-submit');

    // Success feedback
    const feedback = page.locator('#rw-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Gracias');

    // Modal should auto-close
    await expect(page.locator('#rw-overlay')).toBeHidden({ timeout: 10000 });
  });
});

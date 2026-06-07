import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const pages = [
  { name: 'home', path: '/es/home' },
  { name: 'tracking', path: '/es/tracking' },
  { name: 'rutas', path: '/es/rutas' },
  { name: 'ruta-detail', path: '/es/ruta/R2_94_VILLAS_OTOCH_001' },
  { name: 'guess', path: '/es/guess' },
  { name: 'contribuir', path: '/es/contribuir' },
  { name: 'suscripcion', path: '/es/suscripcion' },
] as const;

const modes = ['light', 'dark'] as const;

async function assertResponsiveHealth(page: Page) {
  const issues = await page.evaluate(() => {
    const problems: string[] = [];
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const isRendered = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const describe = (element: Element) => {
      const htmlElement = element as HTMLElement;
      return `${element.tagName.toLowerCase()}#${htmlElement.id || '-'}${htmlElement.className ? `.${String(htmlElement.className).trim().replace(/\s+/g, '.')}` : ''}`;
    };

    if (document.documentElement.scrollWidth > viewportWidth + 1 || document.body.scrollWidth > viewportWidth + 1) {
      problems.push(`horizontal overflow: document=${document.documentElement.scrollWidth}px, viewport=${viewportWidth}px`);
    }

    const oversizedSvgs = [...document.querySelectorAll('svg')]
      .filter(isRendered)
      .filter((svg) => {
        const { width, height } = svg.getBoundingClientRect();
        const aspectRatio = Math.max(width / height, height / width);
        return width > viewportWidth + 1 || height > viewportHeight + 1 || (Math.min(width, height) >= 24 && aspectRatio > 8);
      })
      .map(describe);
    if (oversizedSvgs.length) problems.push(`disproportionate SVGs: ${oversizedSvgs.join(', ')}`);

    const bottomNav = document.querySelector('.bottom-nav');
    const desktopNav = document.querySelector('.desktop-nav');
    const expectsDesktopNav = viewportWidth >= 769;
    if (expectsDesktopNav && (!desktopNav || !isRendered(desktopNav))) problems.push('desktop navigation is not visible');
    if (expectsDesktopNav && bottomNav && isRendered(bottomNav)) problems.push('mobile navigation is visible on desktop');
    if (!expectsDesktopNav && (!bottomNav || !isRendered(bottomNav))) problems.push('mobile navigation is not visible');
    if (!expectsDesktopNav && desktopNav && isRendered(desktopNav)) problems.push('desktop navigation is visible on mobile/tablet');

    const interactive = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="button"], [tabindex]')]
      .filter((element) => !(element as HTMLElement).hidden && isRendered(element));
    if (!interactive.length) problems.push('no visible interactive elements');
    const clippedInteractive = interactive.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right < 1 || rect.left > viewportWidth - 1 || rect.width < 1 || rect.height < 1;
    });
    if (clippedInteractive.length) problems.push(`interactive elements outside viewport width: ${clippedInteractive.slice(0, 8).map(describe).join(', ')}`);

    const brokenImages = [...document.images]
      .filter(isRendered)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map(describe);
    if (brokenImages.length) problems.push(`broken images: ${brokenImages.join(', ')}`);

    const overlays = [...document.querySelectorAll('dialog, [role="dialog"], .rw-overlay, [class*="modal-overlay"]')]
      .filter(isRendered)
      .filter((element) => getComputedStyle(element).position === 'fixed' || element.tagName === 'DIALOG');
    for (let first = 0; first < overlays.length; first += 1) {
      const a = overlays[first].getBoundingClientRect();
      for (let second = first + 1; second < overlays.length; second += 1) {
        const b = overlays[second].getBoundingClientRect();
        const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        if (overlaps) problems.push(`overlapping overlays: ${describe(overlays[first])} and ${describe(overlays[second])}`);
      }
    }

    return problems;
  });

  expect(issues, issues.join('\n')).toEqual([]);
}

test.describe('Visual Audit & Snapshot Evidence', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tutorial_completed', 'true');
      window.localStorage.setItem('lang', 'es');
      window.localStorage.setItem('pwa_install_dismissed', 'true');
      window.localStorage.setItem('donate_nudge_dismissed', 'true');
      document.cookie = 'tutorial_completed=true; path=/; SameSite=Lax';
      document.cookie = 'locale=es; path=/; SameSite=Lax';
    });
  });

  for (const currentPage of pages) {
    test(`audit ${currentPage.name}`, async ({ page }, testInfo) => {
      await page.goto(currentPage.path);
      await page.waitForLoadState('networkidle');

      for (const mode of modes) {
        await page.evaluate((selectedMode) => {
          document.documentElement.classList.toggle('dark', selectedMode === 'dark');
        }, mode);
        await page.waitForTimeout(250);

        await assertResponsiveHealth(page);

        const screenshotName = `${currentPage.name}-${mode}.png`;
        await page.screenshot({
          path: `verification-artifacts/visual/${testInfo.project.name}/${screenshotName}`,
          fullPage: true,
          animations: 'disabled',
        });
        const baselineExists = existsSync(testInfo.snapshotPath(screenshotName));
        if (!process.env.CI || baselineExists) {
          await expect(page).toHaveScreenshot(screenshotName, {
            fullPage: true,
            animations: 'disabled',
            mask: [page.locator('.leaflet-tile-pane')],
          });
        } else {
          testInfo.annotations.push({
            type: 'visual-baseline',
            description: `No committed baseline for ${screenshotName}; screenshot was saved as CI evidence.`,
          });
        }
      }
    });
  }
});

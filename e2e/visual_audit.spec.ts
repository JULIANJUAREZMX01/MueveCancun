import { test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test.describe('Visual Audit & Snapshot Evidence', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tutorial_completed', 'true');
      window.localStorage.setItem('lang', 'es');
      document.cookie = "tutorial_completed=true; path=/; SameSite=Lax";
      document.cookie = "locale=es; path=/; SameSite=Lax";
    });
  });

  const pages = [
    { name: 'home', path: '/es/home' },
    { name: 'rutas', path: '/es/rutas' },
    { name: 'wallet', path: '/es/wallet' },
    { name: 'about', path: '/es/about' },
    { name: 'guess', path: '/es/guess' }
  ];

  for (const p of pages) {
    test(`Audit Page: ${p.name} (Light & Dark)`, async ({ page }) => {
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');

      const buildMetadata = await page.evaluate(() => {
        const meta = (name: string) => document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? 'unknown';
        return {
          url: window.location.href,
          commit: meta('git-commit'),
          shortCommit: meta('git-commit-short'),
          buildId: meta('build-id'),
          cacheVersion: meta('cache-version'),
          buildDate: meta('build-date'),
          auditedAt: new Date().toISOString(),
        };
      });
      await mkdir('verification-artifacts/visual', { recursive: true });
      await writeFile(`verification-artifacts/visual/${p.name}-metadata.json`, JSON.stringify(buildMetadata, null, 2));

      // Light Mode
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.waitForTimeout(200);
      await page.screenshot({ path: `verification-artifacts/visual/${p.name}-light.png`, fullPage: true });

      // Dark Mode
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `verification-artifacts/visual/${p.name}-dark.png`, fullPage: true });
    });
  }
});

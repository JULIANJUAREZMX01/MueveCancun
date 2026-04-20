import { spawn } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4321;
const BASE_URL = `http://${HOST}:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 90_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/es/home`);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await wait(500);
  }
  return false;
}

function startDevServer() {
  const child = spawn('pnpm', ['run', 'dev', '--host', HOST, '--port', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[dev] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[dev:err] ${chunk}`));
  return child;
}

async function runSmoke() {
  const browserPath = chromium.executablePath();
  if (!browserPath || !fs.existsSync(browserPath)) {
    console.warn('[e2e-smoke] Playwright Chromium no está instalado. Smoke E2E omitido.');
    return;
  }

  const devServer = startDevServer();
  let browser;

  try {
    const ready = await waitForServer();
    if (!ready) throw new Error('Dev server no respondió en el tiempo esperado');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    await page.goto(`${BASE_URL}/es/home`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('tutorial_completed', 'true'));
    await page.goto(`${BASE_URL}/es/home`, { waitUntil: 'networkidle' });

    await page.waitForSelector('#origin-input', { timeout: 20_000 });
    await page.waitForSelector('#dest-input', { timeout: 20_000 });
    await page.waitForSelector('#search-route-btn', { timeout: 20_000 });

    await page.fill('#origin-input', 'El Crucero');
    await page.fill('#dest-input', 'Plaza Las Américas');
    await page.click('#search-route-btn');

    await page.waitForSelector('#results-container > div', { timeout: 25_000 });
    const routesFound = await page.locator('#results-container > div').count();
    if (routesFound < 1) throw new Error('No se encontraron rutas en el flujo de usuario');

    await page.locator('#results-container > div').first().click();
    await page.waitForTimeout(1200);

    const polylines = await page.locator('.leaflet-overlay-pane svg path').count();
    if (polylines < 1) throw new Error('No se detectó trazo en el mapa tras seleccionar ruta');

    console.log(`[e2e-smoke] OK — routesFound=${routesFound}, polylines=${polylines}`);
  } finally {
    if (browser) await browser.close();
    devServer.kill('SIGINT');
  }
}

runSmoke().catch((err) => {
  console.error('[e2e-smoke] FAIL:', err);
  process.exit(1);
});

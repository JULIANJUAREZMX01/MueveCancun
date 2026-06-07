import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import process from 'node:process';

const HOST = '127.0.0.1';
const PORT = process.env.DIST_SERVER_PORT ?? '4322';
const BASE_URL = `http://${HOST}:${PORT}`;
const ENTRYPOINT = 'dist/server/entry.mjs';
const ROUTES = new Map([
  ['/es/home', 'id="map-container"'],
  ['/es/tracking', 'id="tracking-map"'],
  ['/es/rutas', 'id="routes-grid"'],
  ['/es/guess', 'id="screen-start"'],
  ['/es/contribuir', 'id="contrib-form"'],
  ['/es/suscripcion', 'class="pricing-page"'],
]);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer(child, timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Generated server exited early with code ${child.exitCode}`);
    }

    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      if (response.ok) return;
    } catch {
      // The generated server is still starting.
    }

    await wait(250);
  }

  throw new Error(`Generated server did not start within ${timeoutMs}ms`);
}

async function validateRoutes() {
  await access(ENTRYPOINT);

  const server = spawn(process.execPath, [ENTRYPOINT], {
    env: { ...process.env, HOST, PORT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => process.stdout.write(`[dist-server] ${chunk}`));
  server.stderr.on('data', (chunk) => process.stderr.write(`[dist-server:error] ${chunk}`));

  try {
    await waitForServer(server);

    for (const [route, expectedMarkup] of ROUTES) {
      const response = await fetch(`${BASE_URL}${route}`, { redirect: 'manual' });
      if (response.status !== 200) {
        throw new Error(`${route} returned HTTP ${response.status}`);
      }
      const html = await response.text();
      if (!html.includes(expectedMarkup)) {
        throw new Error(`${route} did not include expected markup: ${expectedMarkup}`);
      }
      console.log(`[dist-routes] OK — ${route} returned HTTP 200 with expected markup`);
    }
  } finally {
    server.kill('SIGTERM');
  }
}

validateRoutes().catch((error) => {
  console.error('[dist-routes] FAIL:', error);
  process.exit(1);
});

import init, { load_catalog, find_route } from '../../public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

async function test() {
  const routesPath = path.join(ROOT, 'public/data/master_routes.optimized.json');
  const wasmPath = path.join(ROOT, 'public/wasm/route-calculator/route_calculator_bg.wasm');

  const routesJson = fs.readFileSync(routesPath, 'utf8');

  await init(fs.readFileSync(wasmPath));

  console.log('--- Initializing WASM ---');
  try {
    load_catalog(routesJson);
    console.log('Catalog loaded.');
  } catch (e) {
    console.error('FAIL: Error loading catalog:', e);
    process.exit(1);
  }

  console.log('--- Testing Route Finding ---');

  // Test 1: Direct Route
  console.log('Test 1: La Rehoyada -> El Crucero');
  const result1 = find_route("La Rehoyada / Villas Otoch (Origenes)", "El Crucero");
  if (result1 && result1.length > 0) {
      console.log('PASS: Found', result1.length, 'routes.');
  } else {
      console.log('FAIL: No routes found.');
  }

  console.log('--- Test Complete ---');
}

test().catch(console.error);

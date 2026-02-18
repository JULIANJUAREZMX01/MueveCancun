import init, { find_route, load_catalog } from './public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';

async function test() {
  console.log('--- Verifying Route Calculator ---');

  // Load WASM
  const wasmBuffer = fs.readFileSync('./public/wasm/route-calculator/route_calculator_bg.wasm');
  await init(wasmBuffer);
  console.log('✅ WASM initialized');

  // Load Catalog
  const routesData = JSON.parse(fs.readFileSync('./public/data/master_routes.json', 'utf8'));
  load_catalog(JSON.stringify(routesData));
  console.log('✅ Catalog loaded');

  // Test Transfer Route (Villas Otoch -> Muelle Ultramar)
  try {
      const origin = "Villas Otoch";
      const dest = "Muelle Ultramar";
      console.log(`🔍 Searching route: ${origin} -> ${dest}`);

      const results = find_route(origin, dest);

      if (Array.isArray(results)) {
          console.log(`✅ Success! Found ${results.length} routes.`);
          if (results.length > 0) {
              console.log('First route type:', results[0].type);
              console.log('Legs:', results[0].legs.map(l => l.id));
              console.log('Transfer at:', results[0].transfer_point);
          } else {
              console.warn("⚠️ No routes found. Check catalog data.");
          }
      } else {
          console.error('❌ Expected array result, got:', results);
      }
  } catch (e) {
      console.error('❌ Calculation failed:', e);
      process.exit(1);
  }
}

test().catch(e => {
    console.error(e);
    process.exit(1);
});

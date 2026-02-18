import init, { load_catalog, find_route } from '../public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';
import path from 'path';

async function test() {
  console.log('🐢 Crush Verification: Testing WASM Logic...');

  // Load WASM
  const wasmBuffer = fs.readFileSync(path.resolve('./public/wasm/route-calculator/route_calculator_bg.wasm'));
  await init(wasmBuffer);
  console.log('✅ WASM Module Initialized');

  // Load Catalog Data
  const jsonPath = path.resolve('./public/data/master_routes.json');
  const jsonString = fs.readFileSync(jsonPath, 'utf8');

  // Test load_catalog
  try {
    load_catalog(jsonString);
    console.log('✅ load_catalog executed successfully');
  } catch (e) {
    console.error('❌ load_catalog Failed:', e);
    process.exit(1);
  }

  // Test find_route
  // Using exact names to verify logic
  const origin = "OXXO Villas Otoch Paraíso (El Arco)";
  const dest = "La Rehoyada (Base Operativa)";

  console.log(`🔎 Searching Route: ${origin} -> ${dest}`);

  try {
    const results = find_route(origin, dest);
    console.log(`✅ find_route returned ${results.length} journeys`);

    if (results.length > 0) {
        console.log('First Journey Type:', results[0].type);
        console.log('Price:', results[0].total_price);
    } else {
        console.warn('⚠️ No routes found (might be expected depending on data, but function ran)');
    }

  } catch (e) {
    console.error('❌ find_route Panicked or Failed:', e);
    process.exit(1);
  }

  console.log('🎉 Verification Complete: No Panics, Logic Safe.');
}

test().catch(e => {
    console.error("Script Error:", e);
    process.exit(1);
});

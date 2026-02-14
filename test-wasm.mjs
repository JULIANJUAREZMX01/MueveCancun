import init, { load_catalog, find_route } from './public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';

async function test() {
  // Read raw JSON string (simulating fetch response.text())
  const routesData = fs.readFileSync('./public/data/master_routes.json', 'utf8');

  // Initialize WASM with binary buffer
  await init(fs.readFileSync('./public/wasm/route-calculator/route_calculator_bg.wasm'));

  console.log('--- 🐢 Crush.yaml: Testing Decoupled WASM ---');

  // 1. Load Catalog (The Decoupling Test)
  try {
      console.time("Load Catalog");
      load_catalog(routesData);
      console.timeEnd("Load Catalog");
      console.log('✅ Catalog Loaded Successfully (No panic!)');
  } catch (e) {
      console.error('❌ Catalog Load Failed (Wipeout!):', e);
      process.exit(1);
  }

  // 2. Test Route Finding (Logic Test)
  // Using known stops from master_routes.json (assuming it has data)
  const origin = "El Crucero";
  const dest = "Zona Hotelera";

  console.log(`🔍 Searching: ${origin} -> ${dest}`);
  const result = find_route(origin, dest);

  if (result && result.length > 0) {
      console.log(`✅ Found ${result.length} routes!`);
      const best = result[0];
      console.log(`🏆 Best Route: [${best.type}] ${best.legs.map(l => l.name).join(' -> ')}`);
      console.log(`💰 Price: $${best.total_price}`);
  } else {
      console.log('⚠️ No routes found. (Check data/stops names)');
  }

  console.log('--- Test Complete: Fin, Noggin, Dude. ---');
}

test().catch(console.error);

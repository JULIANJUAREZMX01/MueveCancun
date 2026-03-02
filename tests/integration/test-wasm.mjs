import init, { load_catalog, find_route } from './public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';

async function test() {
  const routesJson = fs.readFileSync('./public/data/master_routes.json', 'utf8');

  await init(fs.readFileSync('./public/wasm/route-calculator/route_calculator_bg.wasm'));

  console.log('--- Initializing WASM ---');
  load_catalog(routesJson);
  console.log('Catalog loaded.');

  console.log('--- Testing Route Finding ---');

  // Test 1: Direct Route
  // "La Rehoyada (Base Operativa)" -> "El Crucero"
  console.log('Test 1: La Rehoyada -> El Crucero');
  const result1 = find_route("La Rehoyada", "El Crucero");
  if (result1 && result1.length > 0) {
      console.log('PASS: Found', result1.length, 'routes.');
      console.log('First route type:', result1[0].type);
  } else {
      console.log('FAIL: No routes found.');
  }

  // Test 2: Transfer Route
  // "OXXO Villas Otoch Paraíso (El Arco)" (R2) -> "Playa del Niño" (CR Puerto Juarez)
  // Transfer at El Crucero or Las Americas? R2 goes to Crucero?
  // R2 stops: Villas Otoch, Chedraui Lakin, Av. Kabah, Plaza Las Américas, Entrada ZH, ZH.
  // It does NOT stop at El Crucero explicitly in the list I saw?

  // Wait, R2_94_VILLAS_OTOCH_001 stops:
  // 1. OXXO Villas Otoch Paraíso (El Arco)
  // 2. Chedraui Lakin / Av. Talleres
  // 3. Av. Kabah (Ruta 4)
  // 4. Plaza Las Américas (Kabah)
  // ...

  // It does NOT listed "El Crucero".

  // Let's use "Plaza Las Américas".
  // R10 stops at "Plaza Las Américas".
  // R10 goes to Airport.

  // Search: "OXXO Villas Otoch Paraíso (El Arco)" -> "T2 Aeropuerto"
  // Should be Transfer: R2 -> Plaza Las Américas -> R10 -> Airport.

  console.log('Test 2: Villas Otoch -> Airport T2');
  const result2 = find_route("OXXO Villas Otoch Paraíso", "T2 Aeropuerto");
  if (result2 && result2.length > 0) {
      console.log('PASS: Found', result2.length, 'routes.');
      const transfer = result2.find(r => r.type === 'Transfer');
      if (transfer) {
          console.log('PASS: Transfer route found via:', transfer.transfer_point);
      } else {
          console.log('WARN: Only direct routes found?');
      }
  } else {
      console.log('FAIL: No routes found.');
  }

  console.log('--- Test Complete ---');
}

test().catch(console.error);

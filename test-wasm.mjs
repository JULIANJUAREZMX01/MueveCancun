import init, { calculate_route } from './public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';

async function test() {
  const routesData = JSON.parse(fs.readFileSync('./public/data/master_routes.json', 'utf8'));

  await init(fs.readFileSync('./public/wasm/route-calculator/route_calculator_bg.wasm'));

  console.log('--- Testing Airport Gatekeeper ---');

  // Test 1: ADO to Airport (should have NO warning)
  // Terminal ADO Centro: 21.1586, -86.8259
  // Aeropuerto Terminal 2: 21.0417, -86.8761
  const result1 = calculate_route(21.1586, -86.8259, 21.0417, -86.8761, routesData);
  console.log('Test 1 (ADO to Airport):', result1.airport_warning ? 'FAIL (Warning found)' : 'PASS (No warning)');
  if (result1.airport_warning) console.log('Warning:', result1.airport_warning.es);

  // Test 2: Bus to Airport (should have warning)
  // Walmart: 21.1595, -86.8365
  // Aeropuerto Terminal 2: 21.0417, -86.8761
  const result2 = calculate_route(21.1595, -86.8365, 21.0417, -86.8761, routesData);
  console.log('Test 2 (Bus to Airport):', result2.airport_warning ? 'PASS (Warning found)' : 'FAIL (No warning)');
  if (result2.airport_warning) console.log('Warning:', result2.airport_warning.es);

  console.log('--- Test Complete ---');
}

test().catch(console.error);

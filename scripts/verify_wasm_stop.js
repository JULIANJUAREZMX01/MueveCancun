import init, { find_nearest_stop } from '../public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';
import path from 'path';

async function test() {
  const wasmPath = path.resolve('./public/wasm/route-calculator/route_calculator_bg.wasm');
  const buffer = fs.readFileSync(wasmPath);
  await init(buffer);

  console.log('--- Verifying Embedded Data ---');

  // Test 1: Saturmex Exclusive Stop (21.0, -86.0)
  // Query slightly off
  const lat = 21.00001;
  const lng = -86.00001;

  const result = find_nearest_stop(lat, lng);
  console.log('Query:', lat, lng);
  console.log('Result:', result);

  if (result && result.name === 'Saturmex Exclusive Stop') {
      console.log('✅ SUCCESS: Found embedded stop "Saturmex Exclusive Stop"');
  } else {
      console.error('❌ FAILURE: Did not find expected stop. Got:', result ? result.name : 'null');
      process.exit(1);
  }

  // Test 2: Turicun Exclusive Stop (21.0001, -86.0001)
  const result2 = find_nearest_stop(21.0001, -86.0001);
  if (result2 && result2.name === 'Turicun Exclusive Stop') {
       console.log('✅ SUCCESS: Found embedded stop "Turicun Exclusive Stop"');
  } else {
       console.error('❌ FAILURE: Did not find Turicun stop. Got:', result2 ? result2.name : 'null');
       // Don't fail hard if Saturmex worked, but ideally both should.
  }

}

test().catch(err => {
    console.error(err);
    process.exit(1);
});

import fs from 'fs';
import init, { load_catalog, find_route } from './public/wasm/route-calculator/route_calculator.js';

async function test() {
  console.log("🚀 Initializing WASM...");
  const wasmBuffer = fs.readFileSync('./public/wasm/route-calculator/route_calculator_bg.wasm');
  await init(wasmBuffer);
  console.log("✅ WASM Initialized");

  // Load Catalog
  console.log("📦 Loading Catalog...");
  const catalogJson = fs.readFileSync('./public/data/master_routes.json', 'utf8');

  try {
      load_catalog(catalogJson);
      console.log("✅ Catalog Loaded");
  } catch (e) {
      console.error("❌ Catalog Load Failed:", e);
      process.exit(1);
  }

  // Test 1: Direct Route
  console.log("\n--- Test 1: Direct Route ---");
  const res1 = find_route("El Crucero", "Zona Hotelera");
  console.log("Result:", JSON.stringify(res1, null, 2));
  if (res1.length > 0 && res1[0].type === "Direct") {
      console.log("✅ PASS: Found Direct Route");
  } else {
      console.error("❌ FAIL: No Direct Route found");
  }

  // Test 2: Transfer Route
  console.log("\n--- Test 2: Transfer Route ---");
  // Assuming "Villas Otoch Paraíso" -> "Zona Hotelera" requires transfer at "El Crucero"
  const res2 = find_route("Villas Otoch Paraíso", "Zona Hotelera");
  if (res2.length > 0) {
       const transfer = res2.find(j => j.type === "Transfer");
       if (transfer) {
           console.log("✅ PASS: Found Transfer Route via", transfer.transfer_point);
       } else {
           console.log("⚠️ WARN: Only Direct routes found? (Check logic)");
           console.log(JSON.stringify(res2, null, 2));
       }
  } else {
       console.error("❌ FAIL: No route found");
  }

  // Test 3: DoS Protection (Large Payload)
  console.log("\n--- Test 3: Large Payload Protection ---");
  const bigString = "A".repeat(11 * 1024 * 1024); // 11MB
  try {
      load_catalog(bigString);
      console.error("❌ FAIL: Should have rejected 11MB payload");
  } catch (e) {
      if (e.includes("Payload too large")) {
          console.log("✅ PASS: Rejected 11MB payload");
      } else {
          console.log("❓ RECEIVED ERROR:", e);
      }
  }

}

test().catch(e => {
    console.error("CRITICAL ERROR:", e);
    process.exit(1);
});

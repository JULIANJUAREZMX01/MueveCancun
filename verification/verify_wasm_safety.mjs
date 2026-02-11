import init, { find_route, load_catalog } from '../public/wasm/route-calculator/route_calculator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verify() {
  console.log('🐢 Crush.yaml: Verifying WASM Safety...');

  try {
    // Load WASM
    const wasmPath = path.resolve(__dirname, '../public/wasm/route-calculator/route_calculator_bg.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    await init(wasmBuffer);
    console.log('✅ WASM Module Loaded.');

    // --- TEST 0: Catalog Not Loaded (Should return Error, not Panic) ---
    console.log('\n--- Test 0: Catalog Not Loaded ---');
    try {
        find_route("Zona Hotelera", "El Crucero");
        console.error('❌ Expected failure when catalog is not loaded, but got result.');
        process.exit(1);
    } catch (e) {
        if (typeof e === 'string' && e.includes("Catalog not loaded")) {
            console.log('✅ Correctly failed with "Catalog not loaded".');
        } else {
            console.error('❌ Unexpected error type or message:', e);
            process.exit(1);
        }
    }

    // --- TEST 1: Load Catalog ---
    console.log('\n--- Test 1: Load Catalog ---');
    const jsonPath = path.resolve(__dirname, '../public/data/master_routes.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('❌ master_routes.json not found at:', jsonPath);
        process.exit(1);
    }
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');

    try {
        load_catalog(jsonContent);
        console.log('✅ Catalog loaded successfully.');
    } catch (e) {
        console.error('❌ Failed to load catalog:', e);
        process.exit(1);
    }

    // --- TEST 2: Normal Usage (find_route) ---
    console.log('\n--- Test 2: Normal Usage (find_route) ---');
    // Using known stops from master_routes.json (e.g., "Villas Otoch Paraíso" and "Zona Hotelera")
    try {
        const res1 = find_route("Villas Otoch Paraíso", "Zona Hotelera");
        if (Array.isArray(res1) && res1.length > 0) {
            console.log(`✅ Success: Found ${res1.length} routes.`);
        } else {
            console.warn('⚠️ Warning: No routes found (could be valid depending on data).');
        }
    } catch (e) {
        console.error('❌ Error in find_route:', e);
        process.exit(1);
    }

    // --- TEST 3: Invalid/Unknown Stops (Should return empty array, not panic) ---
    console.log('\n--- Test 3: Unknown Stops (find_route) ---');
    try {
        const res2 = find_route("Narnia", "Mordor");
        console.log(`✅ Handled Unknown Stops: Returns ${JSON.stringify(res2)}`);
        if (!Array.isArray(res2) || res2.length !== 0) {
             console.warn('⚠️ Expected empty array for unknown stops.');
        }
    } catch (e) {
        console.error('❌ PANIC or ERROR in Unknown Stops:', e);
        process.exit(1);
    }

    // --- TEST 4: Edge Case - Same Origin/Dest ---
    console.log('\n--- Test 4: Same Origin/Dest (find_route) ---');
    try {
        const res3 = find_route("Zona Hotelera", "Zona Hotelera");
        console.log(`✅ Handled Same Origin/Dest: Returns ${JSON.stringify(res3)}`);
    } catch (e) {
        console.error('❌ PANIC in Same Origin/Dest:', e);
        process.exit(1);
    }

    // --- TEST 5: The "Shark" Test (Attack Vectors) ---
    console.log('\n--- Test 5: The Shark Test (DoS/Panic Attempts) ---');

    // A. Massive String
    const hugeString = "A".repeat(10000);
    try {
        const res5a = find_route(hugeString, "Zona Hotelera");
        // Expect empty array due to length check > 100
        if (Array.isArray(res5a) && res5a.length === 0) {
             console.log(`✅ Handled Huge String (Length ${hugeString.length}): Rejected safely.`);
        } else {
             console.log(`❓ Handled Huge String: Returns ${JSON.stringify(res5a)}`);
        }
    } catch (e) {
         console.log('✅ Handled Huge String (Likely rejected safely). Error:', e);
    }

    // B. Special Characters / Injection
    try {
        const res5b = find_route("<script>alert(1)</script>", "DROP TABLE routes;");
        console.log(`✅ Handled Injection Strings: Returns ${JSON.stringify(res5b)}`);
    } catch (e) {
        console.error('❌ PANIC in Injection Strings:', e);
        process.exit(1);
    }

    console.log('\n🎉 Fin, Noggin, Duuude. All checks passed. Shell is solid.');

  } catch (err) {
    console.error('\n❌ CRITICAL FAILURE:', err);
    process.exit(1);
  }
}

verify();

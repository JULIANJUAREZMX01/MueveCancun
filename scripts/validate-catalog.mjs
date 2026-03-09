import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'public/data/master_routes.json');
const optimizedFile = path.join(process.cwd(), 'public/data/master_routes.optimized.json');

function validateCatalog(filePath) {
    console.log(`🔍 Validating: ${path.basename(filePath)}`);
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        let errors = 0;

        // 1. Check Root structure
        if (!data.rutas || !Array.isArray(data.rutas)) {
            console.error(`❌ Validation failed: Missing 'rutas' array at root.`);
            errors++;
        }

        if (data.metadata && typeof data.metadata !== 'object') {
             console.error(`❌ Validation failed: 'metadata' is not an object.`);
             errors++;
        }

        // 2. Validate Routes
        if (data.rutas && Array.isArray(data.rutas)) {
             data.rutas.forEach((route, index) => {
                 if (!route.id) {
                     console.error(`❌ Route [${index}] missing 'id'.`);
                     errors++;
                 }
                 if (!route.nombre) {
                      console.error(`❌ Route [${index}] missing 'nombre'.`);
                      errors++;
                 }
                 if (!route.paradas || !Array.isArray(route.paradas)) {
                     console.error(`❌ Route [${route.id || index}] missing 'paradas' array.`);
                     errors++;
                 } else {
                     // Check limits for DoS protection (as defined in Rust WASM)
                     if (route.paradas.length > 500) {
                         console.error(`❌ Route [${route.id}] exceeds max 500 stops (${route.paradas.length}).`);
                         errors++;
                     }
                     // Validate stops structure
                     route.paradas.forEach((stop, stopIndex) => {
                         if (!stop.nombre || typeof stop.lat !== 'number' || typeof stop.lng !== 'number') {
                             console.error(`❌ Route [${route.id}] Stop [${stopIndex}] malformed: ${JSON.stringify(stop)}`);
                             errors++;
                         }
                     });
                 }
             });

             // Check route limit
             if (data.rutas.length > 5000) {
                 console.error(`❌ Catalog exceeds max 5000 routes (${data.rutas.length}).`);
                 errors++;
             }
        }

        if (errors > 0) {
             console.error(`❌ Validation Failed with ${errors} errors.`);
             return false;
        }

        console.log(`✅ Schema valid. Evaluated ${data.rutas ? data.rutas.length : 0} routes.`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to parse or read JSON: ${err.message}`);
        return false;
    }
}

let pass = true;

if (fs.existsSync(inputFile)) {
    pass = validateCatalog(inputFile) && pass;
} else {
    console.warn(`⚠️ Warning: ${inputFile} not found.`);
}

if (fs.existsSync(optimizedFile)) {
    pass = validateCatalog(optimizedFile) && pass;
} else {
    console.warn(`⚠️ Warning: ${optimizedFile} not found.`);
}

if (!pass) {
    process.exit(1);
}

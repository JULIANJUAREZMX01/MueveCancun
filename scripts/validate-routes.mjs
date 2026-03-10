/**
 * validate-routes.mjs
 * Validates master_routes.json + all individual route files in public/data/routes/
 * Used by CI workflows and can be run locally: node scripts/validate-routes.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MASTER = path.join(ROOT, 'public/data/master_routes.json');
const ROUTES_DIR = path.join(ROOT, 'public/data/routes');

let totalErrors = 0;
let totalWarnings = 0;

function error(msg) {
    console.error(`  ❌ ${msg}`);
    totalErrors++;
}

function warn(msg) {
    console.warn(`  ⚠️  ${msg}`);
    totalWarnings++;
}

function validateRouteObject(route, source) {
    if (!route.id) error(`[${source}] Route missing 'id'`);
    if (!route.nombre) error(`[${source}] Route missing 'nombre'`);
    if (typeof route.tarifa !== 'number') warn(`[${source}] Route '${route.id}' missing numeric 'tarifa'`);
    if (!route.tipo && !route.tipo_transporte) warn(`[${source}] Route '${route.id}' missing 'tipo'`);

    const stops = route.paradas || [];
    if (!Array.isArray(stops) || stops.length === 0) {
        error(`[${source}] Route '${route.id}' has no 'paradas' array`);
        return;
    }
    if (stops.length > 500) {
        error(`[${source}] Route '${route.id}' exceeds 500 stops (${stops.length})`);
    }

    let missingCoords = 0;
    for (const [i, stop] of stops.entries()) {
        if (!stop.nombre) error(`[${source}] Route '${route.id}' Stop[${i}] missing 'nombre'`);
        if (typeof stop.lat !== 'number' || typeof stop.lng !== 'number') {
            missingCoords++;
        } else if (stop.lat === 0 && stop.lng === 0) {
            missingCoords++;
        }
    }
    if (missingCoords > 0) {
        const pct = ((missingCoords / stops.length) * 100).toFixed(0);
        warn(`[${source}] Route '${route.id}': ${missingCoords}/${stops.length} stops missing coords (${pct}%)`);
    }
}

// --- Validate master_routes.json ---
console.log('\n🔍 Validating master_routes.json…');
if (!fs.existsSync(MASTER)) {
    error('master_routes.json not found');
} else {
    try {
        const data = JSON.parse(fs.readFileSync(MASTER, 'utf8'));
        const routes = data.rutas || [];
        if (!Array.isArray(routes)) {
            error("master_routes.json missing 'rutas' array");
        } else {
            console.log(`   Found ${routes.length} routes`);
            if (routes.length > 5000) error(`Too many routes: ${routes.length} > 5000`);
            for (const r of routes) validateRouteObject(r, 'master_routes.json');
        }
        // Check for required metadata
        if (!data.metadata && !data.version) {
            warn("master_routes.json missing 'metadata' or 'version'");
        }
    } catch (e) {
        error(`master_routes.json JSON parse error: ${e.message}`);
    }
}

// --- Validate individual route files ---
if (fs.existsSync(ROUTES_DIR)) {
    const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.json'));
    console.log(`\n🔍 Validating ${files.length} individual route files in public/data/routes/…`);
    for (const file of files) {
        const filePath = path.join(ROUTES_DIR, file);
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            // Individual files can be a single route object OR an array
            const routes = Array.isArray(data) ? data : (data.rutas || [data]);
            for (const r of routes) {
                if (r && r.id) validateRouteObject(r, file);
            }
        } catch (e) {
            error(`${file}: JSON parse error: ${e.message}`);
        }
    }
}

// --- Summary ---
console.log('\n' + '─'.repeat(50));
console.log(`Summary: ${totalErrors} error(s), ${totalWarnings} warning(s)`);
if (totalErrors > 0) {
    console.error(`\n❌ Validation FAILED with ${totalErrors} error(s)`);
    process.exit(1);
} else {
    console.log('\n✅ All route data valid');
}

/**
 * merge-routes.mjs
 *
 * AUTONOMY LAYER: Merges all individual route files in public/data/routes/
 * into master_routes.json. Run before optimize-json.mjs on every build.
 *
 * Rules:
 *  - Individual files in routes/ WIN over same ID in master (they're more recent).
 *  - Routes without 'id' are skipped with a warning.
 *  - Duplicate IDs across individual files: last-modified file wins.
 *  - Routes with 0 stops are skipped with a warning.
 *  - Does NOT delete routes from master that have no individual file.
 *
 * Usage:
 *   node scripts/merge-routes.mjs [--dry-run] [--verbose]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MASTER_PATH = path.join(ROOT, 'public/data/master_routes.json');
const ROUTES_DIR  = path.join(ROOT, 'public/data/routes');
const INDEX_PATH  = path.join(ROOT, 'public/data/routes-index.json');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

function log(...args)  { console.log(...args); }
function info(...args) { if (VERBOSE) console.log(' ', ...args); }
function warn(...args) { console.warn('  ⚠️ ', ...args); }

// ---------- Load master ----------
log('🔀 merge-routes.mjs — Merging route catalog…');
if (DRY_RUN) log('   (DRY RUN — no files will be written)');

let master;
try {
  master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
} catch (e) {
  console.error('❌ Cannot read master_routes.json:', e.message);
  process.exit(1);
}

// Build index of existing master routes: id → route object
const masterMap = new Map();
for (const r of (master.rutas || [])) {
  if (r.id) masterMap.set(r.id, r);
}

// ---------- Load individual route files ----------
const routeFiles = fs.existsSync(ROUTES_DIR)
  ? fs.readdirSync(ROUTES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(ROUTES_DIR, f),
        mtime: fs.statSync(path.join(ROUTES_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => a.mtime - b.mtime) // older first → newer overwrite
  : [];

log(`   master: ${masterMap.size} routes`);
log(`   routes/: ${routeFiles.length} files`);

let merged = 0, skipped = 0, updated = 0, added = 0;

// Track which route files we include (for routes-index.json)
const indexEntries = [];

for (const file of routeFiles) {
  let raw;
  try {
    raw = fs.readFileSync(file.path, 'utf8');
  } catch (e) {
    warn(`Cannot read ${file.name}: ${e.message}`);
    skipped++;
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    warn(`JSON parse error in ${file.name}: ${e.message}`);
    skipped++;
    continue;
  }

  // Normalize: individual files can be a route object, array, or {rutas:[...]}
  let routes = [];
  if (Array.isArray(parsed)) {
    routes = parsed;
  } else if (parsed.rutas && Array.isArray(parsed.rutas)) {
    routes = parsed.rutas;
  } else if (parsed.id) {
    routes = [parsed];
  } else {
    warn(`${file.name}: Unrecognized format — skipping`);
    skipped++;
    continue;
  }

  for (const route of routes) {
    if (!route || !route.id) {
      warn(`${file.name}: Route missing 'id' — skipping`);
      skipped++;
      continue;
    }

    const stops = route.paradas || route.stops || [];
    if (stops.length === 0) {
      warn(`${file.name}: Route '${route.id}' has no stops — skipping`);
      skipped++;
      continue;
    }

    // Normalize field names (paradas is canonical)
    if (!route.paradas && route.stops) {
      route.paradas = route.stops;
      delete route.stops;
    }

    if (masterMap.has(route.id)) {
      info(`Updated: ${route.id} (from ${file.name})`);
      updated++;
    } else {
      info(`Added:   ${route.id} (from ${file.name})`);
      added++;
    }

    masterMap.set(route.id, route);
  }

  // Register file in index
  indexEntries.push({
    file: `routes/${file.name}`,
    ids: routes.filter(r => r?.id).map(r => r.id),
    mtime: new Date(file.mtime).toISOString(),
  });

  merged++;
}

// Rebuild master.rutas from merged map (preserve order: master first, then new)
const finalRoutes = Array.from(masterMap.values());

const updatedMaster = {
  ...master,
  rutas: finalRoutes,
  metadata: {
    ...(master.metadata || {}),
    last_merged: new Date().toISOString(),
    source: `merge-routes.mjs (${finalRoutes.length} routes from ${routeFiles.length} files)`,
  },
};

// ---------- Write outputs ----------
if (!DRY_RUN) {
  fs.writeFileSync(MASTER_PATH, JSON.stringify(updatedMaster, null, 2));

  // routes-index.json — consumed by SW and RouteCalculator at runtime
  const index = {
    generated: new Date().toISOString(),
    count: indexEntries.reduce((a, e) => a + e.ids.length, 0),
    files: indexEntries,
  };
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  log(`✅ master_routes.json: ${finalRoutes.length} total routes`);
  log(`   +${added} added  ~${updated} updated  ✗${skipped} skipped`);
  log(`✅ routes-index.json: ${indexEntries.length} file entries`);
} else {
  log(`[DRY] Would write ${finalRoutes.length} routes to master_routes.json`);
  log(`[DRY] Would write routes-index.json with ${indexEntries.length} entries`);
}

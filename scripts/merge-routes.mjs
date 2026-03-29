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

    // Normalize frecuencia_minutos to an integer
    if (typeof route.frecuencia_minutos === 'string') {
      const parsed = parseInt(route.frecuencia_minutos.replace(/\D/g, ''), 10);
      route.frecuencia_minutos = isNaN(parsed) ? 10 : parsed;
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

// ---------- Detect content changes (ignore volatile timestamps) ----------
// Strips fields that change on every run but carry no semantic information,
// so we can compare whether the *actual* data changed.
function stripVolatileMeta(obj) {
  const c = structuredClone(obj);
  if (c.metadata) {
    delete c.metadata.last_merged;
    delete c.metadata.source;
  }
  return c;
}

let masterNeedsWrite = true;
let finalLastMerged = new Date().toISOString();
let finalSource = `merge-routes.mjs (${finalRoutes.length} routes from ${routeFiles.length} files)`;

if (fs.existsSync(MASTER_PATH)) {
  try {
    const existing = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
    const candidate = { ...master, rutas: finalRoutes, metadata: { ...(master.metadata || {}) } };
    if (JSON.stringify(stripVolatileMeta(candidate)) === JSON.stringify(stripVolatileMeta(existing))) {
      // Route data unchanged — reuse existing timestamps to keep the file clean
      finalLastMerged = existing.metadata?.last_merged ?? finalLastMerged;
      finalSource     = existing.metadata?.source     ?? finalSource;
      masterNeedsWrite = false;
      info('master_routes.json content unchanged — skipping write');
    }
  } catch (e) {
    // JSON parse error or missing file: fall through to a normal write
  }
}

const updatedMaster = {
  ...master,
  rutas: finalRoutes,
  metadata: {
    ...(master.metadata || {}),
    last_merged: finalLastMerged,
    source: finalSource,
  },
};

// For routes-index.json: only rewrite when file list or route IDs actually changed.
// Preserving existing mtimes/generated avoids phantom diffs caused by filesystem
// touch-times changing without any real route-data change.
let indexNeedsWrite = true;
let finalIndexEntries = indexEntries;
let finalIndexGenerated = new Date().toISOString();

if (fs.existsSync(INDEX_PATH)) {
  try {
    const existingIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    const stripMtimes = (entries) => entries.map(e => ({ file: e.file, ids: e.ids }));
    if (JSON.stringify(stripMtimes(indexEntries)) === JSON.stringify(stripMtimes(existingIndex.files || []))) {
      finalIndexEntries  = existingIndex.files;
      finalIndexGenerated = existingIndex.generated;
      indexNeedsWrite = false;
      info('routes-index.json content unchanged — skipping write');
    }
  } catch (e) {
    // Fall through to a normal write
  }
}

// ---------- Write outputs ----------
if (!DRY_RUN) {
  if (masterNeedsWrite) {
    fs.writeFileSync(MASTER_PATH, JSON.stringify(updatedMaster, null, 2));
    log(`✅ master_routes.json: ${finalRoutes.length} total routes`);
    log(`   +${added} added  ~${updated} updated  ✗${skipped} skipped`);
  } else {
    log(`✅ master_routes.json: unchanged (${finalRoutes.length} routes) — not rewritten`);
  }

  if (indexNeedsWrite) {
    const index = {
      generated: finalIndexGenerated,
      count: finalIndexEntries.reduce((a, e) => a + e.ids.length, 0),
      files: finalIndexEntries,
    };
    fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
    log(`✅ routes-index.json: ${finalIndexEntries.length} file entries`);
  } else {
    log(`✅ routes-index.json: unchanged — not rewritten`);
  }
} else {
  log(`[DRY] Would write ${finalRoutes.length} routes to master_routes.json`);
  log(`[DRY] Would write routes-index.json with ${indexEntries.length} entries`);
}

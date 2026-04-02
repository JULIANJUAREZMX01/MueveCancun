/**
 * merge-routes.ts
 *
 * AUTONOMY LAYER: Merges all individual route files in public/data/routes/
 * into master_routes.json. Run before optimize-json.ts on every build.
 *
 * Rules:
 *  - Individual files in routes/ WIN over same ID in master (they're more recent).
 *  - Routes without 'id' are skipped with a warning.
 *  - Duplicate IDs across individual files: last-modified file wins.
 *  - Routes with 0 stops are skipped with a warning.
 *  - Does NOT delete routes from master that have no individual file.
 *
 * Usage:
 *   node --experimental-strip-types scripts/merge-routes.ts [--dry-run] [--verbose]
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

function log(...args: unknown[]): void  { console.log(...args); }
function info(...args: unknown[]): void { if (VERBOSE) console.log(' ', ...args); }
function warn(...args: unknown[]): void { console.warn('  ⚠️ ', ...args); }

interface RouteRecord {
    id?: string;
    paradas?: unknown[];
    stops?: unknown[];
    frecuencia_minutos?: unknown;
    [key: string]: unknown;
}

interface MasterCatalog {
    rutas?: RouteRecord[];
    metadata?: {
        last_merged?: string;
        source?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface RouteFile {
    name: string;
    path: string;
    mtime: number;
}

interface IndexEntry {
    file: string;
    ids: string[];
    mtime: string;
}

interface IndexFile {
    generated: string;
    count: number;
    files: IndexEntry[];
}

// ---------- Load master ----------
log('🔀 merge-routes.ts — Merging route catalog…');
if (DRY_RUN) log('   (DRY RUN — no files will be written)');

let master: MasterCatalog;
try {
  master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as MasterCatalog;
} catch (e: unknown) {
  console.error('❌ Cannot read master_routes.json:', (e as Error).message);
  process.exit(1);
}

// Build index of existing master routes: id → route object
const masterMap = new Map<string, RouteRecord>();
for (const r of (master.rutas || [])) {
  if (r.id) masterMap.set(r.id, r);
}

// ---------- Load individual route files ----------
const routeFiles: RouteFile[] = fs.existsSync(ROUTES_DIR)
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
const indexEntries: IndexEntry[] = [];

for (const file of routeFiles) {
  let raw: string;
  try {
    raw = fs.readFileSync(file.path, 'utf8');
  } catch (e: unknown) {
    warn(`Cannot read ${file.name}: ${(e as Error).message}`);
    skipped++;
    continue;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e: unknown) {
    warn(`JSON parse error in ${file.name}: ${(e as Error).message}`);
    skipped++;
    continue;
  }

  // Normalize: individual files can be a route object, array, or {rutas:[...]}
  let routes: RouteRecord[] = [];
  if (Array.isArray(parsed)) {
    routes = parsed as RouteRecord[];
  } else if (parsed && typeof parsed === 'object' && 'rutas' in parsed && Array.isArray((parsed as MasterCatalog).rutas)) {
    routes = (parsed as MasterCatalog).rutas!;
  } else if (parsed && typeof parsed === 'object' && 'id' in parsed) {
    routes = [parsed as RouteRecord];
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
    if (!Array.isArray(stops) || stops.length === 0) {
      warn(`${file.name}: Route '${route.id}' has no stops — skipping`);
      skipped++;
      continue;
    }

    // Normalize field names (paradas is canonical)
    if (!route.paradas && route.stops) {
      route.paradas = route.stops as RouteRecord[];
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
    ids: routes.filter(r => r?.id).map(r => r.id!),
    mtime: new Date(file.mtime).toISOString(),
  });

  merged++;
}

// Rebuild master.rutas from merged map (preserve order: master first, then new)
const finalRoutes = Array.from(masterMap.values());

// ---------- Detect content changes (ignore volatile timestamps) ----------
function stripVolatileMeta(obj: MasterCatalog): MasterCatalog {
  const c = structuredClone(obj);
  if (c.metadata) {
    delete c.metadata.last_merged;
    delete c.metadata.source;
  }
  return c;
}

let masterNeedsWrite = true;
let finalLastMerged = new Date().toISOString();
let finalSource = `merge-routes.ts (${finalRoutes.length} routes from ${routeFiles.length} files)`;

if (fs.existsSync(MASTER_PATH)) {
  try {
    const existing = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as MasterCatalog;
    const candidate: MasterCatalog = { ...master, rutas: finalRoutes, metadata: { ...(master.metadata || {}) } };
    if (JSON.stringify(stripVolatileMeta(candidate)) === JSON.stringify(stripVolatileMeta(existing))) {
      finalLastMerged = existing.metadata?.last_merged ?? finalLastMerged;
      finalSource     = existing.metadata?.source     ?? finalSource;
      masterNeedsWrite = false;
      info('master_routes.json content unchanged — skipping write');
    }
  } catch { /* JSON parse error or missing file: fall through to a normal write */ }
}

const updatedMaster: MasterCatalog = {
  ...master,
  rutas: finalRoutes,
  metadata: {
    ...(master.metadata || {}),
    last_merged: finalLastMerged,
    source: finalSource,
  },
};

// For routes-index.json: only rewrite when file list or route IDs actually changed.
let indexNeedsWrite = true;
let finalIndexEntries = indexEntries;
let finalIndexGenerated = new Date().toISOString();

if (fs.existsSync(INDEX_PATH)) {
  try {
    const existingIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) as IndexFile;
    const stripMtimes = (entries: IndexEntry[]) => entries.map(e => ({ file: e.file, ids: e.ids }));
    if (JSON.stringify(stripMtimes(indexEntries)) === JSON.stringify(stripMtimes(existingIndex.files || []))) {
      finalIndexEntries  = existingIndex.files;
      finalIndexGenerated = existingIndex.generated;
      indexNeedsWrite = false;
      info('routes-index.json content unchanged — skipping write');
    }
  } catch { /* Fall through to a normal write */ }
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
    const index: IndexFile = {
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
  log(`[DRY] Merged ${merged} file(s), +${added} added  ~${updated} updated  ✗${skipped} skipped`);
}

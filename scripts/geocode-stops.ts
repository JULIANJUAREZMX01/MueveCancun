/**
 * geocode-stops.ts
 *
 * AUTONOMY LAYER: Auto-fills missing lat/lng coordinates for stops in
 * master_routes.json using OpenStreetMap Nominatim (free, no API key needed).
 *
 * Rules:
 *  - Only geocodes stops with lat=0 AND lng=0 (or missing both).
 *  - Rate-limits to 1 request/second (Nominatim TOS).
 *  - Appends ", Cancún, México" to each stop name for context.
 *  - Writes results back to master_routes.json.
 *  - Dry-run mode: prints what would be geocoded without writing.
 *
 * Usage:
 *   node --experimental-strip-types scripts/geocode-stops.ts [--dry-run] [--verbose] [--limit=50]
 *
 * Note: Results may be approximate. Always verify critical stops manually.
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MASTER_PATH = path.join(ROOT, 'public/data/master_routes.json');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='));
const parsedLimit = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1] ?? '100', 10) : 100;
const MAX_GEOCODE = isNaN(parsedLimit) ? 100 : parsedLimit;
const DELAY_MS = 1100; // > 1s required by Nominatim TOS

function log(...a: unknown[]): void  { console.log(...a); }
function info(...a: unknown[]): void { if (VERBOSE) console.log('  ', ...a); }
function warn(...a: unknown[]): void { console.warn('  ⚠️ ', ...a); }

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

interface Coords {
    lat: number;
    lng: number;
}

interface NominatimResult {
    lat: string;
    lon: string;
}

function nominatimFetch(stopName: string): Promise<Coords | null> {
  const q = encodeURIComponent(`${stopName}, Cancún, Quintana Roo, México`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=mx`;

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'MueveCancun-AutoGeocode/1.0 (https://github.com/JULIANJUAREZMX01/MueveCancun)' },
    }, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as NominatimResult[];
          if (parsed && parsed.length > 0 && parsed[0]) {
            resolve({ lat: parseFloat(parsed[0].lat), lng: parseFloat(parsed[0].lon) });
          } else {
            resolve(null); // Not found
          }
        } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

interface CatalogStop {
    nombre?: string;
    name?: string;
    lat?: number;
    lng?: number;
    _geocoded?: boolean;
    [key: string]: unknown;
}

interface CatalogRoute {
    paradas?: CatalogStop[];
    [key: string]: unknown;
}

interface MasterCatalog {
    rutas?: CatalogRoute[];
    metadata?: {
        last_geocoded?: string;
        geocoded_count?: number;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

function isMissingCoords(stop: CatalogStop): boolean {
  return (
    typeof stop.lat !== 'number' || typeof stop.lng !== 'number' ||
    (stop.lat === 0 && stop.lng === 0) ||
    isNaN(stop.lat) || isNaN(stop.lng)
  );
}

// ---------- Main ----------
log('🌐 geocode-stops.ts — Auto-filling missing coordinates…');
if (DRY_RUN) log('   (DRY RUN — no files will be written)');
log(`   Limit: ${MAX_GEOCODE} stops per run`);

let master: MasterCatalog;
try {
  master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8')) as MasterCatalog;
} catch (e: unknown) {
  console.error('❌ Cannot read master_routes.json:', (e as Error).message);
  process.exit(1);
}

// Collect stops needing geocoding (deduplicated by name)
const pendingStops = new Map<string, { ri: number; si: number }[]>();

for (const [ri, route] of (master.rutas || []).entries()) {
  for (const [si, stop] of (route.paradas || []).entries()) {
    if (isMissingCoords(stop)) {
      const name = stop.nombre ?? stop.name ?? '';
      if (!name.trim()) continue;
      if (!pendingStops.has(name)) pendingStops.set(name, []);
      pendingStops.get(name)!.push({ ri, si });
    }
  }
}

log(`   Found ${pendingStops.size} unique stops with missing coordinates`);

if (pendingStops.size === 0) {
  log('✅ All stops already have coordinates — nothing to do');
  process.exit(0);
}

let geocoded = 0, notFound = 0, errors = 0;
const resolvedNames = new Map<string, Coords>();

const stopNames = Array.from(pendingStops.keys()).slice(0, MAX_GEOCODE);

for (const [i, name] of stopNames.entries()) {
  log(`   [${i + 1}/${stopNames.length}] Geocoding: ${name}…`);

  if (DRY_RUN) {
    log(`   [DRY] Would geocode: "${name}"`);
    continue;
  }

  await sleep(DELAY_MS);

  try {
    const coords = await nominatimFetch(name);
    if (coords) {
      // Sanity check: must be within Cancún area
      if (coords.lat > 20.0 && coords.lat < 22.0 && coords.lng > -88.0 && coords.lng < -86.0) {
        resolvedNames.set(name, coords);
        info(`   ✅ Found: ${name} → ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        geocoded++;
      } else {
        warn(`Out-of-area result for "${name}" (${coords.lat}, ${coords.lng}) — skipping`);
        notFound++;
      }
    } else {
      info(`   ❌ Not found: ${name}`);
      notFound++;
    }
  } catch (e: unknown) {
    warn(`Error geocoding "${name}": ${(e as Error).message}`);
    errors++;
  }
}

if (!DRY_RUN && resolvedNames.size > 0) {
  // Apply resolved coordinates back to master
  let applied = 0;
  for (const route of (master.rutas || [])) {
    for (const stop of (route.paradas || [])) {
      const name = stop.nombre ?? stop.name ?? '';
      if (resolvedNames.has(name) && isMissingCoords(stop)) {
        const coords = resolvedNames.get(name)!;
        stop.lat = coords.lat;
        stop.lng = coords.lng;
        stop._geocoded = true; // Mark as auto-geocoded for review
        applied++;
      }
    }
  }

  master.metadata = {
    ...(master.metadata || {}),
    last_geocoded: new Date().toISOString(),
    geocoded_count: geocoded,
  };

  fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2));
  log(`\n✅ Applied ${applied} coordinates to master_routes.json`);
}

log(`\n📊 Geocoding summary:`);
log(`   ✅ Geocoded:  ${geocoded}`);
log(`   ❌ Not found: ${notFound}`);
log(`   ⚠️  Errors:    ${errors}`);
log(`   ⏭️  Skipped (limit): ${Math.max(0, pendingStops.size - MAX_GEOCODE)}`);

if (geocoded > 0 && !DRY_RUN) {
  log('\n💡 Tip: Run `node --experimental-strip-types scripts/validate-routes.ts` and `node --experimental-strip-types scripts/optimize-json.ts` after geocoding');
}

import { execSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Módulos críticos (app no funciona sin ellos) vs opcionales (feature flags)
const CRITICAL_MODULES  = ['route-calculator', 'spatial-index'];
const OPTIONAL_MODULES  = ['eta-engine', 'carbon-calculator'];
const ALL_MODULES = [...CRITICAL_MODULES, ...OPTIONAL_MODULES];

const isVercel = process.env.VERCEL === '1';
const isRender = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_ID;
const isCI = isVercel || isRender || process.env.GITHUB_ACTIONS === 'true';

function hasPrebuilt(mod) {
  const base = mod.replace(/-/g, '_');
  const bgWasm = path.join(rootDir, 'public', 'wasm', mod, `${base}_bg.wasm`);
  const js     = path.join(rootDir, 'public', 'wasm', mod, `${base}.js`);
  const exists = fs.existsSync(bgWasm) && fs.existsSync(js);
  console.log(`[WASM] ${mod}: ${exists ? '✅ prebuilt' : '❌ missing'}`);
  return exists;
}

function hasRust() {
  try { execSync('cargo --version', { stdio: 'pipe' }); return true; } catch { return false; }
}
function hasWasmPack() {
  try { execSync('wasm-pack --version', { stdio: 'pipe' }); return true; } catch { return false; }
}

function hasWasmTarget() {
  try {
    const out = execSync('rustup target list --installed', { stdio: 'pipe' }).toString();
    return out.includes('wasm32-unknown-unknown');
  } catch { return false; }
}

function buildModule(mod) {
  const outDir = path.join(rootDir, 'public', 'wasm', mod);
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const wasmPackArgs = ['build', path.join(rootDir, 'rust-wasm', mod), '--target', 'web', '--out-dir', outDir];
  try {
    execFileSync('wasm-pack', wasmPackArgs, { stdio: 'inherit' });
  } catch {
    execFileSync('npx', ['wasm-pack', ...wasmPackArgs], { stdio: 'inherit' });
  }

  const gi = path.join(outDir, '.gitignore');
  if (fs.existsSync(gi)) fs.unlinkSync(gi);
}

// ── Main logic ───────────────────────────────────────────────────────────

console.log('[WASM] Checking prebuilt artifacts...');
const missingCritical = CRITICAL_MODULES.filter(m => !hasPrebuilt(m));
const missingOptional = OPTIONAL_MODULES.filter(m => !hasPrebuilt(m));

// Prebuilt stubs for optional modules so imports don't fail at runtime
function createStub(mod) {
  const base = mod.replace(/-/g, '_');
  const outDir = path.join(rootDir, 'public', 'wasm', mod);
  if (fs.existsSync(outDir)) return; // already exists
  fs.mkdirSync(outDir, { recursive: true });
  // Minimal JS stub that exports empty functions
  fs.writeFileSync(path.join(outDir, `${base}.js`), `
// STUB — ${mod} not compiled
export async function default_() {}
export function get_version() { return '0.0.0-stub'; }
`);
  // Zero-byte wasm stub (valid enough for hasPrebuilt check)
  fs.writeFileSync(path.join(outDir, `${base}_bg.wasm`), Buffer.alloc(0));
  fs.writeFileSync(path.join(outDir, `${base}.d.ts`), `export function get_version(): string;`);
  fs.writeFileSync(path.join(outDir, `package.json`), JSON.stringify({ name: mod, version: '0.0.0', type: 'module' }));
  console.log(`[WASM] Created stub for optional module: ${mod}`);
}

// All prebuilt (including optionals)
if (missingCritical.length === 0 && missingOptional.length === 0) {
  console.log('[WASM] ✅ All modules prebuilt — skipping compilation.');
  process.exit(0);
}

// On Vercel/Render: stubs for optional, fatal for critical
if (isVercel || isRender) {
  for (const mod of missingOptional) createStub(mod);

  if (missingCritical.length > 0) {
    const canBuild = hasRust() && hasWasmPack() && hasWasmTarget();
    if (canBuild) {
      console.log('[WASM] Rust available in CI — compiling critical modules...');
      try {
        for (const mod of missingCritical) buildModule(mod);
        console.log('[WASM] ✅ Critical modules compiled.');
        process.exit(0);
      } catch (e) {
        console.error('[FATAL] Failed to compile critical WASM:', e.message);
        process.exit(1);
      }
    } else {
      console.error('[FATAL] Critical WASM missing and Rust not available:', missingCritical.join(', '));
      console.error('[FATAL] Commit public/wasm/route-calculator/ and public/wasm/spatial-index/ to the repo.');
      process.exit(1);
    }
  }

  console.log('[WASM] ✅ Build complete (optional modules stubbed).');
  process.exit(0);
}

// Local dev: try to compile everything available
const canBuild = hasRust() && hasWasmPack() && hasWasmTarget();
const missing = [...missingCritical, ...missingOptional];

if (canBuild) {
  console.log('[WASM] Compiling all missing modules locally...');
  for (const mod of missing) {
    try {
      buildModule(mod);
    } catch (e) {
      console.warn(`[WASM] ⚠️ Failed to build ${mod}:`, e.message);
      if (CRITICAL_MODULES.includes(mod)) {
        console.error('[FATAL] Critical module failed.');
        process.exit(1);
      } else {
        createStub(mod);
      }
    }
  }
  console.log('[WASM] ✅ Local build complete.');
} else {
  console.warn('[WASM] ⚠️ Rust/wasm-pack/wasm32 target not available locally.');
  for (const mod of missing) {
    if (CRITICAL_MODULES.includes(mod)) {
      console.error(`[FATAL] Critical module missing and cannot build: ${mod}`);
      process.exit(1);
    } else {
      createStub(mod);
    }
  }
  console.log('[WASM] Stubs created for optional modules. Critical modules prebuilt ✅');
}

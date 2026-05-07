import { execSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const modules = ['route-calculator', 'spatial-index', 'eta-engine', 'carbon-calculator'];

const isCI = process.env.GITHUB_ACTIONS === 'true' || process.env.VERCEL === '1' || process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_ID;
const isRenderOrVercel = process.env.VERCEL === '1' || process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_ID;

function hasPrebuilt(mod) {
  const bgWasm = path.join(rootDir, 'public', 'wasm', mod, mod.replace(/-/g, '_') + '_bg.wasm');
  const js     = path.join(rootDir, 'public', 'wasm', mod, mod.replace(/-/g, '_') + '.js');
  const exists = fs.existsSync(bgWasm) && fs.existsSync(js);
  if (exists) console.log(`[NEXUS_LOG] Found prebuilt: ${mod}`);
  else        console.log(`[NEXUS_LOG] Missing prebuilt: ${mod}`);
  return exists;
}

function allPrebuilt() {
  return modules.every(m => hasPrebuilt(m));
}

function hasRust() {
  try { execSync('cargo --version', { stdio: 'pipe' }); return true; } catch { return false; }
}

function hasWasmPack() {
  try { execSync('wasm-pack --version', { stdio: 'pipe' }); return true; } catch { return false; }
}

function buildModule(mod) {
  const outDir = path.join(rootDir, 'public', 'wasm', mod);
  if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[NEXUS_LOG] Compiling ${mod}...`);

  // Try npx wasm-pack first, then direct wasm-pack
  const wasmPackArgs = ['build', path.join(rootDir, 'rust-wasm', mod), '--target', 'web', '--out-dir', outDir];
  try {
    execFileSync('wasm-pack', wasmPackArgs, { stdio: 'inherit' });
  } catch {
    execFileSync('npx', ['wasm-pack', ...wasmPackArgs], { stdio: 'inherit' });
  }

  // Remove .gitignore so artifacts are visible
  const gi = path.join(outDir, '.gitignore');
  if (fs.existsSync(gi)) fs.unlinkSync(gi);
}

// --- Main logic ---

if (allPrebuilt()) {
  console.log('[NEXUS_LOG] All WASM artifacts prebuilt — skipping compilation.');
  process.exit(0);
}

// Some or all modules missing prebuilt artifacts
const missingModules = modules.filter(m => !hasPrebuilt(m));
console.log(`[NEXUS_LOG] Missing modules: ${missingModules.join(', ')}`);

// On Render/Vercel without Rust: fatal
if (isRenderOrVercel && !hasRust()) {
  console.error('[FATAL] Render/Vercel detected, no Rust available, and prebuilt WASM missing.');
  console.error('[FATAL] Commit compiled wasm files (public/wasm/**) or enable Rust in build environment.');
  process.exit(1);
}

// GitHub Actions with Rust available: compile missing modules
if (hasRust() && hasWasmPack()) {
  console.log('[NEXUS_LOG] Rust + wasm-pack available — compiling missing modules...');
  try {
    for (const mod of missingModules) {
      buildModule(mod);
    }
    console.log('[SUCCESS] All WASM modules compiled successfully.');
    process.exit(0);
  } catch (e) {
    console.error('[FATAL] WASM Compilation Failed.', e.message);
    process.exit(1);
  }
}

// Local dev with no Rust: try to compile anyway
try {
  console.log('[NEXUS_LOG] Attempting compilation (local dev)...');
  for (const mod of missingModules) {
    buildModule(mod);
  }
  console.log('[SUCCESS] WASM Engine Ready.');
} catch (e) {
  console.error('[FATAL] WASM Compilation Failed.', e.message);
  process.exit(1);
}

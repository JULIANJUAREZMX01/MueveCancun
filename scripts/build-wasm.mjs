import { execSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const modules = ['route-calculator', 'spatial-index'];

const isCI = process.env.GITHUB_ACTIONS === 'true' || process.env.VERCEL === '1' || process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_ID;

function hasPrebuilt() {
  // wasm-pack genera _bg.wasm (no .wasm sin sufijo)
  return modules.every(m => {
    const bgWasm = path.join(rootDir, 'public', 'wasm', m, m.replace(/-/g, '_') + '_bg.wasm');
    const js     = path.join(rootDir, 'public', 'wasm', m, m.replace(/-/g, '_') + '.js');
    const exists = fs.existsSync(bgWasm) && fs.existsSync(js);
    if (exists) console.log(`[NEXUS_LOG] Found prebuilt: ${m}`);
    if (!exists) console.log(`[NEXUS_LOG] Missing prebuilt artifact for module ${m} at ${bgWasm} (exists=${fs.existsSync(bgWasm)})`);
    return exists;
  });
}

if (isCI && hasPrebuilt()) {
  console.log('[NEXUS_LOG] CI: prebuilt WASM artifacts found — skipping Rust compilation.');
  process.exit(0);
}

if (isCI) {
  console.error('[FATAL] CI detected but prebuilt WASM artifacts not found. Cannot compile Rust in this environment.');
  console.error('[FATAL] Commit the compiled wasm files (public/wasm/**) to the repository.');
  process.exit(1);
}

try {
  console.log('[NEXUS_LOG] Initiating WASM Build Pipeline...');
  modules.forEach(mod => {
    const outDir = path.join(rootDir, 'public', 'wasm', mod);
    if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
    fs.mkdirSync(outDir, { recursive: true });

    console.log(`[NEXUS_LOG] Compiling ${mod}...`);
    execFileSync('wasm-pack', ['build', path.join(rootDir, 'rust-wasm', mod), '--target', 'web', '--out-dir', outDir], { stdio: 'inherit' });

    const gi = path.join(outDir, '.gitignore');
    if (fs.existsSync(gi)) fs.unlinkSync(gi);
  });
  console.log('[SUCCESS] WASM Engine Ready.');
} catch (e) {
  console.error('[FATAL] WASM Compilation Failed.', e.message);
  process.exit(1);
}

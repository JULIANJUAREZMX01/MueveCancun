import { execSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const modules = ['route-calculator', 'spatial-index'];

const isCI = process.env.GITHUB_ACTIONS === 'true' || process.env.VERCEL === '1' || process.env.RENDER === 'true';

function hasPrebuilt() {
  return modules.every(m => fs.existsSync(path.join(rootDir, 'public', 'wasm', m, m.replace('-', '_') + '_bg.wasm')));
}

if (isCI && hasPrebuilt()) {
  console.log('[NEXUS_LOG] CI Detected with artifacts. Skipping Rust compilation.');
  process.exit(0);
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
  console.error('[FATAL] WASM Compilation Failed.');
  process.exit(1);
}

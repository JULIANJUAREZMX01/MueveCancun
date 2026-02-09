import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

console.log('🏗️  Starting WASM build...');

let hasWasmPack = false;
try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
    hasWasmPack = true;
} catch (e) {
    console.warn('⚠️  wasm-pack not found. Skipping compilation and using existing binaries.');
}

modules.forEach(mod => {
    console.log(`📦 Processing ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);
    const srcOutDir = path.join(rootDir, 'src', 'wasm', mod);

    // 1. Build with wasm-pack (if available)
    if (hasWasmPack) {
        try {
            console.log(`🌀 Compiling ${mod}...`);
            execSync(`wasm-pack build --target web --out-dir ${publicOutDir} --no-typescript`, {
                cwd: sourceDir,
                stdio: 'inherit'
            });
            // Run again to generate types if needed, but usually one pass is enough.
            // Note: --no-typescript prevents .d.ts generation? The original script didn't have it.
            // Let's stick to default which generates .d.ts which is good.
            // Re-running without --no-typescript to match original behavior (it didn't have flags other than target and out-dir).

            execSync(`wasm-pack build --target web --out-dir ${publicOutDir}`, {
                cwd: sourceDir,
                stdio: 'inherit'
            });

        } catch (e) {
            console.error(`❌ Failed to build ${mod}`);
            process.exit(1);
        }
    } else {
        console.log(`⏭️  Skipping build for ${mod} (wasm-pack missing).`);
    }

    // 2. Clean up .gitignore
    const gitignorePath = path.join(publicOutDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        fs.unlinkSync(gitignorePath);
    }

    // 3. Copy to src/wasm (Essential step: Ensure binaries are in src/ for import)
    if (!fs.existsSync(srcOutDir)) {
        fs.mkdirSync(srcOutDir, { recursive: true });
    }

    // Copy all files
    if (fs.existsSync(publicOutDir)) {
        const files = fs.readdirSync(publicOutDir);
        files.forEach(file => {
            fs.copyFileSync(path.join(publicOutDir, file), path.join(srcOutDir, file));
        });
        console.log(`✅ ${mod} synced to src/.`);
    } else {
        console.warn(`⚠️  Warning: ${publicOutDir} does not exist. Binaries might be missing.`);
    }
});

console.log('🎉 All WASM modules processed successfully.');

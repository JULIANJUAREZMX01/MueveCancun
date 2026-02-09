import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

console.log('🏗️  Starting WASM build...');

// Check if wasm-pack is installed
let hasWasmPack = false;
try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
    hasWasmPack = true;
    console.log('✅ wasm-pack found. Proceeding with compilation.');
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
            console.log(`   🔨 Compiling ${mod}...`);
            execSync(`wasm-pack build --target web --out-dir ${publicOutDir} --no-typescript`, {
                cwd: sourceDir,
                stdio: 'inherit'
            });

            // Run again to ensure types are generated if needed (mimicking original behavior)
            execSync(`wasm-pack build --target web --out-dir ${publicOutDir}`, {
                cwd: sourceDir,
                stdio: 'inherit'
            });

        } catch (e) {
            console.error(`❌ Failed to build ${mod}`);
            process.exit(1);
        }

        // 2. Clean up .gitignore
        const gitignorePath = path.join(publicOutDir, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            fs.unlinkSync(gitignorePath);
        }
    } else {
        console.log(`   ⏩ Skipping compilation for ${mod} (using pre-built binaries).`);
    }

    // 3. Copy to src/wasm
    if (!fs.existsSync(srcOutDir)) {
        fs.mkdirSync(srcOutDir, { recursive: true });
    }

    // Copy all files from public/wasm to src/wasm
    if (fs.existsSync(publicOutDir)) {
        const files = fs.readdirSync(publicOutDir);
        files.forEach(file => {
            fs.copyFileSync(path.join(publicOutDir, file), path.join(srcOutDir, file));
        });
        console.log(`   ✅ ${mod} synced to src/wasm.`);
    } else {
        console.error(`❌ Pre-built binaries not found in ${publicOutDir} for ${mod}`);
        process.exit(1);
    }
});

console.log('🎉 WASM build/sync complete.');

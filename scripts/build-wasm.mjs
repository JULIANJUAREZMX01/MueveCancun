import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

console.log('🏗️  Starting WASM build...');

// Helper to check if wasm-pack is available
const isWasmPackAvailable = () => {
    try {
        execSync('wasm-pack --version', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
};

const hasWasmPack = isWasmPackAvailable();
if (!hasWasmPack) {
    console.warn('⚠️  wasm-pack not found. Skipping compilation and checking for existing artifacts...');
}

modules.forEach(mod => {
    console.log(`📦 Processing ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);
    const srcOutDir = path.join(rootDir, 'src', 'wasm', mod);

    let buildSuccess = false;

    if (hasWasmPack) {
        try {
            // 1. Build with wasm-pack
            // First pass with --no-typescript
            execSync(`wasm-pack build --target web --out-dir ${publicOutDir} --no-typescript`, {
                cwd: sourceDir,
                stdio: 'inherit'
            });

            // Second pass for types (matching original logic)
            execSync(`wasm-pack build --target web --out-dir ${publicOutDir}`, {
                cwd: sourceDir,
                stdio: 'inherit'
            });

            buildSuccess = true;
        } catch (e) {
            console.error(`❌ Failed to build ${mod} with wasm-pack.`);
            // Don't exit yet, check for artifacts
        }
    }

    // 2. Verify artifacts exist (either from build or fallback)
    const requiredFiles = [`${mod.replace(/-/g, '_')}_bg.wasm`, `${mod.replace(/-/g, '_')}.js`];
    const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(publicOutDir, f)));

    if (missingFiles.length > 0) {
        console.error(`❌ Missing required artifacts for ${mod}: ${missingFiles.join(', ')}`);
        console.error(`   Run 'wasm-pack' locally or ensure artifacts are committed.`);
        process.exit(1);
    }

    if (!buildSuccess && hasWasmPack) {
        console.warn(`⚠️  Build failed but artifacts exist for ${mod}. Using existing files.`);
    } else if (!hasWasmPack) {
        console.log(`✅ Using existing artifacts for ${mod}.`);
    }

    // 3. Clean up .gitignore
    const gitignorePath = path.join(publicOutDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        fs.unlinkSync(gitignorePath);
    }

    // 4. Copy to src/wasm
    if (!fs.existsSync(srcOutDir)) {
        fs.mkdirSync(srcOutDir, { recursive: true });
    }

    // Copy all files
    const files = fs.readdirSync(publicOutDir);
    files.forEach(file => {
        fs.copyFileSync(path.join(publicOutDir, file), path.join(srcOutDir, file));
    });

    console.log(`✅ ${mod} synced to src/.`);
});

console.log('🎉 WASM setup complete.');

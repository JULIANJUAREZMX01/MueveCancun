import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// FIX: Ensure cargo is found (needed for fresh installs)
const cargoBin = path.join(process.env.USERPROFILE, '.cargo', 'bin');
process.env.PATH = `${cargoBin}${path.delimiter}${process.env.PATH}`;

const modules = ['route-calculator', 'spatial-index'];

console.log('🏗️  Starting WASM build...');

modules.forEach(mod => {
    console.log(`📦 Building ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);
    const srcOutDir = path.join(rootDir, 'src', 'wasm', mod);

    let buildSuccess = false;

    // 1. Build with wasm-pack
    try {
        // Check if cargo is available to avoid ugly error messages
        execSync('cargo --version', { stdio: 'ignore' });

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
        buildSuccess = true;

    } catch (e) {
        console.warn(`⚠️  Failed to build ${mod} (wasm-pack or cargo missing/failed). Using fallback artifacts from public/wasm.`);
    }

    // 2. Validate Artifacts
    if (!fs.existsSync(publicOutDir)) {
         console.error(`❌ Missing artifacts directory for ${mod} at ${publicOutDir}`);
         process.exit(1);
    }

    // Check for critical files (wasm binary)
    // Rust package name uses hyphens but generated files use underscores
    const wasmFile = `${mod.replace(/-/g, '_')}_bg.wasm`;
    if (!fs.existsSync(path.join(publicOutDir, wasmFile))) {
        console.error(`❌ Missing critical artifact: ${wasmFile}`);
        process.exit(1);
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

    console.log(`✅ ${mod} built/synced to public/ and src/.`);
});

console.log('🎉 All WASM modules processed successfully.');

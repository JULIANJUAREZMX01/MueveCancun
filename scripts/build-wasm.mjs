import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Check if cargo is available
try {
    execSync('cargo --version', { stdio: 'ignore' });
} catch (e) {
    console.log('⚠️ Cargo not found. Skipping WASM build and using pre-built binaries.');
    process.exit(0);
}

const modules = ['route-calculator', 'spatial-index'];

console.log('🏗️  Starting WASM build...');

modules.forEach(mod => {
    console.log(`📦 Building ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);
    const srcOutDir = path.join(rootDir, 'src', 'wasm', mod);

    // 1. Build with wasm-pack
    try {
        execSync(`wasm-pack build --target web --out-dir ${publicOutDir} --no-typescript`, {
            cwd: sourceDir,
            stdio: 'inherit'
        });

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

    // 3. Copy to src/wasm
    if (!fs.existsSync(srcOutDir)) {
        fs.mkdirSync(srcOutDir, { recursive: true });
    }

    // Copy all files
    const files = fs.readdirSync(publicOutDir);
    files.forEach(file => {
        fs.copyFileSync(path.join(publicOutDir, file), path.join(srcOutDir, file));
    });

    console.log(`✅ ${mod} built and synced to public/ and src/.`);
});

console.log('🎉 All WASM modules built successfully.');

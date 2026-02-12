import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

console.log('🏗️  Starting WASM build process...');

// Check for required tools
const hasWasmPack = (() => {
    try {
        execSync('wasm-pack --version', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
})();

const hasCargo = (() => {
    try {
        execSync('cargo --version', { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
})();

// Check for existing artifacts
const artifactsExist = modules.every(mod => {
    const wasmPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}_bg.wasm`);
    const jsPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}.js`);
    return fs.existsSync(wasmPath) && fs.existsSync(jsPath);
});

if (!hasWasmPack || !hasCargo) {
    if (artifactsExist) {
        console.warn('⚠️  WASM build tools (wasm-pack/cargo) missing or failed.');
        console.warn('✅ Pre-built WASM artifacts found. Skipping build and using existing files.');
        process.exit(0);
    } else {
        console.error('❌ WASM build tools missing AND artifacts missing.');
        console.error('   Please install Rust and wasm-pack to build the project.');
        process.exit(1);
    }
}

console.log('✅ Build tools found. Proceeding with compilation...');

// Helper to check if wasm-pack is available


modules.forEach(mod => {
    console.log(`📦 Processing ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);
    const srcOutDir = path.join(rootDir, 'src', 'wasm', mod);

    let buildSuccess = false;

    if (hasWasmPack) {
        try {
            // 1. Build with wasm-pack
            // Build with wasm-pack (via npx)
            console.log(`🚀 Building ${mod} with npx wasm-pack...`);
            execSync(`npx wasm-pack build --target web --out-dir ${publicOutDir}`, {
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

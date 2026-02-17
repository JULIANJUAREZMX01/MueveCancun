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

modules.forEach(mod => {
    console.log(`📦 Processing ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);
    const srcOutDir = path.join(rootDir, 'src', 'wasm', mod);

    // Clean public output directory before building
    if (fs.existsSync(publicOutDir)) {
        console.log(`🧹 Cleaning old artifacts in ${publicOutDir}...`);
        fs.rmSync(publicOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicOutDir, { recursive: true });

    let buildSuccess = false;

    if (hasWasmPack) {
        try {
            // Build with wasm-pack
            console.log(`🚀 Building ${mod} with wasm-pack...`);
            execSync(`wasm-pack build --target web --out-dir ${publicOutDir}`, {
                cwd: sourceDir,
                stdio: 'inherit'
            });

            buildSuccess = true;
        } catch (e) {
            console.error(`❌ Failed to build ${mod} with wasm-pack.`);
        }
    }

    // Verify artifacts exist (either from build or fallback)
    const requiredFiles = [`${mod.replace(/-/g, '_')}_bg.wasm`, `${mod.replace(/-/g, '_')}.js`];
    const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(publicOutDir, f)));

    if (missingFiles.length > 0) {
        console.error(`❌ Missing required artifacts for ${mod}: ${missingFiles.join(', ')}`);
        process.exit(1);
    }

    // Clean up .gitignore in output dir
    const gitignorePath = path.join(publicOutDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        fs.unlinkSync(gitignorePath);
    }

    // Copy to src/wasm
    if (!fs.existsSync(srcOutDir)) {
        fs.mkdirSync(srcOutDir, { recursive: true });
    }

    // Clean src output directory before copying
    fs.rmSync(srcOutDir, { recursive: true, force: true });
    fs.mkdirSync(srcOutDir, { recursive: true });

    const files = fs.readdirSync(publicOutDir);
    files.forEach(file => {
        fs.copyFileSync(path.join(publicOutDir, file), path.join(srcOutDir, file));
    });

    console.log(`✅ ${mod} synced to src/wasm/.`);
});

console.log('🎉 WASM setup complete.');

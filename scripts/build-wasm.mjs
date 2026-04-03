import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

let hasWasmPack = false;
let wasmPackCmd = 'wasm-pack';

try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
    hasWasmPack = true;
} catch (e) {
    try {
        execSync('npx wasm-pack --version', { stdio: 'ignore' });
        hasWasmPack = true;
        wasmPackCmd = 'npx wasm-pack';
    } catch (ee) {
        console.warn('⚠️  wasm-pack not found. Checking for pre-built artifacts...');
        const hasArtifacts = modules.every(mod => fs.existsSync(path.join(rootDir, 'public', 'wasm', mod)));
        if (hasArtifacts) {
            console.warn('✅ Pre-built WASM artifacts found. Skipping build and using existing files.');
            process.exit(0);
        } else {
            console.error('❌ WASM build tools missing AND artifacts missing.');
            console.error('   Please install Rust and wasm-pack to build the project.');
            process.exit(1);
        }
    }
}

console.log(`✅ Build tools found using: ${wasmPackCmd}. Proceeding with compilation...`);

try {
    // Check for both wasm-pack and cargo (Rust toolchain)
    execSync('wasm-pack --version', { stdio: 'ignore' });
    execSync('cargo --version', { stdio: 'ignore' });
} catch (e) {
    console.warn("⚠️  wasm-pack or cargo (Rust) not found. Skipping WASM build and using pre-built binaries.");
    process.exit(0);
}

modules.forEach(mod => {
    console.log(`📦 Processing ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);

    // Clean public output directory before building
    if (fs.existsSync(publicOutDir)) {
        console.log(`🧹 Cleaning old artifacts in ${publicOutDir}...`);
        fs.rmSync(publicOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicOutDir, { recursive: true });

    if (hasWasmPack) {
        try {
            // Build with wasm-pack
            console.log(`🚀 Building ${mod} with ${wasmPackCmd}...`);
            execSync(`${wasmPackCmd} build --target web --out-dir ${publicOutDir}`, {
                cwd: sourceDir,
                stdio: 'inherit'
            });
        } catch (e) {
            console.error(`❌ Failed to build ${mod} with ${wasmPackCmd}.`);
            process.exit(1);
        }
    }

    // Clean up .gitignore in output dir
    const gitignorePath = path.join(publicOutDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        fs.unlinkSync(gitignorePath);
    }

    console.log(`✅ ${mod} built successfully to public/wasm/${mod}/`);
});

console.log('🎉 WASM setup complete.');

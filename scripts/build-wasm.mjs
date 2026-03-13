import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator'];

console.log('🏗️  Starting WASM build process...');

// Check for required tools
let wasmPackCmd = 'wasm-pack';
let hasWasmPack = false;
try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
    hasWasmPack = true;
} catch (e) {
    console.warn('⚠️ Global wasm-pack not found. Trying npx...');
    try {
        execSync('npx wasm-pack --version', { stdio: 'ignore' });
        wasmPackCmd = 'npx wasm-pack';
        hasWasmPack = true;
    } catch (e2) {
        hasWasmPack = false;
    }
}

let hasCargo = false;
try {
    execSync('cargo --version', { stdio: 'ignore' });
    hasCargo = true;
} catch (e) {
    hasCargo = false;
}

// Check for existing artifacts
let artifactsExist = true;
for (const mod of modules) {
    const wasmPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}_bg.wasm`);
    const jsPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}.js`);
    if (!fs.existsSync(wasmPath) || !fs.existsSync(jsPath)) {
        artifactsExist = false;
        break;
    }
}

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

console.log(`✅ Build tools found using: ${wasmPackCmd}. Proceeding with compilation...`);

for (const mod of modules) {
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
}

console.log('🎉 WASM setup complete.');

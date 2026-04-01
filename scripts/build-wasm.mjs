import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator'];

console.log('🏗️  Starting WASM build process...');

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
        process.exit(1);
    }
}

console.log(`✅ Build tools found using: ${wasmPackCmd}. Proceeding with compilation...`);

modules.forEach(mod => {
    console.log(`📦 Processing ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);

    if (fs.existsSync(publicOutDir)) {
        console.log(`🧹 Cleaning old artifacts in ${publicOutDir}...`);
        fs.rmSync(publicOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicOutDir, { recursive: true });

    if (hasWasmPack) {
        try {
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

    const gitignorePath = path.join(publicOutDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        fs.unlinkSync(gitignorePath);
    }

    console.log(`✅ ${mod} built successfully to public/wasm/${mod}/`);
});

console.log('🎉 WASM setup complete.');

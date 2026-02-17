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

=======
// Check if wasm-pack is installed
let hasWasmPack = false;
try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
    hasWasmPack = true;
    console.log('✅ wasm-pack found. Proceeding with compilation.');
} catch (e) {
    console.warn('⚠️  wasm-pack not found. Skipping compilation and using existing artifacts.');
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

    if (hasWasmPack) {
        // 1. Build with wasm-pack
        try {
            console.log(`   🔨 Compiling ${mod}...`);
            // Run twice to ensure types (legacy behavior preserved)
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
    } else {
        // Verify artifacts exist if skipping build
        if (!fs.existsSync(publicOutDir) || fs.readdirSync(publicOutDir).length === 0) {
             console.error(`❌ Critical Error: WASM artifacts missing for ${mod} in public/wasm/! Cannot proceed without build tool.`);
             process.exit(1);
        }
        console.log(`   ⏭️  Skipped build for ${mod}. Using existing artifacts.`);
    }

    // 3. Copy to src/wasm (Ensure consistency across environments)

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
=======
    if (fs.existsSync(publicOutDir)) {
        const files = fs.readdirSync(publicOutDir);
        files.forEach(file => {
            fs.copyFileSync(path.join(publicOutDir, file), path.join(srcOutDir, file));
        });
        console.log(`   ✅ ${mod} artifacts synced to src/wasm/.`);
    }
});

console.log('🎉 WASM build process completed successfully.');
>>>>>>> security/ffi-hardening-2939308447874549092

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

console.log('🏗️  Starting WASM build process...');

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

    if (fs.existsSync(publicOutDir)) {
        const files = fs.readdirSync(publicOutDir);
        files.forEach(file => {
            fs.copyFileSync(path.join(publicOutDir, file), path.join(srcOutDir, file));
        });
        console.log(`   ✅ ${mod} artifacts synced to src/wasm/.`);
    }
});

console.log('🎉 WASM build process completed successfully.');

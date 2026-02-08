import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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
        console.log('   Running wasm-pack...');
        execSync(`wasm-pack build --target web --out-dir ${publicOutDir} --no-typescript`, {
            cwd: sourceDir,
            stdio: 'inherit'
        });

        execSync(`wasm-pack build --target web --out-dir ${publicOutDir}`, {
            cwd: sourceDir,
            stdio: 'inherit'
        });
        buildSuccess = true;

    } catch (e) {
        console.warn(`⚠️  Failed to build ${mod} with wasm-pack.`);
        console.warn(`   Error: ${e.message}`);

        // Fallback Check
        if (fs.existsSync(publicOutDir) && fs.readdirSync(publicOutDir).length > 0) {
            console.warn(`   ⚠️  Using existing artifacts in public/wasm/${mod}.`);
            buildSuccess = true; // Treat as success for the sake of continuing
        } else {
            console.error(`❌ No fallback artifacts found for ${mod}. Build cannot proceed.`);
            process.exit(1);
        }
    }

    if (buildSuccess) {
        // 2. Clean up .gitignore (only if we built or are syncing)
        const gitignorePath = path.join(publicOutDir, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            fs.unlinkSync(gitignorePath);
        }

        // 3. Copy to src/wasm (Sync step)
        if (!fs.existsSync(srcOutDir)) {
            fs.mkdirSync(srcOutDir, { recursive: true });
        }

        // Copy all files
        try {
            const files = fs.readdirSync(publicOutDir);
            files.forEach(file => {
                fs.copyFileSync(path.join(publicOutDir, file), path.join(srcOutDir, file));
            });
            console.log(`✅ ${mod} sync complete.`);
        } catch (err) {
            console.error(`❌ Failed to sync artifacts for ${mod}: ${err.message}`);
             // If sync fails, it might be critical depending on where it's imported from.
             // But usually public/ is the source of truth for runtime.
        }
    }
});

console.log('🎉 WASM build process finished.');

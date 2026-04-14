
import { execSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

// ── Verificar si los artefactos ya están compilados ───────────────
function hasPrebuiltArtifacts() {
    return modules.every(mod => {
        const dir = path.join(rootDir, 'public', 'wasm', mod);
        const wasmFiles = fs.existsSync(dir)
            ? fs.readdirSync(dir).filter(f => f.endsWith('.wasm'))
            : [];
        return wasmFiles.length > 0;
    });
}

// En Vercel CI no hay rustup → el target wasm32 no está disponible
// Si los artefactos ya existen en public/wasm/, usarlos directamente
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

if (isVercel) {
    if (hasPrebuiltArtifacts()) {
        console.log('⚡ Vercel build: usando WASM pre-compilado de public/wasm/');
        console.log('   (No se recompila en Vercel — Rust wasm32 target no disponible)');
        modules.forEach(mod => {
            const dir = path.join(rootDir, 'public', 'wasm', mod);
            const files = fs.readdirSync(dir);
            console.log(`   ✅ ${mod}: ${files.join(', ')}`);
        });
        process.exit(0);
    } else {
        console.error('❌ En Vercel sin artefactos WASM pre-compilados.');
        console.error('   Compilar localmente con: pnpm build:wasm && git add public/wasm && git commit');
        process.exit(1);
    }
}

// ── Fuera de Vercel: intentar compilar con wasm-pack ─────────────
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
        console.warn('⚠️  wasm-pack no encontrado. Verificando artefactos pre-compilados...');
        if (hasPrebuiltArtifacts()) {
            console.warn('✅ Artefactos WASM encontrados. Usando archivos existentes.');
            process.exit(0);
        } else {
            console.error('❌ Sin herramientas de build NI artefactos WASM.');
            console.error('   Instala Rust + wasm-pack: https://rustwasm.github.io/wasm-pack/installer/');
            process.exit(1);
        }
    }
}

console.log(`✅ Build tools: ${wasmPackCmd}. Compilando WASM...`);

modules.forEach(mod => {
    console.log(`📦 Procesando ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);

    // Solo limpiar si tenemos herramientas para recompilar
    if (fs.existsSync(publicOutDir)) {
        console.log(`🧹 Limpiando ${publicOutDir}...`);
        fs.rmSync(publicOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicOutDir, { recursive: true });

    try {
        const [cmd, ...cmdArgs] = wasmPackCmd.split(' ');
        execFileSync(cmd, [...cmdArgs, 'build', '--target', 'web', '--out-dir', publicOutDir], {
            cwd: sourceDir,
            stdio: 'inherit'
        });
    } catch (e) {
        console.error(`❌ Error compilando ${mod}`);
        process.exit(1);
    }

    // Limpiar .gitignore generado por wasm-pack
    const gi = path.join(publicOutDir, '.gitignore');
    if (fs.existsSync(gi)) fs.unlinkSync(gi);

    console.log(`✅ ${mod} → public/wasm/${mod}/`);
});

console.log('🎉 WASM build completado.');

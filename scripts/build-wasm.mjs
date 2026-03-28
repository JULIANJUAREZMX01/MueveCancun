import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

console.log('[NEXUS_LOG] Iniciando proceso de compilacion WASM...');

// 1. Verificacion de herramientas (Fuera del loop)
let wasmPackCmd = 'wasm-pack';
const hasWasmPack = (() => {
    try {
        execSync('wasm-pack --version', { stdio: 'ignore' });
        return true;
    } catch (e) {
        try {
            execSync('npx wasm-pack --version', { stdio: 'ignore' });
            wasmPackCmd = 'npx wasm-pack';
            return true;
        } catch (e2) {
            return false;
        }
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

// 2. Fallback de artefactos
const artifactsExist = modules.every(mod => {
    const wasmPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}_bg.wasm`);
    const jsPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}.js`);
    return fs.existsSync(wasmPath) && fs.existsSync(jsPath);
});

if (!hasWasmPack || !hasCargo) {
    if (artifactsExist) {
        console.warn('[WARNING] Herramientas Rust/WASM no detectadas. Usando artefactos pre-existentes.');
        process.exit(0);
    } else {
        console.error('[ERROR] No hay herramientas ni artefactos previos. Abortando build.');
        process.exit(1);
    }
}

console.log(`[NEXUS_LOG] Toolchain verificada (${wasmPackCmd}). Compilando modulos...`);

// 3. Iteracion de modulos con manejo de errores limpio
modules.forEach(mod => {
    console.log(`[NEXUS_LOG] Procesando: ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);

    if (fs.existsSync(publicOutDir)) {
        fs.rmSync(publicOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicOutDir, { recursive: true });

    try {
        execSync(`${wasmPackCmd} build --target web --out-dir ${publicOutDir}`, {
            cwd: sourceDir,
            stdio: 'inherit'
        });

        // Post-build: Limpieza de .gitignore generado por wasm-pack
        const gitignorePath = path.join(publicOutDir, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            fs.unlinkSync(gitignorePath);
        }

        console.log(`[SUCCESS] Modulo ${mod} listo en public/wasm/${mod}/`);
    } catch (e) {
        console.error(`[ERROR] Fallo critico en la compilacion de ${mod}.`);
        process.exit(1);
    }
});

console.log('[NEXUS_LOG] Secuencia WASM completada.');

import { execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

// Nexus Signaling Functions
const log = (msg) => console.log(`\x1b[1;34m[NEXUS_LOG]\x1b[0m ${msg}`);
const success = (msg) => console.log(`\x1b[1;32m[SUCCESS]\x1b[0m ${msg}`);
const error = (msg) => console.error(`\x1b[1;31m[ERROR]\x1b[0m ${msg}`);

log("Iniciando forja de modulos WASM...");

// 1. Verificacion de Toolchain
let useNpx = false;

try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
} catch (e) {
    try {
        execSync('npx wasm-pack --version', { stdio: 'ignore' });
        useNpx = true;
    } catch (e2) {
        // Fallback check for artifacts
        const artifactsExist = modules.every(mod => {
            const wasmPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}_bg.wasm`);
            const jsPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}.js`);
            return fs.existsSync(wasmPath) && fs.existsSync(jsPath);
        });

        if (artifactsExist) {
            log("[WARNING] Herramientas Rust/WASM no detectadas. Usando artefactos pre-existentes.");
            process.exit(0);
        } else {
            error("wasm-pack no detectado y no hay artefactos previos. Abortando.");
            process.exit(1);
        }
    }
}

// 2. Proceso de Compilacion
modules.forEach(mod => {
    log(`Procesando modulo: ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);

    if (fs.existsSync(publicOutDir)) {
        fs.rmSync(publicOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicOutDir, { recursive: true });

    try {
        const cmd = useNpx ? 'npx' : 'wasm-pack';
        const args = useNpx
            ? ['wasm-pack', 'build', '--target', 'web', '--out-dir', publicOutDir]
            : ['build', '--target', 'web', '--out-dir', publicOutDir];

        // Security Fix: Using execFileSync with args array to prevent shell injection
        execFileSync(cmd, args, {
            cwd: sourceDir,
            stdio: 'inherit'
        });

        const gitignorePath = path.join(publicOutDir, '.gitignore');
        if (fs.existsSync(gitignorePath)) fs.unlinkSync(gitignorePath);

        success(`Modulo ${mod} forjado correctamente.`);
    } catch (e) {
        error(`Fallo en la compilacion de ${mod}. Abortando.`);
        process.exit(1);
    }
});

success("SECUENCIA WASM FINALIZADA.");

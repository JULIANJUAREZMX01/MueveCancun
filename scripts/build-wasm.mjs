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

/** Convert a kebab-case module name to the snake_case used by wasm-pack output files. */
const wasmModuleName = (mod) => mod.replace(/-/g, '_');

log("Iniciando forja de modulos WASM...");

// 1. Verificacion de Toolchain
let wasmPackBin = null;
let wasmPackBaseArgs = [];
try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
    wasmPackBin = 'wasm-pack';
} catch (e) {
    try {
        execSync('npx wasm-pack --version', { stdio: 'ignore' });
        wasmPackBin = 'npx';
        wasmPackBaseArgs = ['wasm-pack'];
    } catch (e2) {
        log("wasm-pack no detectado. Verificando artefactos pre-compilados...");
    }
}

// 2. Fallback por modulo: si falta toolchain, usar artefactos existentes donde sea posible
if (!wasmPackBin) {
    const moduleArtifacts = modules.map(mod => {
        const wasmPath = path.join(rootDir, 'public', 'wasm', mod, `${wasmModuleName(mod)}_bg.wasm`);
        const jsPath = path.join(rootDir, 'public', 'wasm', mod, `${wasmModuleName(mod)}.js`);
        return { mod, hasArtifacts: fs.existsSync(wasmPath) && fs.existsSync(jsPath) };
    });
    const missing = moduleArtifacts.filter(m => !m.hasArtifacts).map(m => m.mod);
    if (missing.length === 0) {
        log("Herramientas Rust/WASM no disponibles.");
        success("Artefactos pre-compilados encontrados para todos los modulos. Usando existentes.");
        process.exit(0);
    } else {
        error(`Herramientas WASM no disponibles Y artefactos faltantes para: ${missing.join(', ')}.`);
        error("Instala Rust y wasm-pack para compilar el proyecto.");
        process.exit(1);
    }
}

log(`Toolchain verificada: ${[wasmPackBin, ...wasmPackBaseArgs].join(' ')}. Compilando modulos...`);

// 3. Proceso de Compilacion
modules.forEach(mod => {
    log(`Procesando modulo: ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);

    if (fs.existsSync(publicOutDir)) {
        fs.rmSync(publicOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicOutDir, { recursive: true });

    try {
        execFileSync(
            wasmPackBin,
            [...wasmPackBaseArgs, 'build', '--target', 'web', '--out-dir', publicOutDir],
            { cwd: sourceDir, stdio: 'inherit' }
        );

        const gitignorePath = path.join(publicOutDir, '.gitignore');
        if (fs.existsSync(gitignorePath)) fs.unlinkSync(gitignorePath);

        success(`Modulo ${mod} forjado correctamente.`);
    } catch (e) {
        error(`Fallo en la compilacion de ${mod}. Abortando.`);
        process.exit(1);
    }
});

success("SECUENCIA WASM FINALIZADA.");

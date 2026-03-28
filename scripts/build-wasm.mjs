import { execSync } from 'child_process';
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
let wasmPackCmd = { command: 'wasm-pack', prefixArgs: [] };
try {
    execSync('wasm-pack --version', { stdio: 'ignore' });
} catch (e) {
    try {
        execSync('npx wasm-pack --version', { stdio: 'ignore' });
        wasmPackCmd = { command: 'npx', prefixArgs: ['wasm-pack'] };
    } catch (e2) {
        error("wasm-pack no detectado en el entorno.");
        process.exit(1);
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
        const args = [
            ...wasmPackCmd.prefixArgs,
            'build',
            '--target',
            'web',
            '--out-dir',
            publicOutDir
        ];
        execSync(wasmPackCmd.command, {
            cwd: sourceDir,
            stdio: 'inherit',
            shell: false,
            args
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

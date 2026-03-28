import { execSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const modules = ['route-calculator', 'spatial-index'];

const log = (msg) => console.log(`[NEXUS_LOG] ${msg}`);
const success = (msg) => console.log(`[SUCCESS] ${msg}`);
const error = (msg) => console.error(`[ERROR] ${msg}`);

log("Starting WASM module forging...");

// Toolchain resolution strategy
let wasmPackCmd = '';
let wasmPackArgs = [];

const env = {
    ...process.env,
    PATH: `${process.env.PATH}:${path.join(process.env.HOME || '/home/render', '.cargo/bin')}:/usr/local/bin`
};

const check = (cmd, args = []) => {
    try {
        const fullCmd = args.length > 0 ? `${cmd} ${args.join(' ')}` : cmd;
        execSync(`${fullCmd} --version`, { stdio: 'ignore', env });
        return true;
    } catch (e) {
        return false;
    }
};

if (check('wasm-pack')) {
    wasmPackCmd = 'wasm-pack';
    log("Toolchain: global wasm-pack detected.");
} else if (check('pnpm', ['exec', 'wasm-pack'])) {
    wasmPackCmd = 'pnpm';
    wasmPackArgs = ['exec', 'wasm-pack'];
    log("Toolchain: wasm-pack via pnpm exec.");
} else if (check('npx', ['wasm-pack'])) {
    wasmPackCmd = 'npx';
    wasmPackArgs = ['wasm-pack'];
    log("Toolchain: wasm-pack via npx.");
} else {
    const artifactsExist = modules.every(mod => {
        const wasmPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}_bg.wasm`);
        const jsPath = path.join(rootDir, 'public', 'wasm', mod, `${mod.replace('-', '_')}.js`);
        return fs.existsSync(wasmPath) && fs.existsSync(jsPath);
    });

    if (artifactsExist) {
        log("[WARNING] Toolchain missing. Using existing artifacts.");
        process.exit(0);
    } else {
        error("wasm-pack not found and no artifacts exist. Aborting.");
        process.exit(1);
    }
}

// Module compilation loop
modules.forEach(mod => {
    log(`Processing module: ${mod}...`);
    const sourceDir = path.join(rootDir, 'rust-wasm', mod);
    const publicOutDir = path.join(rootDir, 'public', 'wasm', mod);

    if (fs.existsSync(publicOutDir)) {
        log(`Cleaning old artifacts in ${mod}...`);
        fs.rmSync(publicOutDir, { recursive: true, force: true });
    }
    fs.mkdirSync(publicOutDir, { recursive: true });

    try {
        const args = [...wasmPackArgs, 'build', '--target', 'web', '--out-dir', publicOutDir];
        log(`Forging ${mod} with: ${wasmPackCmd} ${args.join(' ')}`);

        execFileSync(wasmPackCmd, args, {
            cwd: sourceDir,
            stdio: 'inherit',
            env
        });

        const gitignorePath = path.join(publicOutDir, '.gitignore');
        if (fs.existsSync(gitignorePath)) fs.unlinkSync(gitignorePath);

        success(`Module ${mod} forged successfully.`);
    } catch (e) {
        error(`Forge failure for ${mod}. Aborting.`);
        process.exit(1);
    }
});

success("WASM SEQUENCE COMPLETED.");

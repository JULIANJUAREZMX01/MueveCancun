#!/bin/bash
set -e

# Helpers for logging
log() { echo -e "\033[1;34m[NEXUS_LOG]\033[0m $1"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }
error() { echo -e "\033[1;31m[ERROR]\033[0m $1"; }

log "INICIANDO SECUENCIA MAESTRA (SYNC + BUILD)..."

# 1. Python Check
log "Verificando inteligencia social (Python)..."
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version)
    success "Python detectado: $PY_VER"
else
    error "Python3 no encontrado."
fi

# 2. Rust Check
log "Verificando entorno Rust..."
if [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env"
fi

if ! command -v cargo >/dev/null 2>&1; then
    log "Instalando Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    . "$HOME/.cargo/env"
else
    log "Rust ya esta instalado."
fi

log "Configurando target wasm32-unknown-unknown..."
rustup target add wasm32-unknown-unknown

# 3. WASM Pack — ensure it is available before build
log "Verificando/instalando wasm-pack..."
if command -v wasm-pack >/dev/null 2>&1; then
    success "wasm-pack ya instalado (sistema): $(wasm-pack --version)"
elif command -v pnpm >/dev/null 2>&1 && pnpm exec wasm-pack --version >/dev/null 2>&1; then
    success "wasm-pack disponible vía pnpm exec"
else
    log "wasm-pack no encontrado. Instalando via curl (instalador oficial de rustwasm.github.io)..."
    # The installer from rustwasm.github.io/wasm-pack is the project's official distribution method.
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh -s -- --no-modify-path
    export PATH="$HOME/.cargo/bin:$PATH"
    if ! command -v wasm-pack >/dev/null 2>&1; then
        log "curl install failed. Intentando via cargo install..."
        cargo install wasm-pack --locked
    fi
    wasm-pack --version
    success "wasm-pack instalado correctamente."
fi

# 4. PNPM & Build Sequence
log "Instalando dependencias y generando sitio..."
pnpm install --frozen-lockfile
pnpm run build

success "SECUENCIA MAESTRA COMPLETADA - LISTO PARA DEPLOY"

#!/bin/bash
set -e

# Helpers for logging
log() { echo -e "\033[1;34m[NEXUS_LOG]\033[0m $1"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }
error() { echo -e "\033[1;31m[ERROR]\033[0m $1"; }

log "INICIANDO SECUENCIA MAESTRA (SYNC + BUILD)..."

# 1. Check for existing WASM binaries
WASM_READY=true
for mod in route-calculator spatial-index; do
    if [ ! -f "public/wasm/$mod/${mod//-/_}.js" ] || [ ! -f "public/wasm/$mod/${mod//-/_}_bg.wasm" ]; then
        WASM_READY=false
        break
    fi
done

if [ "$WASM_READY" = "true" ]; then
    success "WASM binaries already exist. Skipping Rust toolchain setup."
else
    log "WASM binaries missing or incomplete. Setting up Rust..."

    if [ -f "$HOME/.cargo/env" ]; then
        . "$HOME/.cargo/env"
    fi

    if ! command -v cargo >/dev/null 2>&1; then
        log "Instalando Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
        . "$HOME/.cargo/env"
    fi

    rustup target add wasm32-unknown-unknown

    if ! command -v wasm-pack >/dev/null 2>&1; then
        log "Verificando/instalando wasm-pack..."
        curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh -s -- --no-modify-path
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
fi

# 2. Node dependencies and build
log "Instalando dependencias y generando sitio..."
pnpm install --frozen-lockfile || pnpm install
pnpm run build

success "SECUENCIA MAESTRA COMPLETADA - LISTO PARA DEPLOY"

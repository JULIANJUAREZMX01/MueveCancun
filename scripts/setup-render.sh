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

# 3. WASM Pack Check (Security-first verification)
log "Verificando wasm-pack (usando herramienta fijada en package.json)..."
if command -v pnpm >/dev/null 2>&1; then
    if ! pnpm exec wasm-pack --version >/dev/null 2>&1; then
        log "wasm-pack no está disponible aún; se utilizará la versión fijada vía pnpm/npx durante el build."
    else
        success "wasm-pack detectado vía pnpm exec."
    fi
else
    if ! command -v npx >/dev/null 2>&1; then
        log "npx no está disponible; asegúrate de que wasm-pack pueda ser resuelto por el proceso de build."
    else
        if ! npx wasm-pack --version >/dev/null 2>&1; then
            log "wasm-pack no se pudo resolver vía npx; scripts/build-wasm.mjs podrá intentar obtenerlo en tiempo de build."
        else
            success "wasm-pack detectado vía npx."
        fi
    fi
fi

# 4. PNPM & Build Sequence
log "Instalando dependencias y generando sitio..."
pnpm install --frozen-lockfile
pnpm run build

success "SECUENCIA MAESTRA COMPLETADA - LISTO PARA DEPLOY"

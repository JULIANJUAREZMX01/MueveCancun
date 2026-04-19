#!/bin/bash
set -e

# Helpers for logging
log() { echo -e "\033[1;34m[NEXUS_LOG]\033[0m $1"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }
error() { echo -e "\033[1;31m[ERROR]\033[0m $1"; }

log "INICIANDO SECUENCIA MAESTRA (SYNC + BUILD)..."

# 1. PNPM Setup
log "Configurando pnpm..."
corepack enable pnpm
pnpm install --frozen-lockfile

# 2. WASM Prebuilt Check
log "Verificando artefactos WASM preconstruidos..."
PREBUILT_EXISTS=true
for mod in route-calculator spatial-index; do
    base=${mod//-/_}
    if [ ! -f "public/wasm/$mod/${base}_bg.wasm" ] || [ ! -f "public/wasm/$mod/${base}.js" ]; then
        log "Falta artefacto preconstruido para $mod"
        PREBUILT_EXISTS=false
    fi
done

if [ "$PREBUILT_EXISTS" = "true" ]; then
    success "Artefactos WASM encontrados. Saltando instalacion de Rust/wasm-pack."
else
    log "Artefactos faltantes. Configurando entorno de compilacion Rust..."

    # Python Check
    if command -v python3 >/dev/null 2>&1; then
        success "Python detectado: $(python3 --version)"
    fi

    # Rust Check
    if [ -f "$HOME/.cargo/env" ]; then . "$HOME/.cargo/env"; fi
    if ! command -v cargo >/dev/null 2>&1; then
        log "Instalando Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
        . "$HOME/.cargo/env"
    fi
    rustup target add wasm32-unknown-unknown

    # wasm-pack Check
    if ! command -v wasm-pack >/dev/null 2>&1; then
        if pnpm exec wasm-pack --version >/dev/null 2>&1; then
            success "wasm-pack disponible vía pnpm exec"
        else
            log "Instalando wasm-pack..."
            curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh -s -- --no-modify-path
        fi
    fi
fi

# 3. Final Build
log "Ejecutando pnpm run build..."
pnpm run build

success "SECUENCIA MAESTRA COMPLETADA - LISTO PARA DEPLOY"

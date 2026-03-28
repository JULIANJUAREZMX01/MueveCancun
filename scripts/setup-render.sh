#!/bin/bash
set -e

# Helpers for logging
log() { echo -e "\033[1;34m[NEXUS_LOG]\033[0m $1"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }
error() { echo -e "\033[1;31m[ERROR]\033[0m $1"; }

log "INICIANDO SECUENCIA MAESTRA (SYNC + BUILD)..."

# 1. Python Check (Optional)
log "Verificando inteligencia social (Python)..."
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version)
    success "Python detectado: $PY_VER"
else
    log "⚠️ Python3 no encontrado (Opcional)."
fi

# 2. Rust Check & Setup
log "Verificando entorno Rust..."
# Cargar entorno si existe
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

if ! command -v cargo >/dev/null 2>&1; then
    log "Instalando Rust vía rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    [ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
else
    log "Cargo ya detectado."
fi

# Asegurar exportación del PATH para procesos hijos (como Node)
export PATH="$HOME/.cargo/bin:$PATH"
log "PATH actualizado con cargo/bin: $PATH"

if ! command -v rustup >/dev/null 2>&1; then
    log "⚠️ rustup no encontrado. Se intentará continuar con cargo directo."
else
    log "Configurando target wasm32-unknown-unknown..."
    rustup target add wasm32-unknown-unknown || log "⚠️ Target add falló (puede que ya exista)."
fi

# 3. WASM Pack Check
log "Verificando disponibilidad de wasm-pack..."
if command -v wasm-pack >/dev/null 2>&1; then
    success "wasm-pack global detectado: $(wasm-pack --version)"
else
    log "wasm-pack no está en el PATH global."
fi

# 4. PNPM & Build Sequence
log "Instalando dependencias (pnpm)..."
if ! command -v pnpm >/dev/null 2>&1; then
    log "Instalando pnpm local..."
    npm install -g pnpm
fi

pnpm install --frozen-lockfile

log "Lanzando pnpm run build..."
pnpm run build

success "SECUENCIA MAESTRA COMPLETADA - LISTO PARA DEPLOY"

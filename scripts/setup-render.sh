#!/bin/bash
set -e

log() { echo -e "\033[1;34m[NEXUS_LOG]\033[0m $1"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }

log "INICIANDO SECUENCIA MAESTRA (Render Platform)..."

# 1. Environment Detection
log "Node version: $(node -v)"
log "NPM version: $(npm -v)"

# 2. Memory optimization (Critical for Astro v6 on small instances)
export NODE_OPTIONS="--max-old-space-size=3072"
log "Memoria configurada (max-old-space-size=3072)"

# 3. Setup PNPM
if ! command -v pnpm &> /dev/null; then
    log "pnpm no encontrado. Instalando..."
    npm install -g pnpm@9.15.4
fi
log "pnpm version: $(pnpm -v)"

# 4. Dependencies
log "Instalando dependencias..."
pnpm install --frozen-lockfile

# 5. Environment Signal
export RENDER=true

# 6. Build Sequence
log "Ejecutando build:ci (Astro + WASM)..."
# build:ci includes prepare-data (merge + optimize) and build-wasm.mjs
pnpm run build:ci

success "BUILD COMPLETADO - LISTO PARA DESPLIEGUE"

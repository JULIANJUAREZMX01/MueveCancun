#!/bin/bash
set -e

# Helpers for logging
log() { echo -e "\033[1;34m[NEXUS_LOG]\033[0m $1"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }

log "INICIANDO PROCESO DE DESPLIEGUE (Render Platform)..."

# 1. Memory optimization for Node.js
export NODE_OPTIONS="--max-old-space-size=2048"
log "Memoria configurada (max-old-space-size=2048)"

# 2. Setup PNPM via Corepack (Native Node.js manager)
log "Configurando pnpm via corepack..."
corepack enable
corepack prepare pnpm@9.15.4 --activate

# 3. Dependencies
log "Instalando dependencias (frozen-lockfile)..."
pnpm install --frozen-lockfile

# 4. Environment Signal
export RENDER=true

# 5. Build Sequence
log "Ejecutando build optimizado (Astro + WASM)..."
# build:ci includes prepare-data and build-wasm.mjs
pnpm run build:ci

success "DEPLOY READY: Build completado con éxito"

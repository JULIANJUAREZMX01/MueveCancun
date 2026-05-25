#!/bin/bash
set -e
set -o pipefail

log() { echo -e "\033[1;34m[NEXUS_LOG]\033[0m $1"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }

log "INICIANDO SECUENCIA MAESTRA (Render Platform)..."

# 1. Environment Info
log "Node version: $(node -v)"
log "NPM version: $(npm -v)"

# 2. Memory optimization
export NODE_OPTIONS="--max-old-space-size=3072"
log "Memoria configurada (max-old-space-size=3072)"

# 3. Setup PNPM via native activation
log "Activando pnpm..."
corepack enable
corepack prepare pnpm@9.15.4 --activate

# 4. Dependencies & Build Sequence
log "Instalando dependencias y ejecutando build..."
export RENDER=true
pnpm install --frozen-lockfile && pnpm run build:ci

success "BUILD COMPLETADO - LISTO PARA DESPLIEGUE"

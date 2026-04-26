#!/bin/bash
set -e

log() { echo -e "\033[1;34m[NEXUS_LOG]\033[0m $1"; }
success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }

log "INICIANDO SECUENCIA MAESTRA (Render Platform)..."

# Optimization and Network configuration
export NODE_OPTIONS="--max-old-space-size=4096"
export HOST=0.0.0.0
export RENDER=true

log "Instalando dependencias..."
pnpm install --frozen-lockfile

log "Ejecutando pipeline de construcción..."
pnpm run build:ci

success "CONSTRUCCIÓN COMPLETADA"

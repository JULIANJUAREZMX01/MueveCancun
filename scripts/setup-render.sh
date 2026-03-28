#!/bin/bash
set -e

# Nexus Prime Setup Script
# Philosophy: Extreme Resilience, Zero Accents, ASCII Only

log() { echo "[NEXUS_LOG] $1"; }
success() { echo "[SUCCESS] $1"; }
error() { echo "[ERROR] $1"; }

log "Starting Master Sequence (SYNC + BUILD)..."

# 1. Environment Verification
if command -v python3 >/dev/null 2>&1; then
    PY_VER=$(python3 --version)
    success "Python detected: $PY_VER"
fi

# 2. Rust Environment
log "Checking Rust environment..."
if [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
fi

if ! command -v cargo >/dev/null 2>&1; then
    log "Installing Rust via rustup.rs..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    source "$HOME/.cargo/env"
else
    success "Cargo already in PATH."
fi

# Explicit PATH export for child processes
export PATH="$HOME/.cargo/bin:$PATH"
log "PATH updated: $PATH"

if command -v rustup >/dev/null 2>&1; then
    log "Adding wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown || log "Target already exists or failed."
fi

# 3. WASM Toolchain
log "Checking for wasm-pack..."
if command -v wasm-pack >/dev/null 2>&1; then
    success "wasm-pack found: $(wasm-pack --version)"
fi

# 4. PNPM and Build
log "Installing dependencies (pnpm)..."
# Check for pnpm, if not found, use npm to install it locally if possible
if ! command -v pnpm >/dev/null 2>&1; then
    log "pnpm not found. Using npx pnpm..."
    export PNPM_CMD="npx pnpm"
else
    export PNPM_CMD="pnpm"
fi

$PNPM_CMD install --frozen-lockfile

log "Executing pnpm run build..."
$PNPM_CMD run build

success "MASTER SEQUENCE COMPLETED - READY FOR DEPLOY"

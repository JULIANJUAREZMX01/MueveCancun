#!/bin/bash
set -e # Stop on any error

echo "🚀 Starting Smart Build..."

# 1. Check if Rust is already installed
if ! command -v cargo &> /dev/null; then
    echo "📦 Rust not found. Installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
else
    echo "✅ Rust is already installed. Skipping download."
fi

# 2. Load Rust environment
source $HOME/.cargo/env

# 3. Ensure WASM target is present (Fast check)
echo "🎯 Adding WASM target..."
rustup target add wasm32-unknown-unknown

# 4. Install Dependencies & Build
echo "🏗️ Building Project..."
# Ensure pnpm is available (Render usually has it via environment var, but let's be safe)
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi

pnpm install
pnpm run build

echo "✨ Build Complete!"

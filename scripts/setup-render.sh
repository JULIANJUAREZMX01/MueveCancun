#!/bin/bash
set -e

echo "🏗️  Starting Render Setup..."

# Attempt to source cargo env if it exists (using . for sh compatibility)
if [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env"
fi

# 1. Setup Rust
if ! command -v rustc &> /dev/null; then
    echo "🦀 Installing Rust..."
    export RUSTUP_HOME=$HOME/.rustup
    export CARGO_HOME=$HOME/.cargo
    curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    . "$HOME/.cargo/env"
else
    echo "✅ Rust is already installed."
fi

# Ensure cargo is in path for this session
export PATH="$HOME/.cargo/bin:$PATH"

# 2. Add WASM Target
echo "🎯 Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown

# 3. Build Project (wasm-pack is managed via package.json dependencies and npx)
echo "🚀 Building Project..."
pnpm install --frozen-lockfile
pnpm run build

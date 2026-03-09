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

# 3. Setup wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "📦 Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
else
    echo "✅ wasm-pack is already installed."
fi

# 4. Build Project
echo "🚀 Building Project..."
pnpm install
pnpm run build

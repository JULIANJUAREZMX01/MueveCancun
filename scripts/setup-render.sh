#!/bin/bash
set -e

echo "==> Running Custom Render Build Script"

# 1. Setup Rust Toolchain if not present
export RUSTUP_HOME=$HOME/.rustup
export CARGO_HOME=$HOME/.cargo

if ! command -v cargo &> /dev/null
then
    echo "==> Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi

if [ -f "$HOME/.cargo/env" ]; then
    source $HOME/.cargo/env
fi

echo "==> Setting default rustup toolchain to stable..."
rustup default stable

echo "==> Adding wasm32-unknown-unknown target..."
rustup target add wasm32-unknown-unknown

# 2. Setup wasm-pack if not present
if ! command -v wasm-pack &> /dev/null
then
    echo "==> Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf -o install_wasm.sh
    sh install_wasm.sh
    rm install_wasm.sh
fi

# 3. Install pnpm if not present
if ! command -v pnpm &> /dev/null
then
    echo "==> Installing pnpm via npm..."
    npm install -g pnpm
else
    echo "==> pnpm already installed"
fi

# 4. Install Node dependencies
echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

# 5. Build Astro and WASM
echo "==> Building project..."
pnpm run build

echo "==> Build finished successfully."

#!/bin/bash
# Pre-commit steps for MueveCancun optimization

echo "Checking formatting..."
pnpm run lint

echo "Running tests..."
pnpm run test

echo "Building..."
pnpm run build

echo "Checking WASM scripts..."
node scripts/check-wasm.cjs

echo "Done!"

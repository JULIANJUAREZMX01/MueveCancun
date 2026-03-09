# Deployment Instructions

This project is configured as a **Static Site** application using Astro's static adapter. It is built to serve pre-rendered HTML/CSS/JS files and WASM modules.

## Render Deployment Guide

1.  **Service Type**: Create a **Static Site**.
2.  **Build Command**: `bash scripts/setup-render.sh`
    *   This script sets up Rust, wasm-pack, and runs `pnpm install` and `pnpm run build`.
3.  **Publish Path**: `dist`
    *   This folder contains the final compiled HTML, CSS, JS, and WASM files.
4.  **Environment Variables**:
    *   `NODE_VERSION`: `20` (Recommended minimum)
    *   `ENABLE_PNPM`: `true`

### Troubleshooting "Publish directory does not exist"

If you see an error like `Publish directory does not exist!`, make sure `scripts/setup-render.sh` completes successfully. The final step is `pnpm run build` which populates the `dist` directory.

### WASM Build Notes

The build process (`bash scripts/setup-render.sh`) installs Rust and `wasm-pack` explicitly.
-   It compiles the Rust code into WebAssembly.
-   The build script will place compiled artifacts in `public/wasm/`.
-   **Important**: If you deploy without running `setup-render.sh` (e.g., using a pure Node environment without Rust), ensure `public/wasm/` contains the latest `.wasm` and `.js` files.

# DEPLOY.md — Instrucciones de Despliegue

This project is configured as a **Static Site** application using Astro's static adapter. It is built to serve pre-rendered HTML/CSS/JS files and WASM modules.

---

1.  **Service Type**: Create a **Static Site**.
2.  **Build Command**: `bash scripts/setup-render.sh`
    *   This script sets up Rust, wasm-pack, and runs `pnpm install` and `pnpm run build`.
3.  **Publish Path**: `dist`
    *   This folder contains the final compiled HTML, CSS, JS, and WASM files.
4.  **Environment Variables**:
    *   `NODE_VERSION`: `20` (Recommended minimum)
    *   `ENABLE_PNPM`: `true`

| Campo | Valor |
|-------|-------|
| Service Type | **Web Service** |
| Branch | `main` |
| Build Command | `pnpm run build` |
| Start Command | `node ./dist/server/entry.mjs` |
| Node Version | `20.10.0` |

If you see an error like `Publish directory does not exist!`, make sure `scripts/setup-render.sh` completes successfully. The final step is `pnpm run build` which populates the `dist` directory.

| Variable | Valor | Requerida |
|----------|-------|-----------|
| `NODE_VERSION` | `20.10.0` | Sí |

The build process (`bash scripts/setup-render.sh`) installs Rust and `wasm-pack` explicitly.
-   It compiles the Rust code into WebAssembly.
-   The build script will place compiled artifacts in `public/wasm/`.
-   **Important**: If you deploy without running `setup-render.sh` (e.g., using a pure Node environment without Rust), ensure `public/wasm/` contains the latest `.wasm` and `.js` files.

// Configuracion del build ESTATICO para GitHub Pages (ADR-2026-005, fase 1).
//
// Vive en config/ y no en la raiz a proposito: scripts/check-astro-config.mjs
// exige que astro.config.ts sea el unico `astro.config.*` del repositorio para
// proteger el build SSR de Vercel. Este archivo se usa con `--config`, asi que
// el guardia sigue pasando y el despliegue de produccion no se toca.
//
// Diferencias con astro.config.ts:
//   output: 'static'   -> produce HTML publicable, no entradas de servidor
//   sin adaptador      -> no hay Vercel ni Node en este build
//   base configurable  -> en Pages de proyecto el sitio vive en un subdirectorio
//
// Lo que NO puede hacer este build, y por eso queda fuera (ver scripts/build-pages.mjs):
//   src/pages/api/*     -> 8 endpoints que escriben en Supabase
//   src/middleware.ts   -> redirecciones de idioma en servidor
//   src/pages/healthz.ts -> endpoint de salud del proceso

import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"

const base = process.env.PAGES_BASE || "/MueveCancun"
const site = process.env.PAGES_SITE || "https://julianjuarezmx01.github.io"

// Mismos valores que astro.config.ts define con Vite. Se calculan aqui en vez de
// importar src/generated/buildInfo.ts porque ese archivo es TypeScript y este
// config es .mjs: importarlo obligaria a compilar antes de leer la config.
const commit = process.env.GITHUB_SHA || "local"
const buildInfo = {
  __APP_VERSION__: process.env.npm_package_version || "0.0.0",
  __BUILD_DATE__: new Date().toISOString(),
  __BUILD_ID__: String(Date.now()),
  __CACHE_VERSION__: "pages-" + commit.slice(0, 7),
  __GIT_COMMIT__: commit,
  __SHORT_COMMIT__: commit.slice(0, 7),
}

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "ignore",
  integrations: [mdx()],
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
  build: {
    format: "directory",
    inlineStylesheets: "auto",
  },
  vite: {
    define: {
      "process.env.IS_DEV": JSON.stringify(false),
      ...Object.fromEntries(Object.entries(buildInfo).map(([k, v]) => [k, JSON.stringify(v)])),
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        external: ["/wasm/route-calculator/route_calculator.js"],
      },
    },
  },
})

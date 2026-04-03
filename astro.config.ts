import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import tailwind from "@astrojs/tailwind"
import node from "@astrojs/node"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development';

// ─────────────────────────────────────────────────────────────────────────────
// MueveCancún — Astro Config v3.4.0
//
// output: 'hybrid'
//   • Por defecto: prerenderiza todo como HTML estático (SSG).
//   • Páginas con `export const prerender = false` se sirven como SSR.
//   • Adapter @astrojs/node en modo 'standalone' para Render (Node.js web service).
//
// Para desplegar en Render:
//   runtime: node
//   buildCommand: bash scripts/setup-render.sh
//   startCommand: node dist/server/entry.mjs
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  site: "https://querutamellevacancun.onrender.com",

  // 'hybrid' = SSG por defecto + SSR donde se indique con `prerender = false`
  output: 'hybrid',

  adapter: node({ mode: 'standalone' }),

  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
  ],

  vite: {
    define: {
      'process.env.IS_DEV': JSON.stringify(isDev),
    },
    build: {
      rollupOptions: {
        external: [
          "/wasm/route-calculator/route_calculator.js",
          "/wasm/spatial-index/spatial_index.js",
        ],
      },
    },
    resolve: {
      alias: {
        "@components": path.resolve(__dirname, "src/components"),
        "@layouts":    path.resolve(__dirname, "src/layouts"),
        "@utils":      path.resolve(__dirname, "src/utils"),
        "@consts":     path.resolve(__dirname, "src/consts.ts"),
        "@types":      path.resolve(__dirname, "src/types.ts"),
      },
    },
  },
})

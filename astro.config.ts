import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import tailwind from "@astrojs/tailwind"
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
//   • Permite tener API routes dinámicas (Stripe webhook, reports)
//     sin sacrificar la velocidad del SSG para el 95% del contenido.
//
// Para output: 'hybrid', Render debe configurar el servicio como Node.js
// (no Static Site), con buildCommand = pnpm build y startCommand = node dist/server/entry.mjs
// render.yaml se actualiza en el mismo PR.
// ─────────────────────────────────────────────────────────────────────────────

export default defineConfig({
  site: "https://querutamellevacancun.onrender.com",

  // 'hybrid' = SSG por defecto + SSR donde se necesite
  output: 'hybrid',

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

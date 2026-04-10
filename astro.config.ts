import { defineConfig } from "astro/config"
import vercel from "@astrojs/vercel"
import mdx from "@astrojs/mdx"
import tailwind from "@astrojs/tailwind"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === "development"

export default defineConfig({
  // URL canónica — Vercel asigna este dominio automáticamente
  site: "https://mueve-cancun.vercel.app",

  // output:'server' habilita:
  //   - API routes dinámicas (Stripe webhooks, reportes, health)
  //   - Conexión a Neon DB en cada request (serverless)
  //   - SSR en páginas que lo requieran
  // Las páginas estáticas siguen siendo estáticas via export const prerender = true
  output: "server",

  // Adapter oficial de Vercel (Edge/Serverless según la ruta)
  adapter: vercel({
    // Habilita Image Optimization de Vercel (Astro sharp → Vercel native)
    imageService: true,
    // Incluye los archivos de la carpeta public/ en el bundle serverless
    includeFiles: [],
    // Excluir módulos nativos que no funcionan en edge
    excludeFiles: [],
    // Analytics y Speed Insights ya incluidos en deps
    webAnalytics: { enabled: true },
    speedInsights: { enabled: true },
  }),

  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
  ],

  vite: {
    define: { "process.env.IS_DEV": JSON.stringify(isDev) },
    build: {
      rollupOptions: {
        external: [
          "/wasm/route-calculator/route_calculator.js",
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
    // Optimizar deps serverless para Vercel
    ssr: {
      noExternal: ["@neondatabase/serverless"],
    },
  },
})

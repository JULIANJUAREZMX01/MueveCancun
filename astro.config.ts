import { defineConfig } from "astro/config"
import vercel from "@astrojs/vercel"
import mdx from "@astrojs/mdx"
import tailwind from "@astrojs/tailwind"
import vercel from "@astrojs/vercel"
import node from "@astrojs/node"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === "development"

// Select adapter based on environment
const getAdapter = () => {
  if (process.env.VERCEL) {
    return vercel();
  }
  return node({
    mode: "standalone"
  });
};

export default defineConfig({
  site: "https://mueve-cancun.vercel.app",

  // output:server → API routes dinámicas (Neon DB, Stripe webhooks)
  output: "server",

  // Adapter Vercel — config mínima para evitar bugs de subpath exports en Vite 6.4
  adapter: vercel(),

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
    ssr: {
      // Neon serverless necesita bundling explícito en SSR
      noExternal: ["@neondatabase/serverless"],
    },
    optimizeDeps: {
      exclude: ["@neondatabase/serverless"],
    },
  },
})

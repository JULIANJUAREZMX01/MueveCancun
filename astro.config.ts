import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import tailwind from "@astrojs/tailwind"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  site: "https://mueve-cancun.vercel.app",
  output: 'static',
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false })
  ],
  vite: {
    define: { 'process.env.IS_DEV': JSON.stringify(isDev) },
    build: {
      rollupOptions: {
        external: [
          "/wasm/route-calculator/route_calculator.js"
        ]
      }
    },
    resolve: {
      alias: {
        "@components": path.resolve(__dirname, "src/components"),
        "@layouts":    path.resolve(__dirname, "src/layouts"),
        "@utils":      path.resolve(__dirname, "src/utils"),
        "@consts":     path.resolve(__dirname, "src/consts.ts"),
        "@types":      path.resolve(__dirname, "src/types.ts")
      }
    }
  }
})

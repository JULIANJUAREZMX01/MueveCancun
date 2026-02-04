import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import sitemap from "@astrojs/sitemap"
import tailwind from "@astrojs/tailwind"
import node from "@astrojs/node"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://astro.build/config
export default defineConfig({
  site: "https://cancunmueve.com",
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [
    mdx(),
    sitemap(),
    tailwind()
  ],
  vite: {
    build: {
      rollupOptions: {
        external: [
          "/wasm/route_calculator/route_calculator.js",
          "/wasm/spatial-index/spatial_index.js"
        ]
      }
    },
    resolve: {
      alias: {
        "@components": path.resolve(__dirname, "src/components"),
        "@layouts": path.resolve(__dirname, "src/layouts"),
        "@styles": path.resolve(__dirname, "src/styles"),
        "@lib": path.resolve(__dirname, "src/lib"),
        "@consts": path.resolve(__dirname, "src/consts.ts"),
        "@types": path.resolve(__dirname, "src/types.ts")
      }
    }
  }
})

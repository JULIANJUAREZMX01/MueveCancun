import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import sitemap from "@astrojs/sitemap"
import tailwindv4 from "@tailwindcss/vite"
import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://astro.build/config
export default defineConfig({
  site: "https://cancunmueve.com",
  integrations: [
    mdx(),
    sitemap()
    sitemap(),
  ],
  vite: {
    plugins: [tailwindv4()],
    resolve: {
      alias: {
        "@components": path.resolve(__dirname, "src/components"),
        "@layouts": path.resolve(__dirname, "src/layouts"),
        "@styles": path.resolve(__dirname, "src/styles"),
        "@lib": path.resolve(__dirname, "src/lib"),
        "@consts": path.resolve(__dirname, "src/consts.ts"),
        "@types": path.resolve(__dirname, "src/types.ts")
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: [
          '/wasm/route-calculator/route_calculator_bg.wasm',
          '/wasm/spatial-index/spatial_index_bg.wasm',
          '/wasm/route-calculator/route_calculator.js'
        ]
      }
    }
  }
})

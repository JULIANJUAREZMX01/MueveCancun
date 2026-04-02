import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import tailwind from "@astrojs/tailwind"
import vercel from "@astrojs/vercel"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://astro.build/config
export default defineConfig({
  site: "https://querutamellevacancun.onrender.com",
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false })
  ],
  vite: {
    build: {
      rollupOptions: {
        external: [
          "/wasm/route-calculator/route_calculator.js",
          "/wasm/spatial-index/spatial_index.js"
        ]
      }
    },
    resolve: {
      alias: {
        "@components": path.resolve(__dirname, "src/components"),
        "@layouts": path.resolve(__dirname, "src/layouts"),
        "@utils": path.resolve(__dirname, "src/utils"),
        "@consts": path.resolve(__dirname, "src/consts.ts"),
        "@types": path.resolve(__dirname, "src/types.ts")
      }
    }
  }
})

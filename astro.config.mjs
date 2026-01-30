import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import sitemap from "@astrojs/sitemap"
import tailwindv4 from "@tailwindcss/vite"

// https://astro.build/config
export default defineConfig({
  site: "https://cancunmueve.com",
  integrations: [
    mdx(),
    sitemap()
  ],
  vite: {
    plugins: [tailwindv4()]
  }
})

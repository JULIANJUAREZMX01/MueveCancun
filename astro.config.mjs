import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'
import node from '@astrojs/node'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  site: 'https://muevereparto.onrender.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    sitemap(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, 'src/components'),
        '@layouts':    path.resolve(__dirname, 'src/layouts'),
        '@utils':      path.resolve(__dirname, 'src/utils'),
        '@lib':        path.resolve(__dirname, 'src/lib'),
        '@consts':     path.resolve(__dirname, 'src/consts.ts'),
        '@types':      path.resolve(__dirname, 'src/types.ts'),
      },
    },
  },
})

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://cancunmueve.com',

  output: 'static', // SSG para máximo performance

  integrations: [
    sitemap(),
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: [
          '/wasm/route-calculator/route_calculator_bg.wasm',
          '/wasm/spatial-index/spatial_index_bg.wasm',
          '/wasm/route-calculator/route_calculator.js'
        ]
      }
    },
    optimizeDeps: {
      exclude: ['@mapbox/mapbox-gl-geocoder']
    }
  },

  server: {
    port: 3000,
    host: true
  },

  build: {
    inlineStylesheets: 'auto',
  }
});

import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://cancunmueve.com',
  
  output: 'static', // SSG para máximo performance
  
  integrations: [
    react(), // Para islands
    tailwind({
      applyBaseStyles: false, // Usamos Tailwind v4 custom
    }),
    sitemap(),
  ],
  
  vite: {
    build: {
      rollupOptions: {
        external: [
          '/wasm/route-calculator/route_calculator_bg.wasm',
          '/wasm/spatial-index/spatial_index_bg.wasm'
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
  },
  
  experimental: {
    contentCollectionCache: true,
  }
});

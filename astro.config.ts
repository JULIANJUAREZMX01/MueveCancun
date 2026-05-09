import { defineConfig } from "astro/config"
import mdx from "@astrojs/mdx"
import vercel from "@astrojs/vercel"
import node from "@astrojs/node"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development';

const getAdapter = () => {
  if (process.env.VERCEL) return vercel();
  return node({ mode: "standalone" });
};

export default defineConfig({
  site: "https://mueve-cancun.vercel.app",
  output: 'server',
  adapter: getAdapter(),
  integrations: [mdx()],

  // ── Prefetch strategy: hover/tap intent, not aggressive ─────────────
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },

  vite: {
    define: {
      "process.env.IS_DEV": JSON.stringify(isDev),
      "__APP_VERSION__":    JSON.stringify("3.6.0"),
      "__BUILD_DATE__":     JSON.stringify(new Date().toISOString()),
      "__GIT_COMMIT__":     JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7) ?? "local"),
    },
    build: {
      // Raise warning limit (WASM glue is large by design)
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        external: ["/wasm/route-calculator/route_calculator.js"],
        output: {
          // ── Manual chunk splitting for better long-term caching ──────
          manualChunks(id: string) {
            // Leaflet → separate chunk (heavy, rarely changes)
            if (id.includes('leaflet')) return 'vendor-leaflet';
            // Geo-math utilities (use actual file names)
            if (
              id.includes('/utils/SpatialHash') ||
              id.includes('/utils/coordinateFinder') ||
              id.includes('/utils/CoordinateFinder') ||
              id.includes('/utils/CoordinatesStore')
            ) return 'geo-math';
            // Virtual list utility
            if (id.includes('/utils/virtualList')) return 'virtual-list';
            // i18n → separate chunk
            if (id.includes('/i18n/') || id.includes('/utils/i18n')) return 'i18n';
          },
        },
      },
      // Enable CSS code splitting (already default, but explicit)
      cssCodeSplit: true,
      // Target modern browsers for smaller output
      target: ['es2020', 'chrome87', 'firefox78', 'safari14'],
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
    // Dev server optimizations
    optimizeDeps: {
      exclude: ['@astrojs/vercel'],
    },
  },
})

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
  vite: {
    define: {
      "process.env.IS_DEV": JSON.stringify(isDev),
      "__APP_VERSION__":    JSON.stringify("2.0.0-nexus-prime"),
      "__BUILD_DATE__":     JSON.stringify(new Date().toISOString()),
      "__GIT_COMMIT__":     JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7) ?? "8c6c4d5"),
    },
    build: {
      rollupOptions: {
        external: ["/wasm/route-calculator/route_calculator.js"],
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
  },
})

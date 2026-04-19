import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/verification/**',
      '**/*.spec.ts', // Exclude Playwright specs from Vitest
    ],
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@consts': path.resolve(__dirname, './src/consts.ts'),
      '@types': path.resolve(__dirname, './src/types.ts'),
    },
  },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './verification',
  outputDir: './test-results',
  use: {
    baseURL: 'http://localhost:4321',
  },
  reporter: 'list',
});

import { defineConfig } from '@playwright/test';

// Extensions need a headed Chromium persistent context (see e2e/fixtures.ts).
// Run `pnpm build` first; tests load dist/chrome.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  retries: process.env.CI ? 1 : 0,
});

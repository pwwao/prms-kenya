// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                       // serial — e2e shares state
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['github'],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'API E2E', use: {} },
  ],
});

import { defineConfig } from '@playwright/test';

if (!/^[a-f0-9]{32}$/.test(process.env.HB_E2E_RUN_ID ?? '') || process.cwd() !== '/work' || !/^G-\d{2}[abc]?$/.test(process.env.HB_G_CASE ?? '')) throw Error('G_ISOLATED_CASE_REQUIRED');
export default defineConfig({
  testDir: './tests/closing-e2e', workers: 1, fullyParallel: false, retries: 0, forbidOnly: true, timeout: 90_000,
  reporter: [['./tests/e2e/support/closing-reporter.ts']], outputDir: '/work/test-results/g-artifacts',
  use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', locale: 'en-US', timezoneId: 'Europe/Berlin',
    viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', trace: 'off', video: 'off', screenshot: 'off',
    actionTimeout: 10_000, navigationTimeout: 20_000 },
  webServer: { command: 'node --import tsx tests/e2e/support/closing-server.ts', url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: false, timeout: 60_000, gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 } },
});

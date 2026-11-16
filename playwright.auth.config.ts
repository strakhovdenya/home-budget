import { defineConfig } from '@playwright/test';

if (!/^[0-9a-f]{32}$/.test(process.env.HB_E2E_RUN_ID ?? '') || process.cwd() !== '/work' || !process.env.AUTH_SECRET) {
  throw new Error('B_ISOLATED_AUTH_RUN_REQUIRED');
}

export default defineConfig({
  testDir: './tests/auth-e2e', workers: 1, fullyParallel: false, retries: 0,
  timeout: 90_000, forbidOnly: true,
  reporter: [['./tests/e2e/support/reporter.ts']],
  outputDir: '/work/test-results/b-artifacts',
  use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', locale: 'en-US',
    viewport: { width: 1280, height: 900 }, timezoneId: 'Europe/Berlin', serviceWorkers: 'block',
    trace: 'off', video: 'off', screenshot: 'off' },
  webServer: { command: 'node --import tsx tests/e2e/support/server.ts', url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: false, timeout: 60_000, gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 } },
});

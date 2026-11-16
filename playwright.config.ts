import { defineConfig } from '@playwright/test';

const runId = process.env.HB_E2E_RUN_ID;
if (!runId || !/^[0-9a-f]{32}$/.test(runId) || process.cwd() !== '/work') {
  throw new Error('Use test:e2e; direct unisolated Playwright execution is refused');
}

export default defineConfig({
  testDir: './tests/e2e', workers: 1, fullyParallel: false, retries: 0,
  timeout: 30_000, forbidOnly: true,
  reporter: [['line'], ['json', { outputFile: '/work/test-results/results.json' }]],
  outputDir: '/work/test-results/artifacts',
  use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', viewport: { width: 1280, height: 900 },
    locale: 'en-US', timezoneId: 'Europe/Berlin', serviceWorkers: 'block', trace: 'off', video: 'off', screenshot: 'off' },
  webServer: {
    command: 'node --import tsx scripts/e2e/server.ts', url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: false, timeout: 60_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
  },
});

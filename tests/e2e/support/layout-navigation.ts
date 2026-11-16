import { test, type Page } from '@playwright/test';

// Do not tear down a routed WebKit document while its real RSC prefetches are
// pending. No requests are suppressed and the pageerror guard remains strict.
export async function layoutGoto(page: Page, path: string) {
  if (page.url() !== 'about:blank') await page.waitForLoadState('networkidle', { timeout: 15000 });
  test.info().annotations.push({ type: 'navigation-drain', description: 'Real network idle before hard navigation; no request suppression/retry' });
  await page.goto(path);
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}

export async function layoutReload(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}

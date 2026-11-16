import { test, expect } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { readFileSync, writeFileSync } from 'node:fs';
import { sessionCookieName, syntheticOwner } from '../e2e/support/session';
import { identity } from '../e2e/support/onboarding-proof';
import { hydrated, noWrite } from '../e2e/support/proof';
import { quiet, response, type Fixture } from '../e2e/support/history-proof';
import ru from '../../src/shared/i18n/messages/ru.json' with { type: 'json' };
import de from '../../src/shared/i18n/messages/de.json' with { type: 'json' };
import en from '../../src/shared/i18n/messages/en.json' with { type: 'json' };

for (const locale of ['ru', 'de', 'en'] as const) {
  for (const width of [320, 375, 1280]) {
    test(`H-FILTERS ${locale} ${width} complete label focus filter clear refresh no-write`, async ({ browser }) => {
      const messages = { ru, de, en }[locale].financialHistory;
      const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:3000', locale, timezoneId: 'Europe/Berlin',
        viewport: { width, height: ({ 320: 800, 375: 812, 1280: 900 } as Record<number, number>)[width] }, serviceWorkers: 'block',
      });
      await context.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:3000'
        ? route.continue() : route.abort());
      const token = await encode({ secret: process.env.AUTH_SECRET!, salt: sessionCookieName, maxAge: 300,
        token: { sub: await identity(), googleSubject: syntheticOwner.subject, email: syntheticOwner.email } });
      await context.addCookies([
        { name: sessionCookieName, value: token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' },
        { name: 'home-budget-locale', value: locale, domain: '127.0.0.1', path: '/', sameSite: 'Lax' },
      ]);
      const page = await context.newPage();
      const fixture = JSON.parse(readFileSync('/work/test-results/h-fixture.json', 'utf8')) as Fixture;
      try {
        await noWrite(`H_R02_${locale}_${width}`, async () => {
          await page.goto('/history');
          const input = page.getByLabel(messages.month, { exact: true });
          await hydrated(input);
          await quiet(page);
          const label = await input.evaluate(element => {
            const label = (element as HTMLInputElement).labels?.[0];
            if (!label) throw Error('H_HISTORY_FILTER_LABEL_REQUIRED');
            const bounds = label.getBoundingClientRect();
            const inputBounds = element.getBoundingClientRect();
            const style = getComputedStyle(label);
            return { text: label.textContent, width: label.clientWidth, scrollWidth: label.scrollWidth,
              overflow: style.overflowX, above: bounds.bottom <= inputBounds.top,
              visible: bounds.width > 0 && bounds.height > 0, forId: label.htmlFor, id: element.id };
          });
          test.info().annotations.push({ type: 'history-filter-label', description: JSON.stringify({ locale, viewportWidth: width, ...label }) });
          expect(['hidden', 'clip'].includes(label.overflow) && label.scrollWidth > label.width + 1,
            'H_HISTORY_FILTER_NOT_CLIPPED').toBe(false);
          expect(label.scrollWidth).toBeLessThanOrEqual(label.width + 1);
          expect(label.visible && label.above && !!label.id && label.forId === label.id).toBe(true);
          await expect(input).toHaveAccessibleName(messages.month);
          await page.locator('label').filter({ hasText: messages.month }).click();
          await expect(input).toBeFocused();
          await input.fill(fixture.calendar.m);
          await response(page, { month: fixture.calendar.m }, () => page.getByRole('button', { name: messages.refresh, exact: true }).click());
          await expect(input).toHaveValue(fixture.calendar.m);
          await expect(page.locator('ol > li')).not.toHaveCount(0);
          await input.fill('');
          await response(page, { month: null }, () => page.getByRole('button', { name: messages.refresh, exact: true }).click());
          await expect(page.locator('ol > li')).toHaveCount(20);
          await expect(page.getByRole('button', { name: messages.next, exact: true })).toBeEnabled();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        });
      } finally {
        await page.screenshot({ path: '/work/test-results/h-layout.png', fullPage: true });
        writeFileSync('/work/test-results/h-layout.json', JSON.stringify({ scope: 'H-R02 nine independent regressions', browser: browser.version() }));
        await context.close();
      }
    });
  }
}

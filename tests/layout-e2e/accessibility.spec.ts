import { test, expect, type Page, type Locator } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { readFileSync, writeFileSync } from 'node:fs';
import { sessionCookieName, syntheticOwner } from '../e2e/support/session';
import { identity } from '../e2e/support/onboarding-proof';
import { actionFrom, argsOf, database, noWrite, resultOf } from '../e2e/support/proof';
import { monitor, quiet, type Fixture } from '../e2e/support/history-proof';
import { activate, auditAccessibility, tabTo, typeText } from '../e2e/support/accessibility';
import ru from '../../src/shared/i18n/messages/ru.json' with { type: 'json' };
import de from '../../src/shared/i18n/messages/de.json' with { type: 'json' };
import en from '../../src/shared/i18n/messages/en.json' with { type: 'json' };

const name = process.env.HB_H_CASE!;
let locale: 'ru' | 'de' | 'en' = 'ru';
if (name.startsWith('H-DE')) locale = 'de';
if (name.startsWith('H-EN')) locale = 'en';
const messages = { ru, de, en }[locale];
let theme: 'light' | 'dark' | 'system' = 'system';
if (name.includes('-A11Y-LIGHT')) theme = 'light';
if (name.includes('-A11Y-DARK')) theme = 'dark';

test(`${name} MVP accessibility smoke: keyboard names required focus error and axe`, async ({ browser }, info) => {
  const context = await browser.newContext({ ...info.project.use, colorScheme: theme === 'light' ? 'light' : 'dark' });
  // An existing browser preference is fixture setup, like locale/viewport. Core
  // keyboard journeys never invoke an application handler through evaluate().
  await context.addInitScript(mode => {
    if (location.origin === 'http://127.0.0.1:3000') localStorage.setItem('home-budget-mode', mode);
  }, theme);
  let external = 0;
  const errors: string[] = [];
  const stages: string[] = [];
  const axeStages = new Set(['onboarding-unknown', 'onboarding-error', 'update-form', 'history-index', 'keyboard-report-version']);
  await context.route('**/*', async route => {
    if (new URL(route.request().url()).origin === 'http://127.0.0.1:3000') await route.continue();
    else { external++; await route.abort(); }
  });
  await context.addCookies([{ name: 'home-budget-locale', value: locale, domain: '127.0.0.1', path: '/', sameSite: 'Lax' }]);
  const page = await context.newPage();
  monitor(page);
  page.on('pageerror', error => errors.push(error.message));
  const audit = async (stage: string) => {
    stages.push(stage);
    await expect(page.locator('html')).toHaveAttribute('data-mui-color-scheme', theme === 'system' ? 'dark' : theme);
    if (axeStages.has(stage)) await auditAccessibility(page, stage);
  };
  try {
    if (!name.endsWith('-FIRST')) {
      await noWrite('I_LOGIN_READ', async () => {
        await page.goto('/login?error=AccessDenied');
        await audit('login-error');
        await tabTo(page, page.getByRole('button', { name: messages.auth.login, exact: true }));
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: messages.auth.login, exact: true })).toBeFocused();
      });
    }
    const token = await encode({ secret: process.env.AUTH_SECRET!, salt: sessionCookieName, maxAge: 600,
      token: { sub: await identity(), googleSubject: syntheticOwner.subject, email: syntheticOwner.email } });
    await context.addCookies([{ name: sessionCookieName, value: token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    if (name.endsWith('-FIRST')) await writeJourney(page, audit);
    else await noWrite('I_READ_NAVIGATION_THEMES_REPORTS', async () => {
      await page.goto('/history');
      await quiet(page);
      await expect(page.locator('ol > li')).toHaveCount(20);
      await audit('history-index');
      if (info.project.use.viewport!.width < 900) {
        const openMenu = page.getByRole('button', { name: messages.shell.openMenu, exact: true });
        await activate(page, openMenu);
        const dialog = page.getByRole('dialog', { name: messages.shell.navigation, exact: true });
        await expect(dialog).toBeVisible();
        await audit('navigation-dialog');
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Shift+Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(openMenu).toBeFocused();
      }
      const refresh = page.getByRole('button', { name: messages.financialHistory.refresh, exact: true });
      await activate(page, refresh);
      await quiet(page);
      await expect(page.getByRole('status')).toContainText(messages.financialHistory.progress.replace('{page}', '1').replace('{count}', '20'));
      await activate(page, page.getByRole('button', { name: messages.financialHistory.next, exact: true }));
      await quiet(page);
      await activate(page, page.getByRole('button', { name: messages.financialHistory.previous, exact: true }));
      await quiet(page);
      await activate(page, page.locator('ol > li').first().getByRole('button', { name: messages.financialHistory.open, exact: true }));
      const detailHeading = page.locator('#history-detail-heading');
      await expect(detailHeading).toBeFocused();
      await activate(page, page.getByRole('button', { name: messages.financialHistory.sourceFacts, exact: true }));
      await quiet(page);
      await expect(detailHeading).toBeFocused();
      const fixture = JSON.parse(readFileSync('/work/test-results/h-fixture.json', 'utf8')) as Fixture;
      await page.goto('/months?period=' + fixture.calendar.m + '&version=1');
      await quiet(page);
      const version = page.getByRole('link', { name: new RegExp('^' + messages.monthClosing.version.replace('{n}', '2') + '\\b') });
      await activate(page, version);
      await expect(page.getByRole('heading', { name: messages.monthClosing.version.replace('{n}', '2'), exact: true })).toBeVisible();
      await audit('keyboard-report-version');
    });
    expect(errors, 'I_NO_RENDER_ERRORS').toEqual([]);
    expect(external, 'I_NO_EXTERNAL_REQUESTS').toBe(0);
    expect(await page.evaluate(async () => ({
      keys: [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(key => key !== 'home-budget-mode'),
      workers: (await navigator.serviceWorker.getRegistrations()).length,
      databases: (await indexedDB.databases()).length,
    }))).toEqual({ keys: [], workers: 0, databases: 0 });
  } finally {
    await page.screenshot({ path: '/work/test-results/h-layout.png', fullPage: true });
    writeFileSync('/work/test-results/h-layout.json', JSON.stringify({ case: name, browser: browser.browserType().name(),
      version: browser.version(), theme, stages, errors, external, physicalAT: 'NOT EXECUTED', nativeZoom: 'NOT EXECUTED' }));
    await context.close();
  }
});

async function commit(page: Page, button: Locator) {
  const waiting = page.waitForResponse(response => response.request().method() === 'POST' && !!response.request().headers()['next-action']);
  await activate(page, button);
  const response = await waiting;
  await response.finished();
  const result = resultOf(await response.text());
  expect(result?.ok, 'I_REAL_CONFIRM').toBe(true);
  const command = argsOf(actionFrom(response.request()))[0] as { requestId: string };
  await database(async client => {
    const rows = (await client.query('SELECT result FROM budget_updates WHERE request_id=$1', [command.requestId])).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toEqual(result!.value);
  });
  await quiet(page);
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}

async function writeJourney(page: Page, audit: (stage: string) => Promise<void>) {
  const first = messages.firstRun;
  const update = messages.budgetUpdate;
  const amount = (value: number) => new Intl.NumberFormat(locale, { useGrouping: false, minimumFractionDigits: 2 }).format(value);
  await page.goto('/');
  const bank = page.getByRole('textbox', { name: update.balance, exact: true });
  await tabTo(page, bank);
  await audit('onboarding-unknown');
  await expect(bank).toHaveAttribute('required', '');
  await noWrite('I_KEYBOARD_FORM_INVALID_REVIEW_CANCEL', async () => {
    await typeText(page, bank, amount(1000.01));
    await typeText(page, page.getByRole('textbox', { name: update.allocated, exact: true }), amount(1000));
    await activate(page, page.getByRole('checkbox', { name: first.consent, exact: true }), 'Space');
    await activate(page, page.getByRole('button', { name: first.review, exact: true }));
    const error = page.getByRole('alert').filter({ hasText: first.error });
    await expect(error).toBeVisible();
    await expect(error).toBeFocused();
    await audit('onboarding-error');
    await typeText(page, page.getByRole('textbox', { name: update.allocated, exact: true }), amount(1000.01));
    await activate(page, page.getByRole('button', { name: first.review, exact: true }));
    await expect(page.getByRole('heading', { name: first.reviewTitle, exact: true })).toBeFocused();
    await audit('onboarding-review');
    await activate(page, page.getByRole('button', { name: first.edit, exact: true }));
    await expect(bank).toBeFocused();
    await activate(page, page.getByRole('button', { name: first.review, exact: true }));
  });
  await commit(page, page.getByRole('button', { name: first.confirm, exact: true }));
  await expect(page.locator('#safe-heading')).toHaveCount(1);
  await expect(page.locator('#safe-heading')).toBeVisible();
  await noWrite('I_UPDATE_OPEN_REVIEW', async () => {
    await page.goto('/update-budget');
    await tabTo(page, page.getByRole('textbox', { name: update.balance, exact: true }));
    await audit('update-form');
    for (const editor of [
      { add: update.addObligation, group: update.obligation },
      { add: update.addSaving, group: update.saving },
    ]) {
      await activate(page, page.getByRole('button', { name: editor.add, exact: true }));
      const group = page.getByRole('group', { name: editor.group, exact: true });
      await tabTo(page, group.getByRole('textbox', { name: update.name, exact: true }));
      await audit('editor-' + editor.group);
      await activate(page, group.getByRole('button', { name: update.remove, exact: true }));
      await expect(group).toHaveCount(0);
    }
    await activate(page, page.getByRole('checkbox', { name: update.vectorConsent, exact: true }), 'Space');
    const order = page.getByRole('checkbox', { name: update.orderConsent, exact: true });
    if (await order.count()) await activate(page, order, 'Space');
    await activate(page, page.getByRole('button', { name: update.preview, exact: true }));
    await expect(page.getByRole('button', { name: update.confirm, exact: true })).toBeVisible();
    await audit('update-review');
  });
  await commit(page, page.getByRole('button', { name: update.confirm, exact: true }));
  await expect(page.getByRole('status').filter({ hasText: update.saved })).toBeFocused();
  await audit('update-saved');
}

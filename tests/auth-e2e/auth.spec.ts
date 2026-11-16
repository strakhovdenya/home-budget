import { test, expect, type Browser, type Page } from '@playwright/test';
import en from '../../src/shared/i18n/messages/en.json' with { type: 'json' };
import { installSession, sessionCookieName, syntheticOwner } from '../e2e/support/session';
import { actionFrom, argsOf, assertTestOnlyBundleBoundary, capture, database, forgedRequest, hydrated, invoke, noWrite, resultOf, type Action } from '../e2e/support/proof';

const origin = 'http://127.0.0.1:3000';
type Packets = Record<'load' | 'preview' | 'confirm' | 'status' | 'history' | 'open' | 'detail' | 'report', Action>;
let packets: Packets;
let foreign: { owner: string; account: string; request: string; batch: string; report: string; reportBatch: string };
let ownedRequest: string, past: string;

async function localContext(browser: Browser) {
  const context = await browser.newContext({ baseURL: origin, serviceWorkers: 'block',
    viewport: { width: 1280, height: 900 }, locale: 'en-US', timezoneId: 'Europe/Berlin' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  return context;
}
async function prepareReview(page: Page) {
  await page.goto('/update-budget');
  // Accessible role locators exclude hidden retained React trees and remain
  // strict if two simultaneously accessible controls actually exist.
  await expect(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true })).toBeVisible();
  await hydrated(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true }));
  await page.getByRole('checkbox', { name: en.budgetUpdate.vectorConsent, exact: true }).check();
  const order = page.getByRole('checkbox', { name: en.budgetUpdate.orderConsent, exact: true });
  if (await order.count()) await order.check();
  const action = await capture(page, () => page.getByRole('button', { name: en.budgetUpdate.preview, exact: true }).click());
  await expect(page.getByRole('button', { name: en.budgetUpdate.confirm, exact: true })).toBeVisible();
  return action;
}
function noDisclosure(body: string) {
  expect([foreign.owner, foreign.account, foreign.request, foreign.batch, foreign.report, foreign.reportBatch,
    'HB021 FORBIDDEN SENTINEL', '"654321"', '6,543.21', '6.543,21', '6 543,21'].some(value => body.includes(value)), 'B_NO_FOREIGN_DISCLOSURE').toBe(false);
}
function deniedResult(body: string, allowed: readonly string[]) {
  const value = resultOf(body);
  expect(value?.ok === false && allowed.includes(String(value.code)) &&
    Object.keys(value).sort().join(',') === 'code,ok', 'B_DENIAL_HAS_NO_DATA_PAYLOAD').toBe(true);
}
async function forbidden(page: Page, action: Action, label = 'B_DIRECT_AUTH') {
  await noWrite(label, async () => {
    const response = await invoke(page, action); noDisclosure(response.body);
    expect(['Synthetic owned reserve', 'Synthetic owned saving', ownedRequest].some(value => response.body.includes(value)), 'B_NO_OWNED_DATA_ON_AUTH_DENIAL').toBe(false);
    deniedResult(response.body, ['FORBIDDEN', 'UNAUTHORIZED']);
  });
}

test.beforeAll(async ({ browser }) => {
  assertTestOnlyBundleBoundary();
  await database(async client => {
    const users = await client.query('SELECT count(*)::int n FROM users WHERE email_verified');
    expect(users.rows[0].n === 1, 'B_ONE_ADMITTED_OWNER').toBe(true);
    const f = (await client.query(`SELECT a.id account,a.owner_user_id owner,u.request_id request,u.id batch,
      c.id report,c.budget_update_id AS "reportBatch" FROM accounts a
      JOIN budget_updates u ON u.account_id=a.id AND u.kind='BUDGET_UPDATE'
      JOIN month_closings c ON c.account_id=a.id
      WHERE a.id='10000000-0000-4000-8000-000000000004' ORDER BY u.recorded_seq DESC LIMIT 1`)).rows[0];
    if (!f) throw new Error('B_NONEMPTY_FOREIGN_FIXTURE_REQUIRED'); foreign = f;
    ownedRequest = (await client.query(`SELECT request_id FROM budget_updates WHERE account_id=$1 AND kind='BUDGET_UPDATE' ORDER BY recorded_seq DESC LIMIT 1`, [syntheticOwner.accountId])).rows[0].request_id;
    past = (await client.query(`SELECT p.period FROM month_closings c JOIN budget_periods p ON p.id=c.period_id WHERE c.account_id=$1`, [syntheticOwner.accountId])).rows[0].period;
    for (const table of ['audit_events', 'budget_updates', 'obligation_events', 'savings_events', 'month_closings', 'report_heads']) {
      const n = (await client.query('SELECT count(*)::int n FROM ' + table)).rows[0].n;
      expect(n > 0, 'B_NONEMPTY_EVIDENCE_' + table).toBe(true);
    }
  });
  const context = await localContext(browser); await installSession(context);
  const page = await context.newPage();
  try {
    await noWrite('B_BROWSER_PACKET_CAPTURE', async () => {
      await database(async client => {
        let code: unknown;
        try { await client.query('SELECT id FROM accounts FOR UPDATE'); }
        catch (error) { code = (error as { code?: unknown }).code; }
        expect(code === '42501', 'B_RUNTIME_ROW_LOCK_REQUIRES_FORBIDDEN_UPDATE_GRANT').toBe(true);
        test.info().annotations.push({ type: 'runtime-permission', description: 'SELECT works; SELECT FOR UPDATE refuses SQLSTATE 42501; runtime grants unchanged' });
      });
      await page.goto('/update-budget');
      await expect(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true })).toBeVisible();
      await hydrated(page.getByRole('button', { name: en.budgetUpdate.reloadBase, exact: true }));
      const load = await capture(page, () => page.getByRole('button', { name: en.budgetUpdate.reloadBase, exact: true }).click());
      await expect(page.getByRole('button', { name: en.budgetUpdate.reloadBase, exact: true })).toBeEnabled();
      const preview = await prepareReview(page);
      let confirm!: Action;
      await page.route('**/update-budget', async route => {
        if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
          confirm = actionFrom(route.request()); await route.abort();
        } else await route.continue();
      });
      await page.getByRole('button', { name: en.budgetUpdate.confirm, exact: true }).click();
      await expect(page.getByRole('button', { name: en.budgetUpdate.checkResult, exact: true })).toBeVisible();
      await page.unroute('**/update-budget');
      const status = await capture(page, () => page.getByRole('button', { name: en.budgetUpdate.checkResult, exact: true }).click());
      await expect(page.getByRole('button', { name: en.budgetUpdate.checkResult, exact: true })).toBeEnabled();
      const history = await capture(page, () => page.getByRole('button', { name: en.budgetUpdate.history, exact: true }).click());
      await expect(page.getByRole('button', { name: en.budgetUpdate.history, exact: true })).toBeEnabled();
      // Close the intentionally uncommitted/UNKNOWN draft; no fake response or commit.
      await page.close();
      const historyPage = await context.newPage();
      const open = await capture(historyPage, () => historyPage.goto('/history'));
      const openButton = historyPage.getByRole('button', { name: en.financialHistory.open, exact: true }).first();
      await expect(openButton).toBeEnabled();
      await hydrated(openButton);
      const detailRequest = historyPage.waitForRequest(r => r.method() === 'POST' && !!r.headers()['next-action'] && (r.postData() ?? '').includes('ORIGINAL'));
      await openButton.click(); const request = await detailRequest, detail = actionFrom(request);
      const response = await request.response();
      if (!response) throw new Error('B_HISTORY_DETAIL_RESPONSE_REQUIRED');
      await response.finished();
      expect(resultOf(await response.text())?.ok === true, 'B_OWNED_HISTORY_DETAIL_POSITIVE_CONTROL').toBe(true);
      await expect(historyPage.locator('#history-detail-heading')).toBeVisible();
      // History and closing reads deliberately share transient per-account admission.
      // A visible detail heading precedes the read completion; finish that read before
      // opening another report so setup does not race the actual production guard.
      const reportEntry = historyPage.getByRole('listitem').filter({ hasText: 'MONTH_CLOSE' });
      const reportRequest = historyPage.waitForRequest(r => r.method() === 'POST' && !!r.headers()['next-action'] && (r.postData() ?? '').includes('"REPORT"'));
      await reportEntry.getByRole('button', { name: en.financialHistory.open, exact: true }).click();
      const reportRead = await reportRequest, report = actionFrom(reportRead), reportResponse = await reportRead.response();
      if (!reportResponse) throw new Error('B_HISTORY_REPORT_RESPONSE_REQUIRED');
      await reportResponse.finished();
      expect(resultOf(await reportResponse.text())?.ok === true, 'B_OWNED_HISTORY_REPORT_POSITIVE_CONTROL').toBe(true);
      packets = { load, preview, confirm, status, history, open, detail, report };
      expect(Object.values(packets).every(p => p.id && p.body), 'B_REAL_BROWSER_ACTIONS_CAPTURED').toBe(true);
    });
  } finally { await context.close(); }
});

test('B-01 HB20-B04 / HBH-006 valid offline session: real reads, reload and scoped status', async ({ browser }) => {
  const context = await localContext(browser); await installSession(context);
  const page = await context.newPage();
  try { await noWrite('B_VALID_RELOAD_READS', async () => {
    await page.goto('/update-budget'); await expect(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true })).toBeVisible();
    await page.reload(); await expect(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true })).toBeVisible();
    const session = await page.evaluate(async () => {
      const value = await (await fetch('/api/auth/session')).json();
      return { authenticated: !!value?.user?.id, userKeys: Object.keys(value?.user ?? {}).sort().join(','),
        providerSecrets: ['access_token', 'refresh_token', 'id_token'].some(k => k in value || k in (value?.user ?? {})) };
    });
    expect(session.authenticated && session.userKeys === 'email,id' && !session.providerSecrets, 'B_REAL_AUTHJS_SESSION_PROJECTION').toBe(true);
    const load = resultOf((await invoke(page, packets.load)).body);
    expect(load?.ok === true, 'B_OWNED_READ_POSITIVE_CONTROL').toBe(true);
    const own = resultOf((await invoke(page, packets.status, [ownedRequest])).body);
    test.info().annotations.push({ type: 'receipt-status', description: JSON.stringify({ ok: own?.ok, code: own?.code ?? null, valuePresent: own?.value != null }) });
    expect.soft(own?.ok === true && own.value !== null, 'B_OWNED_RECEIPT_POSITIVE_CONTROL').toBe(true);
    for (const key of ['detail', 'report'] as const) {
      expect(resultOf((await invoke(page, packets[key])).body)?.ok === true, 'B_OWNED_' + key + '_POSITIVE_CONTROL').toBe(true);
    }
    for (const path of ['/', '/history', '/months', '/obligations', '/savings', '/settings']) {
      await page.goto(path); expect(new URL(page.url()).pathname !== '/login', 'B_AUTHENTICATED_ROUTE').toBe(true);
      noDisclosure(await page.locator('body').innerText());
    }
    const stored = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter(k => k !== 'home-budget-mode'));
    expect(stored.length === 0, 'B_NO_FINANCIAL_BROWSER_STORAGE').toBe(true);
    expect(await page.evaluate(async () => (await indexedDB.databases()).length) === 0, 'B_NO_FINANCIAL_INDEXEDDB').toBe(true);
  }); } finally { await context.close(); }
});

const variants = [
  { id: 'B-02 anonymous', anonymous: true },
  { id: 'B-03 expired', maxAge: -120 },
  { id: 'B-04 corrupt JWE', corrupt: true },
  { id: 'B-05 changed Google subject', claims: { googleSubject: 'wrong-subject' } },
  { id: 'B-06 wrong email', claims: { email: 'foreign@example.test' } },
  { id: 'B-07 missing claim', claims: { googleSubject: undefined } },
  { id: 'B-08 malformed internal id', claims: { sub: 'not-a-uuid' } },
  { id: 'B-09 missing DB identity', claims: { sub: '10000000-0000-4000-8000-000000000099' } },
  { id: 'B-10 stored DB subject differs from signed claims', claims: { sub: '10000000-0000-4000-8000-000000000003' } },
  { id: 'B-11 DB identity unverified', claims: { sub: '10000000-0000-4000-8000-000000000003', googleSubject: 'hb021-foreign-changed-subject' } },
] as const;
for (const variant of variants) test(variant.id + ' — HBUX-023/HB20-A03/B04 per-operation auth and exact no-write', async ({ browser }) => {
  const context = await localContext(browser), page = await context.newPage();
  const install = async () => { if ('anonymous' in variant) await context.clearCookies(); else await installSession(context, variant); };
  try { await noWrite(variant.id, async () => {
    // Read raw SSR independently: Chromium may discard the original navigation
    // response body after Next's streamed redirect. This is the real local HTTP
    // endpoint, with the same context cookies, no redirect following or mock.
    await install(); const response = await context.request.get(origin + '/update-budget', { maxRedirects: 0 });
    const html = await response.text(); noDisclosure(html);
    expect(['Synthetic owned reserve', 'Synthetic owned saving', ownedRequest].some(value => html.includes(value)), 'B_NO_PRIVATE_SSR_DATA').toBe(false);
    await install(); await page.goto('/update-budget'); await expect(page).toHaveURL(/\/login$/);
    expect(await page.locator('input[name="balance"]').count() === 0, 'B_NO_UNAUTHORIZED_FORM_INCLUDING_HIDDEN').toBe(true);
    for (const key of ['load', 'preview', 'confirm', 'status', 'history', 'open', 'detail', 'report'] as const) {
      // Reinstall each invalid JWE: a preceding denial may clear the cookie.
      await install(); await forbidden(page, packets[key], variant.id + '_' + key);
    }
  }); } finally { await context.close(); }
});

test('B-12 HBH-006/HBUX-023 foreign owner/account/source/report/request cannot retarget a read', async ({ browser }) => {
  const context = await localContext(browser); await installSession(context); const page = await context.newPage();
  try { await noWrite('B_FOREIGN_SCOPE', async () => {
    await page.goto('/update-budget');
    const preview = argsOf(packets.preview)[0] as Record<string, unknown>;
    expect(!!preview && typeof preview === 'object' && typeof preview.requestId === 'string' &&
      !!preview.payload && typeof preview.payload === 'object', 'B_CAPTURED_VALID_PREVIEW_ARGUMENT').toBe(true);
    for (const field of ['ownerUserId', 'accountId']) {
      const reply = await noWrite('B_FOREIGN_' + field, () => invoke(page, packets.preview,
        [{ ...preview, [field]: field === 'accountId' ? foreign.account : foreign.owner }]));
      noDisclosure(reply.body); expect(resultOf(reply.body)?.ok === false, 'B_FORGED_SCOPE_REFUSED').toBe(true);
      deniedResult(reply.body, ['FORBIDDEN', 'INVALID_INPUT']);
    }
    const status = await noWrite('B_FOREIGN_REQUEST', () => invoke(page, packets.status, [foreign.request])); noDisclosure(status.body);
    const s = resultOf(status.body); expect.soft(s?.code === 'FORBIDDEN' || s?.ok === true && s.value === null, 'B_FOREIGN_STATUS_ABSENT').toBe(true);
    const history = await noWrite('B_FOREIGN_BATCH', () => invoke(page, packets.history, [foreign.batch])); noDisclosure(history.body);
    const h = resultOf(history.body); expect.soft(h?.code === 'FORBIDDEN' || h?.ok === true && Array.isArray(h.value) && h.value.length === 0, 'B_FOREIGN_UPDATE_ABSENT').toBe(true);
    test.info().annotations.push({ type: 'foreign-status-history', description: JSON.stringify({ status: s?.code ?? null, history: h?.code ?? null }) });
    const detail = argsOf(packets.detail)[0] as Record<string, unknown>;
    expect(!!detail && typeof detail === 'object' && !!detail.basis && typeof detail.batchId === 'string', 'B_CAPTURED_VALID_DETAIL_ARGUMENT').toBe(true);
    for (const [batchId, perspective] of [[foreign.batch, 'SOURCE'], [foreign.reportBatch, 'REPORT']]) {
      const reply = await noWrite('B_FOREIGN_' + perspective, () => invoke(page, packets.detail, [{ ...detail, batchId, perspective }]));
      noDisclosure(reply.body); expect(resultOf(reply.body)?.code === 'FORBIDDEN', 'B_FOREIGN_HISTORY_MEMBERSHIP_REFUSED').toBe(true);
      deniedResult(reply.body, ['FORBIDDEN']);
    }
    const query = argsOf(packets.report)[0] as Record<string, unknown>;
    expect(!!query && typeof query === 'object' && !!query.basis && typeof query.batchId === 'string' && query.perspective === 'REPORT', 'B_CAPTURED_VALID_REPORT_ARGUMENT').toBe(true);
    const report = await noWrite('B_FOREIGN_REPORT_SELECTOR', () => invoke(page, packets.report, [{ ...query, reportId: foreign.report, accountId: foreign.account }]));
    noDisclosure(report.body); expect(['FORBIDDEN', 'INVALID_INPUT', 'REPORT_PROOF_INVALID'].includes(String(resultOf(report.body)?.code)), 'B_REPORT_HAS_NO_FOREIGN_SELECTOR').toBe(true);
    deniedResult(report.body, ['FORBIDDEN', 'INVALID_INPUT', 'REPORT_PROOF_INVALID']);
  }); } finally { await context.close(); }
});

test('B-13 HB20-B04 expired session on an already-open financial form reauthorizes preview and confirm', async ({ browser }) => {
  const context = await localContext(browser); await installSession(context); const page = await context.newPage();
  try { await noWrite('B_OPEN_FORM_EXPIRY', async () => {
    await prepareReview(page);
    await installSession(context, { maxAge: -120 });
    await noWrite('B_EXPIRED_FORM_CONFIRM', async () => {
      await page.getByRole('button', { name: en.budgetUpdate.confirm, exact: true }).click();
      await expect(page.getByText(en.budgetUpdate.errors.access, { exact: true })).toBeVisible();
    });
    await installSession(context); await page.reload();
    await expect(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: en.budgetUpdate.vectorConsent, exact: true }).check();
    const order = page.getByRole('checkbox', { name: en.budgetUpdate.orderConsent, exact: true }); if (await order.count()) await order.check();
    await installSession(context, { maxAge: -120 });
    await noWrite('B_EXPIRED_FORM_PREVIEW', async () => {
      await page.getByRole('button', { name: en.budgetUpdate.preview, exact: true }).click();
      await expect(page.getByText(en.budgetUpdate.errors.access, { exact: true })).toBeVisible();
    });
  }); } finally { await context.close(); }
});

test('B-14 Next Origin/Host checks refuse forged captured action requests without writes', async ({ browser }) => {
  const context = await localContext(browser); await installSession(context);
  try { await noWrite('B_ORIGIN_HOST', async () => {
    const cases: Record<string, string>[] = [{ Origin: 'http://foreign.invalid' }, { Host: 'foreign.invalid' }, { 'X-Forwarded-Host': 'foreign.invalid' }];
    for (const headers of cases) {
      const response = await noWrite('B_HEADER_' + Object.keys(headers)[0], () => forgedRequest(context, packets.preview, headers));
      expect(response.status >= 400, 'B_NEXT_ORIGIN_HOST_REFUSAL').toBe(true); noDisclosure(response.body);
    }
  }); } finally { await context.close(); }
});

test('B-15 Auth.js HTTP signout requires CSRF, then genuine local signout clears session', async ({ browser }) => {
  const context = await localContext(browser); await installSession(context); const page = await context.newPage();
  try { await noWrite('B_CSRF', async () => {
    await page.goto('/settings');
    await page.evaluate(async () => { await fetch('/api/auth/signout', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: '' }); });
    await page.goto('/update-budget'); await expect(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true })).toBeVisible();
    await page.evaluate(async () => {
      await fetch('/api/auth/csrf');
      await fetch('/api/auth/signout', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'csrfToken=invalid' });
    });
    await page.goto('/update-budget'); await expect(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true })).toBeVisible();
    await page.evaluate(async () => {
      const { csrfToken } = await (await fetch('/api/auth/csrf')).json();
      await fetch('/api/auth/signout', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken, callbackUrl: '/login' }) });
    });
    expect((await context.cookies()).some(c => c.name === sessionCookieName), 'B_SESSION_COOKIE_CLEARED').toBe(false);
    await page.goto('/history'); await expect(page).toHaveURL(/\/login$/);
  }); } finally { await context.close(); }
});

test('B-16 HB20-B03/B04 local logout and fresh direct return stay closed; provider relogin NOT EXECUTED', async ({ browser }) => {
  const context = await localContext(browser); await installSession(context); const page = await context.newPage();
  try { await noWrite('B_UI_LOGOUT', async () => {
    await page.goto('/settings');
    await page.getByRole('button', { name: en.auth.logout, exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await context.cookies()).some(c => c.name === sessionCookieName), 'B_UI_LOGOUT_CLEARS_SESSION').toBe(false);
    await page.goto('/update-budget'); await expect(page).toHaveURL(/\/login$/);
    await forbidden(page, packets.load);
  }); } finally { await context.close(); }
});

test('B-17 authenticated immutable month report page and real chunk read remain required', async ({ browser }) => {
  const context = await localContext(browser); await installSession(context); const page = await context.newPage();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message.slice(0, 500)));
  try { await noWrite('B_CLOSED_MONTH_REPORT_ROUTE', async () => {
    const navigation = await page.goto('/months?period=' + past);
    expect(/^\d{4}-\d{2}$/.test(past), 'B_VALID_COMPLETED_PERIOD').toBe(true);
    expect(new URL(page.url()).pathname === '/months', 'B_AUTHENTICATED_REPORT_ROUTE').toBe(true);
    const body = await page.locator('body').innerText(); noDisclosure(body);
    const labels: string[] = [];
    function known(value: unknown, key = '') {
      if (typeof value === 'string' && value.length >= 8 && !value.includes('{') && body.includes(value)) labels.push(key);
      else if (value && typeof value === 'object') for (const [name, child] of Object.entries(value)) known(child, key ? key + '.' + name : name);
    }
    known(en);
    test.info().annotations.push({ type: 'report-screen', description: JSON.stringify({ status: navigation?.status(),
      bodyEmpty: body.length === 0, serverException: body.includes('server-side exception'),
      clientException: body.includes('client-side exception'), labels, errors }) });
    expect(navigation?.status() === 200, 'B_REPORT_HTTP_SUCCESS').toBe(true);
    const details = page.getByRole('button', { name: en.monthClosing.details, exact: true });
    await hydrated(details);
    const pending = page.waitForResponse(r => r.request().method() === 'POST' && !!r.request().headers()['next-action']);
    await details.click(); const response = await pending; await response.finished();
    expect(resultOf(await response.text())?.ok === true, 'B_OWNED_MONTH_CHUNK_POSITIVE_CONTROL').toBe(true);
    await expect(page.getByRole('heading', { name: en.monthClosing.details, exact: true })).toBeVisible();
    // Preserve explicit immutable version selection across a fresh server reload.
    await page.goto('/months?period=' + past + '&version=1');
    for (const reload of [false, true]) await noWrite('B_VERSION_ONE_RELOAD_' + reload, async () => {
      if (reload) await page.reload();
      await expect(page).toHaveURL(new RegExp('/months\\?period=' + past + '&version=1$'));
      await expect(page.getByRole('heading', { level: 1 })).toContainText(en.monthClosing.state.CLOSED);
      await expect(page.locator('input[name="balance"]')).toHaveCount(0);
      const selectedDetails = page.getByRole('button', { name: en.monthClosing.details, exact: true });
      await hydrated(selectedDetails);
      const selectedReply = page.waitForResponse(r => r.request().method() === 'POST' && !!r.request().headers()['next-action']);
      await selectedDetails.click(); const chunk = await selectedReply; await chunk.finished();
      const query = argsOf(actionFrom(chunk.request()))[0] as { period?: unknown; version?: unknown };
      expect(query.period === past && query.version === 1, 'B_PINNED_MONTH_AND_VERSION').toBe(true);
      expect(resultOf(await chunk.text())?.ok === true, 'B_RELOADED_VERSION_CHUNK').toBe(true);
      await expect(page.getByRole('heading', { name: en.monthClosing.details, exact: true })).toBeVisible();
      noDisclosure(await page.locator('body').innerText());
    });
    expect(errors.length === 0, 'B_NO_CLOSED_MONTH_BROWSER_ERROR').toBe(true);
    await page.getByRole('link', { name: en.budgetUpdate.transitionEntry, exact: true }).click();
    await expect(page.getByRole('textbox', { name: en.budgetUpdate.balance, exact: true })).toBeVisible();
  }); } finally {
    if (errors.length) test.info().annotations.push({ type: 'browser-errors', description: JSON.stringify(errors) });
    await context.close();
  }
});

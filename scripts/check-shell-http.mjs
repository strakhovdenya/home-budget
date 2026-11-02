// Run against a running dev or production server. No browser claims.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import console from 'node:console';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const routes = ['/', '/obligations', '/savings', '/months', '/settings'];
let checks = 0;
for (const locale of ['ru', 'de', 'en']) {
  const messages = JSON.parse(readFileSync(new URL(`../src/shared/i18n/messages/${locale}.json`, import.meta.url), 'utf8'));
  for (const route of routes) {
    const response = await globalThis.fetch(new URL(route, base), { redirect: 'manual', headers: { Cookie: `home-budget-locale=${locale}` } });
    assert.ok([303, 307].includes(response.status), `${route}: anonymous redirect`);
    assert.equal(new URL(response.headers.get('location'), base).pathname, '/login');
    checks++;
  }
  const response = await globalThis.fetch(new URL('/login', base), { headers: { Cookie: `home-budget-locale=${locale}` } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(`<html lang="${locale}"`), 'Login HTML language');
  assert.ok(new RegExp(`<h1[^>]*>${messages.auth.title}</h1>`).test(html), 'Translated login heading');
  assert.ok(html.includes(messages.auth.login), 'Google button');
  assert.ok(html.includes('home-budget-mode'), 'Early theme initialization');
  assert.ok(!html.includes('MISSING_MESSAGE'), 'No missing message');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  checks++;
  const missing = await globalThis.fetch(new URL('/missing-hb-005-page', base), { headers: { Cookie: `home-budget-locale=${locale}` } });
  assert.equal(missing.status, 404);
  assert.ok((await missing.text()).includes(messages.notFound.title), 'Translated 404');
  checks++;
}
for (const cookie of ['', 'home-budget-locale=invalid']) {
  const html = await (await globalThis.fetch(new URL('/login', base), { headers: { Cookie: cookie } })).text();
  assert.ok(html.includes('<html lang="ru"'), 'Russian fallback');
  checks++;
}
console.log(`HB-007 HTTP: ${checks} checks passed at ${base} (15 protected redirects + 3 localized login pages + 3 localized 404s + 2 fallbacks).`);

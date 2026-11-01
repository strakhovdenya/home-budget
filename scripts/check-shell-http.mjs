// Run against a running dev or production server. No browser claims.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import console from 'node:console';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const routes = { '/': 'overview', '/obligations': 'obligations', '/savings': 'savings', '/months': 'months', '/settings': 'settings' };
let checks = 0;
for (const locale of ['ru', 'de', 'en']) {
  const messages = JSON.parse(readFileSync(new URL(`../src/shared/i18n/messages/${locale}.json`, import.meta.url), 'utf8'));
  for (const [route, section] of Object.entries(routes)) {
    const response = await globalThis.fetch(new URL(route, base), { headers: { Cookie: `home-budget-locale=${locale}` } });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`<html lang="${locale}"`), `${route}: HTML lang`);
    assert.ok(new RegExp(`<h1[^>]*>${messages.navigation[section]}</h1>`).test(html), `${route}: translated heading`);
    assert.ok(html.includes(messages.screens[section].description), `${route}: translated description`);
    assert.ok(html.includes('home-budget-mode'), `${route}: early theme initialization`);
    assert.ok(!html.includes('MISSING_MESSAGE'), `${route}: missing message`);
    checks++;
  }
  const missing = await globalThis.fetch(new URL('/missing-hb-005-page', base), { headers: { Cookie: `home-budget-locale=${locale}` } });
  assert.equal(missing.status, 404);
  assert.ok((await missing.text()).includes(messages.notFound.title), 'Translated 404');
  checks++;
}
for (const cookie of ['', 'home-budget-locale=invalid']) {
  const html = await (await globalThis.fetch(new URL('/months', base), { headers: { Cookie: cookie } })).text();
  assert.ok(html.includes('<html lang="ru"'), 'Russian fallback');
  checks++;
}
console.log(`HB-005 HTTP: ${checks} checks passed at ${base} (15 locale/routes + 3 localized 404s + 2 fallbacks).`);

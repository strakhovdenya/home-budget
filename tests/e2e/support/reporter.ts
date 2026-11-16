import { writeFileSync } from 'node:fs';
import { stripVTControlCharacters } from 'node:util';
import type { Reporter, TestCase, TestResult, FullResult, TestError } from '@playwright/test/reporter';

function scrub(value: string) {
  let text = value;
  for (const key of ['AUTH_SECRET', 'AUTH_GOOGLE_SECRET', 'HB_E2E_PASSWORD']) {
    const secret = process.env[key]; if (secret) text = text.replaceAll(secret, '[SECRET_REDACTED]');
  }
  return text.replace(/(?:https?|file|postgres(?:ql)?):\/\/[^\s"'<>]+/gi, '[URL_REDACTED]')
    .replace(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_.-]+/g, '[JWT_REDACTED]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[FIXTURE_ID_REDACTED]');
}

export default class SafeReporter implements Reporter {
  private tests: unknown[] = [];
  private errors: string[] = [];
  private serverErrors: string[] = [];
  private stats = { expected: 0, unexpected: 0, skipped: 0, flaky: 0 };
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') this.stats.expected++;
    else if (result.status === 'skipped') this.stats.skipped++;
    else this.stats.unexpected++;
    const errors = result.errors.map(e => ({ message: scrub(e.message ?? ''), stack: scrub(e.stack ?? '') }));
    this.tests.push({ title: test.title, status: result.status, duration: result.duration,
      annotations: test.annotations.map(a => ({ type: a.type, description: scrub(a.description ?? '') })), errors });
    console.log(test.title + ': ' + result.status);
    for (const error of errors) console.log(error.message);
  }
  onError(error: TestError) { const message = scrub(error.message ?? 'B_RUN_FAILED'); this.errors.push(message); console.log(message); }
  onStdErr(chunk: string | Buffer) {
    // Keep only bounded error headings, never query continuations, bodies or env dumps.
    for (const line of chunk.toString().split('\n')) {
      const heading = stripVTControlCharacters(line).match(/(?:^|\s)((?:Error|TypeError|RangeError):.*)$/)?.[1] ?? '';
      if (/^(?:Error|TypeError|RangeError):/.test(heading) && !heading.includes('query:')) {
        this.serverErrors.push(scrub(heading.slice(0, 500)));
      }
    }
  }
  onEnd(result: FullResult) {
    writeFileSync('/work/test-results/b-results.json', JSON.stringify({ schemaVersion: 1, scope: 'offline session proof only',
      status: result.status, stats: this.stats, tests: this.tests, errors: this.errors, serverErrors: this.serverErrors }, null, 2) + '\n');
  }
}

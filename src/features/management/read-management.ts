import type { AuthorizedScope } from '@/domain/updates/contracts';
import type { ManagementReader, HistoryQuery } from '@/domain/management/contracts';
import { normalizeValue } from '@/domain/updates/canonical-value';
import { validUuid } from '@/domain/updates/validation';
import { exactKeys } from '@/domain/checkpoints/validation';

/** Capture before authorization yields. No caller-selected H/K or owner. */
export function createManagement(authorize: (selector: unknown) => Promise<AuthorizedScope>, reader: ManagementReader) {
  async function run<T>(selector: unknown, operation: (scope: AuthorizedScope) => Promise<T>) {
    const captured = typeof selector === 'string' ? selector : null;
    let scope: AuthorizedScope;
    try { scope = await authorize(captured); } catch { return { ok: false as const, code: 'FORBIDDEN' as const }; }
    try { return await operation(scope); } catch { return { ok: false as const, code: 'STORAGE_ERROR' as const }; }
  }
  return {
    list: (selector: unknown) => run(selector, scope => reader.list(scope)),
    history(selector: unknown, input: unknown) {
      let q: unknown; try { q = normalizeValue(input); } catch { q = null; }
      const valid = exactKeys(q, ['kind', 'identityId', 'cursor']) && ['OBLIGATION', 'SAVING'].includes(String(q.kind))
        && validUuid(q.identityId) && (q.cursor === null || typeof q.cursor === 'string' && q.cursor.length <= 2048);
      const captured = valid ? q as HistoryQuery : null;
      return run(selector, scope => captured ? reader.history(scope, captured) : Promise.resolve({ ok: false as const, code: 'INVALID_INPUT' as const }));
    },
    proposeRelease(selector: unknown, input: unknown) {
      const id = validUuid(input) ? input.toLowerCase() : null;
      return run(selector, scope => id ? reader.proposeRelease(scope, id) : Promise.resolve({ ok: false as const, code: 'INVALID_INPUT' as const }));
    },
  };
}

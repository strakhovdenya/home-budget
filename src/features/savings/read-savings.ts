import type { SavingReader } from '@/domain/savings/ports';
import type { AuthorizedScope } from '@/domain/updates/contracts';
import { parseBerlinDate } from '@/shared/pure/calendar';
import { exactKeys } from '@/domain/checkpoints/validation';
import { parseCentsString } from '@/domain/money/money-codec';
import { normalizeValue } from '@/domain/updates/canonical-value';
export function createSavingStateReader(authorize: (selector: unknown) => Promise<AuthorizedScope>, reader: SavingReader) {
  return async (selector: unknown, query: unknown) => {
    let copied: unknown;
    try { copied = normalizeValue(query); } catch { return { ok: false, code: 'INVALID_INPUT' } as const; }
    const accountSelector = typeof selector === 'string' ? selector : null;
    let scope: AuthorizedScope;
    try { scope = await authorize(accountSelector); }
    catch { return { ok: false, code: 'FORBIDDEN' } as const; }
    if (!exactKeys(copied, ['through', 'knowledgeCut'])) return { ok: false, code: 'INVALID_INPUT' } as const;
    const through = parseBerlinDate(copied.through), k = copied.knowledgeCut === null ? null : parseCentsString(copied.knowledgeCut);
    if (!through.ok || (k && !k.ok)) return { ok: false, code: 'INVALID_INPUT' } as const;
    return reader.read(scope, through.value, k?.ok ? k.value : null);
  };
}
